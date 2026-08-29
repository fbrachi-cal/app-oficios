import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, call, patch
from app.domain.services.request_service import RequestService

@pytest.fixture
def mock_repo():
    return MagicMock()

@pytest.fixture
def service(mock_repo):
    return RequestService(mock_repo)

def test_trigger_messages_count(service, mock_repo):
    # 4 vs 5 real participant messages trigger check
    now = datetime.now(timezone.utc)
    
    solicitud = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "aceptada",
        "fecha_creacion": now - timedelta(hours=1),
        "historial_consultas": []
    }
    
    # 0 messages -> False (hours < 48)
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is False
    
    # Add 4 real messages
    for i in range(4):
        solicitud["historial_consultas"].append({
            "mensaje": f"msg {i}",
            "usuario_id": "client_1" if i % 2 == 0 else "pro_1",
            "fecha": now - timedelta(minutes=10 * (4 - i))
        })
        
    # 4 messages -> False
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is False
    
    # Add 5th real message
    solicitud["historial_consultas"].append({
        "mensaje": "msg 5",
        "usuario_id": "client_1",
        "fecha": now - timedelta(minutes=1)
    })
    
    # 5 messages (> 4) -> True
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is True
    assert service.calcular_eligibilidad_verificacion(solicitud, "pro_1") is True

def test_trigger_inactivity_baseline_and_threshold(service, mock_repo):
    # 2 days inactivity since last real message or creation
    now = datetime.now(timezone.utc)
    
    # Baseline: request creation time (0 messages)
    solicitud = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "creada",
        "fecha_creacion": now - timedelta(days=1, hours=23), # < 2 days
        "historial_consultas": []
    }
    
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is False
    
    # Change creation time to 2+ days ago
    solicitud["fecha_creacion"] = now - timedelta(days=2)
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is True
    
    # Baseline with messages: last message date
    solicitud["fecha_creacion"] = now - timedelta(days=10) # request is old
    solicitud["historial_consultas"] = [
        {
            "mensaje": "msg 1",
            "usuario_id": "client_1",
            "fecha": now - timedelta(days=1, hours=23) # last message < 2 days ago
        }
    ]
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is False
    
    # Last message date is 2+ days ago
    solicitud["historial_consultas"][0]["fecha"] = now - timedelta(days=2)
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is True

def test_exclude_admin_and_system_messages(service, mock_repo):
    now = datetime.now(timezone.utc)
    solicitud = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "consulta",
        "fecha_creacion": now - timedelta(hours=1),
        "historial_consultas": []
    }
    
    # Add 5 admin messages
    for i in range(5):
        solicitud["historial_consultas"].append({
            "mensaje": f"admin {i}",
            "usuario_id": "admin",
            "tipo": "admin",
            "fecha": now - timedelta(minutes=10 * (5 - i))
        })
        
    # Admin messages do not count as real interactions -> False
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is False

def test_no_suppression_and_re_enablement(service, mock_repo):
    now = datetime.now(timezone.utc)
    
    # Start with 5 messages so the interactions trigger (> 4) is met
    historial = []
    for i in range(5):
        historial.append({
            "mensaje": f"msg {i}",
            "usuario_id": "client_1" if i % 2 == 0 else "pro_1",
            "fecha": now - timedelta(minutes=100 - i * 10) # messages from 100m to 60m ago
        })

    solicitud = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "aceptada",
        "fecha_creacion": now - timedelta(days=5),
        "historial_consultas": historial,
        "no_prompt_client_at": now - timedelta(minutes=45) # Client clicked NO 45 mins ago
    }
    
    # Interactions trigger is met (5 messages)
    # But client answered NO recently (45 mins ago) -> False for client
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is False
    # Professional has NOT answered NO -> True for professional
    assert service.calcular_eligibilidad_verificacion(solicitud, "pro_1") is True
    
    # Re-enable scenario A: new real message after client's "No"
    solicitud["historial_consultas"].append({
        "mensaje": "new message",
        "usuario_id": "pro_1",
        "fecha": now - timedelta(minutes=15) # after no_prompt_client_at (45m ago)
    })
    # Re-enabled due to new message -> True for client
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is True
    
    # Re-enable scenario B: 2+ days pass after suppression point
    solicitud["historial_consultas"] = [] # Clear messages, use creation date 5 days ago
    solicitud["no_prompt_client_at"] = now - timedelta(days=2) # suppressed 2 days ago
    
    # Re-enabled due to passage of time -> True for client
    assert service.calcular_eligibilidad_verificacion(solicitud, "client_1") is True

def test_non_participant_rejection(service, mock_repo):
    now = datetime.now(timezone.utc)
    solicitud = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "aceptada",
        "fecha_creacion": now - timedelta(days=5),
        "historial_consultas": []
    }
    
    # Non-participant is NOT eligible for verification check
    assert service.calcular_eligibilidad_verificacion(solicitud, "other_user") is False
    
    # Non-participant trying to verify raises exception
    mock_repo.get_by_id.return_value = solicitud
    with pytest.raises(Exception) as exc:
        service.responder_verificacion("req_123", "other_user", "si")
    assert "No tenés permiso" in str(exc.value)

def test_cancellation_and_modification_validations(service, mock_repo):
    # Professional can cancel active requests
    mock_repo.get_by_id.return_value = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "aceptada"
    }
    service.cambiar_estado("req_123", "pro_1", "cancelada")
    assert mock_repo.actualizar_con_historial.called
    
    # Verified request cannot be cancelled
    mock_repo.get_by_id.return_value = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "verificada"
    }
    with pytest.raises(Exception) as exc:
        service.cambiar_estado("req_123", "client_1", "cancelada")
    assert "No se puede cancelar" in str(exc.value)
    
    # Rated request cannot be modified
    mock_repo.get_by_id.return_value = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "calificada"
    }
    with pytest.raises(Exception) as exc:
        service.cambiar_estado("req_123", "client_1", "aceptada")
    assert "No se puede modificar" in str(exc.value)

def test_responder_verificacion_no(service, mock_repo):
    mock_repo.get_by_id.return_value = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "aceptada"
    }
    
    res = service.responder_verificacion("req_123", "client_1", "no")
    assert res["ofrecer_calificacion"] is False
    assert mock_repo.actualizar.called
    
    # Check that client suppression timestamp is set
    args, kwargs = mock_repo.actualizar.call_args
    assert args[0] == "req_123"
    assert "no_prompt_client_at" in args[1]
    assert isinstance(args[1]["no_prompt_client_at"], datetime)

@patch("firebase_admin.firestore.client")
@patch("firebase_admin.firestore.transactional", lambda f: f)
def test_responder_verificacion_si_transaccional_idempotency_and_missing_profiles(mock_client_fn):
    from app.adapters.firebase.firebase_request_repo import FirebaseRequestRepository
    
    mock_db = MagicMock()
    mock_client_fn.return_value = mock_db
    
    repo = FirebaseRequestRepository()
    mock_txn = MagicMock()
    mock_db.transaction.return_value = mock_txn
    
    mock_solicitud_ref = MagicMock()
    mock_client_ref = MagicMock()
    mock_pro_ref = MagicMock()
    
    repo.collection = MagicMock()
    repo.collection.document.return_value = mock_solicitud_ref
    
    mock_users_col = MagicMock()
    mock_db.collection.return_value = mock_users_col
    def get_user_ref(uid):
        if uid == "client_1":
            return mock_client_ref
        elif uid == "pro_1":
            return mock_pro_ref
        return MagicMock()
    mock_users_col.document.side_effect = get_user_ref

    mock_snap_request = MagicMock()
    mock_snap_request.exists = True
    mock_snap_request.id = "req_123"
    mock_snap_request.to_dict.return_value = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "aceptada"
    }
    
    mock_snap_client = MagicMock()
    mock_snap_client.exists = True
    mock_snap_client.to_dict.return_value = {} 
    
    mock_snap_pro = MagicMock()
    mock_snap_pro.exists = False 
    
    mock_solicitud_ref.get.return_value = mock_snap_request
    mock_client_ref.get.return_value = mock_snap_client
    mock_pro_ref.get.return_value = mock_snap_pro
    
    res = repo.responder_verificacion_si_transaccional("req_123", "client_1")
    
    assert res["ofrecer_calificacion"] is True
    assert res["already_done"] is False
    
    mock_txn.update.assert_any_call(mock_client_ref, {"cantidadTrabajosVerificados": 1})
    mock_txn.set.assert_any_call(mock_pro_ref, {"cantidadTrabajosVerificados": 1}, merge=True)
    
    # Retry Scenario
    mock_txn.reset_mock()
    mock_snap_request.to_dict.return_value = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "verificada"
    }
    
    res_retry = repo.responder_verificacion_si_transaccional("req_123", "client_1")
    assert res_retry["ofrecer_calificacion"] is True
    assert res_retry["already_done"] is True
    
    mock_txn.update.assert_not_called()
    mock_txn.set.assert_not_called()

@patch("firebase_admin.firestore.client")
@patch("firebase_admin.firestore.transactional", lambda f: f)
def test_rating_lifecycle_transactional_rules(mock_client_fn):
    from app.adapters.firebase.firebase_rating_repo import FirebaseRatingRepository
    
    mock_db = MagicMock()
    mock_client_fn.return_value = mock_db
    
    repo = FirebaseRatingRepository()
    mock_txn = MagicMock()
    mock_db.transaction.return_value = mock_txn
    
    mock_solicitud_ref = MagicMock()
    mock_client_rating_ref = MagicMock()
    mock_pro_rating_ref = MagicMock()
    mock_calificado_user_ref = MagicMock()
    
    repo.collection = MagicMock()
    def get_rating_ref(doc_id=""):
        if doc_id == "calif_client_req_123":
            return mock_client_rating_ref
        elif doc_id == "calif_prof_req_123":
            return mock_pro_rating_ref
        return MagicMock()
    repo.collection.document.side_effect = get_rating_ref
    
    mock_solic_col = MagicMock()
    mock_solic_col.document.return_value = mock_solicitud_ref
    mock_users_col = MagicMock()
    mock_users_col.document.return_value = mock_calificado_user_ref
    
    def get_col_ref(col_name):
        if col_name == "solicitudes":
            return mock_solic_col
        elif col_name == "usuarios":
            return mock_users_col
        return MagicMock()
    mock_db.collection.side_effect = get_col_ref
    
    mock_snap_sol = MagicMock()
    mock_snap_sol.exists = True
    mock_snap_sol.id = "req_123"
    mock_snap_sol.to_dict.return_value = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "aceptada"  
    }
    mock_solicitud_ref.get.return_value = mock_snap_sol
    
    with pytest.raises(Exception) as exc:
        repo.crear_calificacion_y_actualizar_estado_transaccional("req_123", "client_1", 5, "Good")
    assert "Solo se pueden calificar solicitudes verificadas" in str(exc.value)

    mock_snap_sol.to_dict.return_value = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "cancelada"
    }
    with pytest.raises(Exception) as exc:
        repo.crear_calificacion_y_actualizar_estado_transaccional("req_123", "client_1", 5, "Good")
    assert "Solo se pueden calificar solicitudes verificadas" in str(exc.value)

    mock_snap_sol.to_dict.return_value = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "confirmada"
    }
    with pytest.raises(Exception) as exc:
        repo.crear_calificacion_y_actualizar_estado_transaccional("req_123", "client_1", 5, "Good")
    assert "Solo se pueden calificar solicitudes verificadas" in str(exc.value)

    mock_snap_sol.to_dict.return_value = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "verificada"
    }
    with pytest.raises(Exception) as exc:
        repo.crear_calificacion_y_actualizar_estado_transaccional("req_123", "non_participant", 5, "Good")
    assert "No tenés permiso" in str(exc.value)

    mock_snap_client_rating = MagicMock()
    mock_snap_client_rating.exists = False
    mock_snap_pro_rating = MagicMock()
    mock_snap_pro_rating.exists = False
    
    mock_client_rating_ref.get.return_value = mock_snap_client_rating
    mock_pro_rating_ref.get.return_value = mock_snap_pro_rating
    
    mock_snap_calificado = MagicMock()
    mock_snap_calificado.exists = True
    mock_snap_calificado.to_dict.return_value = {
        "promedioCalificacion": 4.0,
        "cantidadCalificaciones": 2,
        "totalScore": 8.0,
        "cantidadTrabajosVerificados": 3
    }
    mock_calificado_user_ref.get.return_value = mock_snap_calificado

    res = repo.crear_calificacion_y_actualizar_estado_transaccional("req_123", "client_1", 5, "Good")
    assert res["solicitud"]["estado"] == "verificada"
    
    mock_txn.update.assert_any_call(mock_calificado_user_ref, {
        "promedioCalificacion": 13.0 / 3.0,
        "cantidadCalificaciones": 3,
        "totalScore": 13.0
    })
    
    called_args = mock_txn.set.call_args[0]
    assert called_args[0] == mock_client_rating_ref
    assert called_args[1]["solicitud_id"] == "req_123"
    assert called_args[1]["calificador_id"] == "client_1"
    assert called_args[1]["calificado_id"] == "pro_1"
    assert called_args[1]["calificacion"] == 5
    assert called_args[1]["observacion"] == "Good"
    assert isinstance(called_args[1]["fecha"], str)
    
    for call_args in mock_txn.update.call_args_list:
        if call_args[0][0] == mock_calificado_user_ref:
            assert "cantidadTrabajosVerificados" not in call_args[0][1]

    mock_txn.reset_mock()
    mock_snap_client_rating.exists = True
    mock_snap_pro_rating.exists = False
    
    res2 = repo.crear_calificacion_y_actualizar_estado_transaccional("req_123", "pro_1", 4, "Good job")
    assert res2["solicitud"]["estado"] == "calificada"
    
    called_solicitud_update = None
    for call_args in mock_txn.update.call_args_list:
        if call_args[0][0] == mock_solicitud_ref:
            called_solicitud_update = call_args[0][1]
            break
            
    assert called_solicitud_update is not None
    assert called_solicitud_update["estado"] == "calificada"
    
    mock_snap_client_rating.exists = True
    with pytest.raises(Exception) as exc:
        repo.crear_calificacion_y_actualizar_estado_transaccional("req_123", "client_1", 5, "Good")
    assert "Ya calificaste esta solicitud" in str(exc.value)

@pytest.mark.anyio
async def test_requests_endpoints_enrichment():
    from app.api.routes.requests import listar_mis_solicitudes, obtener_solicitud_por_id
    
    mock_user_repo = MagicMock()
    mock_req_repo = MagicMock()
    mock_rating_repo = MagicMock()
    
    mock_user_repo.get_user_by_id.return_value = {"id": "client_1", "tipo": "cliente"}
    
    mock_req = {
        "id": "req_123",
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "verificada",
        "fecha_creacion": datetime.now(timezone.utc)
    }
    
    mock_req_repo.listar_por_solicitante.return_value = [mock_req]
    mock_req_repo.get_by_id.return_value = mock_req
    
    mock_rating_repo.obtener_calificaciones_por_solicitudes.return_value = [
        {"solicitud_id": "req_123", "calificador_id": "client_1"}
    ]
    mock_rating_repo.obtener_calificacion_por_solicitud_y_usuario.side_effect = lambda sid, uid: (
        {"id": "r1"} if uid == "client_1" else None
    )
    
    res_list = await listar_mis_solicitudes(
        user_id="client_1",
        user_repo=mock_user_repo,
        request_repo=mock_req_repo,
        rating_repo=mock_rating_repo
    )
    
    assert len(res_list) == 1
    assert res_list[0]["califico_cliente"] is True
    assert res_list[0]["califico_profesional"] is False
    
    res_single = await obtener_solicitud_por_id(
        id="req_123",
        user_id="client_1",
        request_repo=mock_req_repo,
        rating_repo=mock_rating_repo
    )
    
    assert res_single["califico_cliente"] is True
    assert res_single["califico_profesional"] is False
