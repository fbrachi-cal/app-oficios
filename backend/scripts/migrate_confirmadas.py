import os
import sys
from datetime import datetime, timezone
from typing import List, Dict, Optional, Set

# Ensure app is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.adapters.firebase.firebase_config import get_firestore
from firebase_admin import firestore

def parse_iso_datetime(val) -> Optional[datetime]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        clean_val = val
        if clean_val.endswith("Z"):
            clean_val = clean_val[:-1] + "+00:00"
        return datetime.fromisoformat(clean_val)
    except Exception:
        return None

def migrate_confirmadas(dry_run: bool = True):
    db = get_firestore()
    print("--------------------------------------------------")
    print(f"STARTING LEGACY LIFECYCLE MIGRATION (DRY RUN = {dry_run})")
    print("--------------------------------------------------")
    
    # 1. Fetch all requests with estado == "confirmada"
    requests_ref = db.collection("solicitudes")
    confirmadas_docs = list(requests_ref.where("estado", "==", "confirmada").stream())
    
    print(f"Found {len(confirmadas_docs)} legacy 'confirmada' requests.")
    
    stats = {
        "total_requests": len(confirmadas_docs),
        "requests_to_verificada": 0,
        "requests_to_calificada": 0,
        "ratings_normalized": 0,
        "users_counters_updated": 0,
        "skipped_requests": 0,
        "skipped_users": 0,
        "rating_conflicts": 0
    }
    
    conflicts = []
    request_updates = []
    rating_writes = []
    rating_deletes = []
    
    # User IDs that are affected and need recalculation
    affected_users: Set[str] = set()
    
    for doc in confirmadas_docs:
        req_id = doc.id
        req = doc.to_dict()
        req["id"] = req_id
        
        client_id = req.get("solicitante_id")
        pro_id = req.get("profesional_id")
        
        if not client_id or not pro_id:
            print(f"[WARNING] Request {req_id} lacks solicitante_id or profesional_id. Skipping.")
            stats["skipped_requests"] += 1
            continue
            
        affected_users.add(client_id)
        affected_users.add(pro_id)
        
        # Query ratings for this request
        ratings_ref = db.collection("calificaciones")
        ratings_docs = list(ratings_ref.where("solicitud_id", "==", req_id).stream())
        
        has_client_rating = False
        has_pro_rating = False
        
        for r_doc in ratings_docs:
            rdata = r_doc.to_dict()
            rdata["id"] = r_doc.id
            
            if rdata.get("deleted_at") is not None:
                continue
                
            calificador_id = rdata.get("calificador_id")
            if calificador_id == client_id:
                has_client_rating = True
                target_id = f"calif_client_{req_id}"
                if r_doc.id != target_id:
                    target_snap = db.collection("calificaciones").document(target_id).get()
                    if target_snap.exists:
                        target_data = target_snap.to_dict()
                        if (target_data.get("solicitud_id") == rdata.get("solicitud_id") and
                            target_data.get("calificador_id") == rdata.get("calificador_id") and
                            target_data.get("calificado_id") == rdata.get("calificado_id") and
                            target_data.get("calificacion") == rdata.get("calificacion")):
                            # Rule 2: Equivalent destination -> Safely delete legacy only
                            rating_deletes.append(r_doc.id)
                        else:
                            # Rule 3: Conflicting destination -> Record conflict, do not copy, do not delete
                            reason = f"Value mismatch: {rdata.get('calificacion')} (legacy) vs {target_data.get('calificacion')} (target)"
                            print(f"[CONFLICT] rating {r_doc.id} vs {target_id}: {reason}")
                            conflicts.append({"legacy_id": r_doc.id, "target_id": target_id, "reason": reason})
                            stats["rating_conflicts"] += 1
                    else:
                        # Rule 1: Destination does not exist -> Copy + delete
                        normalized_data = dict(rdata)
                        normalized_data["id"] = target_id
                        rating_writes.append((target_id, normalized_data))
                        rating_deletes.append(r_doc.id)
                        stats["ratings_normalized"] += 1
            elif calificador_id == pro_id:
                has_pro_rating = True
                target_id = f"calif_prof_{req_id}"
                if r_doc.id != target_id:
                    target_snap = db.collection("calificaciones").document(target_id).get()
                    if target_snap.exists:
                        target_data = target_snap.to_dict()
                        if (target_data.get("solicitud_id") == rdata.get("solicitud_id") and
                            target_data.get("calificador_id") == rdata.get("calificador_id") and
                            target_data.get("calificado_id") == rdata.get("calificado_id") and
                            target_data.get("calificacion") == rdata.get("calificacion")):
                            # Rule 2: Equivalent destination -> Safely delete legacy only
                            rating_deletes.append(r_doc.id)
                        else:
                            # Rule 3: Conflicting destination -> Record conflict, do not copy, do not delete
                            reason = f"Value mismatch: {rdata.get('calificacion')} (legacy) vs {target_data.get('calificacion')} (target)"
                            print(f"[CONFLICT] rating {r_doc.id} vs {target_id}: {reason}")
                            conflicts.append({"legacy_id": r_doc.id, "target_id": target_id, "reason": reason})
                            stats["rating_conflicts"] += 1
                    else:
                        # Rule 1: Destination does not exist -> Copy + delete
                        normalized_data = dict(rdata)
                        normalized_data["id"] = target_id
                        rating_writes.append((target_id, normalized_data))
                        rating_deletes.append(r_doc.id)
                        stats["ratings_normalized"] += 1
                    
        target_state = "calificada" if (has_client_rating and has_pro_rating) else "verificada"
        
        if target_state == "calificada":
            stats["requests_to_calificada"] += 1
        else:
            stats["requests_to_verificada"] += 1
            
        best_timestamp = req.get("fecha_cambio_estado") or req.get("fecha_creacion")
        if not best_timestamp:
            best_timestamp = datetime.now(timezone.utc)
            
        request_updates.append((req_id, {
            "estado": target_state,
            "verificado_por": None,
            "verificado_at": best_timestamp,
            "fecha_cambio_estado": best_timestamp
        }))
        
    print(f"Target state plan: {stats['requests_to_verificada']} to verificada, {stats['requests_to_calificada']} to calificada.")
    print(f"Ratings normalization plan: {stats['ratings_normalized']} ratings will be migrated to deterministic document IDs.")
    
    # 2. Add users who currently participate in any existing verificada / calificada request
    print("Scanning existing 'verificada' and 'calificada' requests to identify affected users...")
    existing_verificadas = list(requests_ref.where("estado", "==", "verificada").stream())
    existing_calificadas = list(requests_ref.where("estado", "==", "calificada").stream())
    
    for doc in existing_verificadas + existing_calificadas:
        req = doc.to_dict()
        cid = req.get("solicitante_id")
        pid = req.get("profesional_id")
        if cid: affected_users.add(cid)
        if pid: affected_users.add(pid)
        
    print(f"Total unique users to evaluate: {len(affected_users)}.")
    
    # 3. Rebuild counter for each user
    user_updates = []
    
    for user_id in affected_users:
        user_snap = db.collection("usuarios").document(user_id).get()
        if not user_snap.exists:
            print(f"[WARNING] User {user_id} does not exist in 'usuarios' collection. Skipping counter update.")
            stats["skipped_users"] += 1
            continue
            
        client_reqs = list(requests_ref.where("solicitante_id", "==", user_id).stream())
        pro_reqs = list(requests_ref.where("profesional_id", "==", user_id).stream())
        
        verified_count = 0
        
        for r_doc in client_reqs + pro_reqs:
            req_data = r_doc.to_dict()
            req_id = r_doc.id
            state = req_data.get("estado")
            
            target_info = next((u for u in request_updates if u[0] == req_id), None)
            if target_info:
                state = target_info[1]["estado"]
                
            if state in ["verificada", "calificada"]:
                verified_count += 1
                
        user_data = user_snap.to_dict()
        current_counter = user_data.get("cantidadTrabajosVerificados")
        
        if current_counter != verified_count:
            user_updates.append((user_id, {"cantidadTrabajosVerificados": verified_count}))
            stats["users_counters_updated"] += 1
            
    print(f"Counter recalculation plan: {stats['users_counters_updated']} users require 'cantidadTrabajosVerificados' updates.")
    
    # 4. Perform Batched Writes if NOT dry_run
    if dry_run:
        print("\n[DRY RUN SUMMARY] No changes were written to Firestore.")
        print(f"Total requests to update: {len(request_updates)}")
        print(f"Total ratings to copy/normalize: {len(rating_writes)}")
        print(f"Total ratings to delete: {len(rating_deletes)}")
        print(f"Total user counter updates: {len(user_updates)}")
        print(f"Total rating conflicts detected: {stats['rating_conflicts']}")
        print("--------------------------------------------------")
        return stats
        
    if len(conflicts) > 0:
        raise Exception(f"Migration aborted due to {len(conflicts)} rating conflicts. Please resolve them manually.")
        
    print("\nExecuting batched writes to Firestore...")
    
    batch = db.batch()
    batch_op_count = 0
    
    def commit_batch():
        nonlocal batch, batch_op_count
        if batch_op_count > 0:
            batch.commit()
            print(f"Committed batch of {batch_op_count} operations.")
            batch = db.batch()
            batch_op_count = 0
            
    for target_id, data in rating_writes:
        ref = db.collection("calificaciones").document(target_id)
        batch.set(ref, data)
        batch_op_count += 1
        if batch_op_count >= 400:
            commit_batch()
            
    for legacy_id in rating_deletes:
        ref = db.collection("calificaciones").document(legacy_id)
        batch.delete(ref)
        batch_op_count += 1
        if batch_op_count >= 400:
            commit_batch()
            
    for req_id, fields in request_updates:
        ref = db.collection("solicitudes").document(req_id)
        batch.update(ref, fields)
        batch_op_count += 1
        if batch_op_count >= 400:
            commit_batch()
            
    for user_id, fields in user_updates:
        ref = db.collection("usuarios").document(user_id)
        batch.update(ref, fields)
        batch_op_count += 1
        if batch_op_count >= 400:
            commit_batch()
            
    commit_batch()
    print("Migration finished successfully.")
    print("--------------------------------------------------")
    return stats

if __name__ == "__main__":
    dry_run_mode = True
    if len(sys.argv) > 1 and sys.argv[1].lower() == "--execute":
        dry_run_mode = False
    migrate_confirmadas(dry_run=dry_run_mode)
