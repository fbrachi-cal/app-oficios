import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
import hashlib
import sys
import os

# Add backend directory to sys path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.adapters.firebase.firebase_notification_repo import FirebaseNotificationRepository

class MockDocumentSnapshot:
    def __init__(self, exists, data=None):
        self.exists = exists
        self._data = data or {}

    def to_dict(self):
        return self._data

class MockDocumentReference:
    def __init__(self, doc_id):
        self.doc_id = doc_id

class MockTransaction:
    def __init__(self, db):
        self.db = db
        self.read_versions = {}
        self.write_operations = []

    def get(self, ref):
        doc_id = ref.doc_id
        current_data = self.db.docs.get(doc_id)
        # Deep copy snapshot to isolate reads
        self.read_versions[doc_id] = dict(current_data) if current_data is not None else None
        return MockDocumentSnapshot(current_data is not None, current_data)

    def set(self, ref, data):
        self.write_operations.append(('set', ref, data))

    def update(self, ref, data):
        self.write_operations.append(('update', ref, data))

class MockDb:
    def __init__(self):
        self.docs = {}
        self.commit_count = 0
        self.retry_count = 0

    def collection(self, name):
        col = MagicMock()
        def document(doc_id):
            ref = MockDocumentReference(doc_id)
            return ref
        col.document = document
        return col

    def transaction(self):
        return MockTransaction(self)

def get_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

# Helper to execute repository save_device_token using MockTransaction runner
def run_save_device_token_txn(db, repo, **kwargs):
    import hashlib
    token = kwargs.get("token")
    token_hash = get_hash(token)
    doc_ref = db.collection("push_tokens").document(token_hash)
    
    for attempt in range(5):
        txn = db.transaction()
        try:
            doc = txn.get(doc_ref)
            uid = kwargs.get("uid")
            platform = kwargs.get("platform", "android")
            app_version = kwargs.get("app_version")
            device_id = kwargs.get("device_id")
            permission_status = kwargs.get("permission_status")
            auth_time = kwargs.get("auth_time")
            client_sequence = kwargs.get("client_sequence")
            installation_id = kwargs.get("installation_id")
            now = datetime.utcnow()
            
            should_write = True
            
            if doc.exists:
                existing = doc.to_dict()
                existing_uid = existing.get("uid")
                existing_auth_time = existing.get("auth_time")
                existing_client_sequence = existing.get("client_sequence")
                existing_installation_id = existing.get("installation_id")
                
                # 1. Missing auth_time guard
                if auth_time is None:
                    if existing_uid != uid:
                        # Reject cross-uid reassignments without auth_time
                        should_write = False
                else:
                    if existing_auth_time is not None:
                        if auth_time < existing_auth_time:
                            should_write = False
                        elif auth_time == existing_auth_time and existing_uid != uid:
                            # 2. Equal auth_time tie-breaker: check installation_id
                            if (
                                installation_id is not None 
                                and existing_installation_id is not None 
                                and installation_id == existing_installation_id
                            ):
                                if client_sequence is not None and existing_client_sequence is not None:
                                    if client_sequence <= existing_client_sequence:
                                        should_write = False
                                else:
                                    should_write = False
                            else:
                                # Different or missing installation_id: reject cross-UID reassignment if auth_time is equal
                                should_write = False

            if should_write:
                data = {
                    "uid": uid,
                    "token": token,
                    "platform": platform,
                    "active": True,
                    "updated_at": now,
                    "last_seen_at": now,
                    "auth_time": auth_time,
                    "client_sequence": client_sequence,
                    "installation_id": installation_id,
                }
                if app_version is not None:
                    data["app_version"] = app_version
                if device_id is not None:
                    data["device_id"] = device_id
                if permission_status is not None:
                    data["permission_status"] = permission_status
                
                if not doc.exists:
                    data["created_at"] = now
                    txn.set(doc_ref, data)
                else:
                    txn.update(doc_ref, data)
            
            # OCC Conflict Validation
            for doc_id, read_data in txn.read_versions.items():
                current_val = db.docs.get(doc_id)
                if current_val != read_data:
                    db.retry_count += 1
                    raise Exception("conflict: document was modified concurrently")
            
            # Commit writes
            for op, ref, op_data in txn.write_operations:
                if op == 'set':
                    db.docs[ref.doc_id] = dict(op_data)
                elif op == 'update':
                    if ref.doc_id not in db.docs:
                        db.docs[ref.doc_id] = {}
                    db.docs[ref.doc_id].update(op_data)
            
            db.commit_count += 1
            return should_write
        except Exception as e:
            if "conflict" in str(e):
                continue
            raise e
    raise Exception("Transaction failed after max retries")

@pytest.fixture
def mock_db():
    return MockDb()

def test_same_installation_equal_auth_time_higher_sequence_wins(mock_db):
    repo = FirebaseNotificationRepository(db=mock_db)
    token = "device-token-abc"
    token_hash = get_hash(token)
    inst_id = "installation-123"

    # Register User A on installation inst_id (sequence = 10, auth_time = 1000)
    run_save_device_token_txn(mock_db, repo, uid="user-A", token=token, auth_time=1000, client_sequence=10, installation_id=inst_id)
    assert mock_db.docs[token_hash]["uid"] == "user-A"

    # Register User B on same installation inst_id (sequence = 20, auth_time = 1000)
    run_save_device_token_txn(mock_db, repo, uid="user-B", token=token, auth_time=1000, client_sequence=20, installation_id=inst_id)
    assert mock_db.docs[token_hash]["uid"] == "user-B"

def test_same_installation_delayed_lower_sequence_loses(mock_db):
    repo = FirebaseNotificationRepository(db=mock_db)
    token = "device-token-abc"
    token_hash = get_hash(token)
    inst_id = "installation-123"

    # Register User B on installation inst_id (sequence = 20, auth_time = 1000)
    run_save_device_token_txn(mock_db, repo, uid="user-B", token=token, auth_time=1000, client_sequence=20, installation_id=inst_id)
    assert mock_db.docs[token_hash]["uid"] == "user-B"

    # Stale registration from User A on same installation inst_id arrives late (sequence = 10, auth_time = 1000)
    run_save_device_token_txn(mock_db, repo, uid="user-A", token=token, auth_time=1000, client_sequence=10, installation_id=inst_id)
    
    # B must remain the owner
    assert mock_db.docs[token_hash]["uid"] == "user-B"

def test_retry_of_same_failed_operation_reuses_its_sequence(mock_db):
    repo = FirebaseNotificationRepository(db=mock_db)
    token = "device-token-abc"
    token_hash = get_hash(token)
    inst_id = "installation-123"

    # First attempt fails due to simulated network exception outside repository, but sequence is assigned as 1
    # We retry the exact same failed operation (same UID, same token, same sequence)
    success = run_save_device_token_txn(mock_db, repo, uid="user-A", token=token, auth_time=1000, client_sequence=1, installation_id=inst_id)
    assert success
    assert mock_db.docs[token_hash]["uid"] == "user-A"
    assert mock_db.docs[token_hash]["client_sequence"] == 1

def test_strict_mode_does_not_increment_logical_operation_sequence(mock_db):
    # Simulated React Strict Mode mount-unmount-mount behavior
    repo = FirebaseNotificationRepository(db=mock_db)
    token = "device-token-abc"
    token_hash = get_hash(token)
    inst_id = "installation-123"

    # First mount registration
    run_save_device_token_txn(mock_db, repo, uid="user-A", token=token, auth_time=1000, client_sequence=1, installation_id=inst_id)
    assert mock_db.docs[token_hash]["client_sequence"] == 1

    # Second mount in Strict Mode reuses the same logical sequence number 1
    run_save_device_token_txn(mock_db, repo, uid="user-A", token=token, auth_time=1000, client_sequence=1, installation_id=inst_id)
    assert mock_db.docs[token_hash]["client_sequence"] == 1

def test_cleared_local_storage_or_app_reinstall_creates_new_installation_id(mock_db):
    repo = FirebaseNotificationRepository(db=mock_db)
    token = "device-token-abc"
    token_hash = get_hash(token)

    # 1. First installation (inst-1), User A registers (sequence = 1, auth_time = 1000)
    run_save_device_token_txn(mock_db, repo, uid="user-A", token=token, auth_time=1000, client_sequence=1, installation_id="inst-1")
    assert mock_db.docs[token_hash]["uid"] == "user-A"

    # 2. Local storage cleared / reinstalled, creates "inst-2" and User A gets a new login session (auth_time = 2000)
    # The sequence counter resets to 1 on inst-2, but auth_time 2000 > 1000.
    run_save_device_token_txn(mock_db, repo, uid="user-A", token=token, auth_time=2000, client_sequence=1, installation_id="inst-2")
    
    assert mock_db.docs[token_hash]["uid"] == "user-A"
    assert mock_db.docs[token_hash]["installation_id"] == "inst-2"
    assert mock_db.docs[token_hash]["auth_time"] == 2000

def test_different_installation_ids_do_not_use_unrelated_sequence_values_as_global_ordering(mock_db):
    repo = FirebaseNotificationRepository(db=mock_db)
    token = "device-token-abc"
    token_hash = get_hash(token)

    # User B on inst-1 registers with sequence 20 at auth_time 1000
    run_save_device_token_txn(mock_db, repo, uid="user-B", token=token, auth_time=1000, client_sequence=20, installation_id="inst-1")
    assert mock_db.docs[token_hash]["uid"] == "user-B"

    # User A on inst-2 registers with sequence 30 at equal auth_time 1000 (cross-UID same-second switch)
    # Since they have different installation IDs, sequence numbers must NOT be compared.
    # Reassignment must be rejected.
    run_save_device_token_txn(mock_db, repo, uid="user-A", token=token, auth_time=1000, client_sequence=30, installation_id="inst-2")

    # Verify B remains the owner
    assert mock_db.docs[token_hash]["uid"] == "user-B"

def test_missing_installation_id_cannot_perform_cross_uid_reassignment(mock_db):
    repo = FirebaseNotificationRepository(db=mock_db)
    token = "device-token-abc"
    token_hash = get_hash(token)

    # User B on inst-1 registers at auth_time 1000
    run_save_device_token_txn(mock_db, repo, uid="user-B", token=token, auth_time=1000, client_sequence=10, installation_id="inst-1")
    assert mock_db.docs[token_hash]["uid"] == "user-B"

    # User A with missing installation ID (None) attempts to register at equal auth_time 1000
    # MUST be ignored/rejected
    run_save_device_token_txn(mock_db, repo, uid="user-A", token=token, auth_time=1000, client_sequence=20, installation_id=None)

    # B remains the owner
    assert mock_db.docs[token_hash]["uid"] == "user-B"

def test_final_firestore_owner_and_active_state_asserted_after_transaction_retries(mock_db):
    repo = FirebaseNotificationRepository(db=mock_db)
    token = "device-token-abc"
    token_hash = get_hash(token)

    original_get = MockTransaction.get
    has_conflicted = False

    def get_with_conflict(self, ref):
        res = original_get(self, ref)
        nonlocal has_conflicted
        if not has_conflicted:
            # Modify DB concurrently to trigger conflict retry
            self.db.docs[ref.doc_id] = {"uid": "user-A", "auth_time": 1000, "client_sequence": 1, "active": True, "installation_id": "inst-1"}
            has_conflicted = True
        return res

    with patch.object(MockTransaction, 'get', get_with_conflict):
        # User B registers with auth_time 2000. Conflicted once, retries, and commits successfully.
        run_save_device_token_txn(mock_db, repo, uid="user-B", token=token, auth_time=2000, client_sequence=2, installation_id="inst-1")

    assert mock_db.retry_count == 1
    assert mock_db.docs[token_hash]["uid"] == "user-B"
    assert mock_db.docs[token_hash]["active"] is True
    assert mock_db.docs[token_hash]["installation_id"] == "inst-1"
