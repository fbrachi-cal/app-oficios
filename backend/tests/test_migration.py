import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from scripts.migrate_confirmadas import migrate_confirmadas

@patch("scripts.migrate_confirmadas.get_firestore")
def test_migration_scenarios_comprehensive(mock_get_firestore):
    mock_db = MagicMock()
    mock_get_firestore.return_value = mock_db
    
    mock_reqs_col = MagicMock()
    mock_ratings_col = MagicMock()
    mock_users_col = MagicMock()
    
    def get_col_ref(col_name):
        if col_name == "solicitudes": return mock_reqs_col
        if col_name == "calificaciones": return mock_ratings_col
        if col_name == "usuarios": return mock_users_col
        return MagicMock()
        
    mock_db.collection.side_effect = get_col_ref
    
    # 1. Setup legacy confirmed requests
    req_no_ratings = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "confirmada",
        "fecha_cambio_estado": "2026-08-01T12:00:00"
    }
    req_one_rating = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_2",
        "estado": "confirmada",
        "fecha_cambio_estado": "2026-08-02T12:00:00"
    }
    req_both_ratings = {
        "solicitante_id": "client_2",
        "profesional_id": "pro_2",
        "estado": "confirmada",
        "fecha_cambio_estado": "2026-08-03T12:00:00"
    }
    
    # Already verificada, calificada, and cancelada requests (should not be touched)
    req_already_verificada = {
        "solicitante_id": "client_2",
        "profesional_id": "pro_1",
        "estado": "verificada",
        "fecha_cambio_estado": "2026-08-04T12:00:00"
    }
    req_already_calificada = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_1",
        "estado": "calificada",
        "fecha_cambio_estado": "2026-08-05T12:00:00"
    }
    req_cancelled = {
        "solicitante_id": "client_1",
        "profesional_id": "pro_2",
        "estado": "cancelada",
        "fecha_cambio_estado": "2026-08-06T12:00:00"
    }
    
    mock_confirmada_stream = []
    for r_id, r_data in [("req_no_ratings", req_no_ratings), 
                         ("req_one_rating", req_one_rating), 
                         ("req_both_ratings", req_both_ratings)]:
        snap = MagicMock()
        snap.id = r_id
        snap.to_dict.return_value = r_data
        mock_confirmada_stream.append(snap)
        
    rating_pro_1 = {
        "solicitud_id": "req_one_rating",
        "calificador_id": "pro_2",
        "calificado_id": "client_1",
        "calificacion": 5
    }
    rating_client_2 = {
        "solicitud_id": "req_both_ratings",
        "calificador_id": "client_2",
        "calificado_id": "pro_2",
        "calificacion": 4
    }
    rating_pro_2 = {
        "solicitud_id": "req_both_ratings",
        "calificador_id": "pro_2",
        "calificado_id": "client_2",
        "calificacion": 5
    }
    
    def get_ratings_stream(field, operator, val):
        snaps = []
        if val == "req_one_rating":
            snap = MagicMock()
            snap.id = "rand_rating_id_1"
            snap.to_dict.return_value = rating_pro_1
            snaps.append(snap)
        elif val == "req_both_ratings":
            snap1 = MagicMock()
            snap1.id = "rand_rating_id_2"
            snap1.to_dict.return_value = rating_client_2
            snaps.append(snap1)
            
            snap2 = MagicMock()
            snap2.id = "rand_rating_id_3"
            snap2.to_dict.return_value = rating_pro_2
            snaps.append(snap2)
        
        mock_query = MagicMock()
        mock_query.stream.side_effect = lambda: iter(snaps)
        return mock_query
        
    mock_ratings_col.where.side_effect = get_ratings_stream
    
    def get_reqs_where(field, operator, val):
        mock_query = MagicMock()
        if field == "estado" and val == "confirmada":
            mock_query.stream.side_effect = lambda: iter(mock_confirmada_stream)
        elif field == "estado" and val == "verificada":
            v_snap = MagicMock()
            v_snap.id = "req_already_verificada"
            v_snap.to_dict.return_value = req_already_verificada
            mock_query.stream.side_effect = lambda: iter([v_snap])
        elif field == "estado" and val == "calificada":
            c_snap = MagicMock()
            c_snap.id = "req_already_calificada"
            c_snap.to_dict.return_value = req_already_calificada
            mock_query.stream.side_effect = lambda: iter([c_snap])
        elif field in ["solicitante_id", "profesional_id"]:
            res_reqs = []
            for r_id, r_data in [("req_no_ratings", req_no_ratings), 
                                 ("req_one_rating", req_one_rating), 
                                 ("req_both_ratings", req_both_ratings),
                                 ("req_already_verificada", req_already_verificada),
                                 ("req_already_calificada", req_already_calificada),
                                 ("req_cancelled", req_cancelled)]:
                if r_data.get(field) == val:
                    snap = MagicMock()
                    snap.id = r_id
                    snap.to_dict.return_value = r_data
                    res_reqs.append(snap)
            mock_query.stream.side_effect = lambda: iter(res_reqs)
        return mock_query
        
    mock_reqs_col.where.side_effect = get_reqs_where
    
    # 2. Setup mock user documents & counter values
    users_db = {
        "client_1": {"cantidadTrabajosVerificados": 0},
        "pro_1": {"cantidadTrabajosVerificados": 0},
        "client_2": {"cantidadTrabajosVerificados": 0},
        "pro_2": {"cantidadTrabajosVerificados": 0}
    }
    
    def get_user_doc(uid):
        mock_doc = MagicMock()
        if uid in users_db:
            mock_doc.exists = True
            mock_doc.to_dict.return_value = users_db[uid]
        else:
            mock_doc.exists = False
        return mock_doc
        
    mock_users_col.document.side_effect = get_user_doc
    
    # 3. Setup mock deterministic lookup checks for ratings (simulate existence of target documents to test collision safety)
    def get_rating_doc(doc_id):
        mock_doc_ref = MagicMock()
        mock_snap = MagicMock()
        if doc_id == "calif_prof_req_one_rating":
            # Rule 2: Equivalent destination -> exists and is semantically identical
            mock_snap.exists = True
            mock_snap.to_dict.return_value = {
                "solicitud_id": "req_one_rating",
                "calificador_id": "pro_2",
                "calificado_id": "client_1",
                "calificacion": 5
            }
        elif doc_id == "calif_client_req_both_ratings":
            # Rule 3: Conflicting destination -> exists but has different score
            mock_snap.exists = True
            mock_snap.to_dict.return_value = {
                "solicitud_id": "req_both_ratings",
                "calificador_id": "client_2",
                "calificado_id": "pro_2",
                "calificacion": 1
            }
        else:
            mock_snap.exists = False
            
        mock_doc_ref.get.return_value = mock_snap
        return mock_doc_ref
        
    mock_ratings_col.document.side_effect = get_rating_doc
    
    # Batch write mocks
    mock_batch = MagicMock()
    mock_db.batch.return_value = mock_batch
    
    # RUN DRY RUN
    stats_dry = migrate_confirmadas(dry_run=True)
    
    # Assertions on transitions
    assert stats_dry["total_requests"] == 3
    assert stats_dry["requests_to_verificada"] == 2  # req_no_ratings and req_one_rating
    assert stats_dry["requests_to_calificada"] == 1  # req_both_ratings
    
    # Collision & Conflict check assertion:
    # - pro of req_one_rating: equivalent destination -> rating is deleted but not written. (normalized stays 0)
    # - client of req_both_ratings: conflicting destination -> not copied, not deleted, 1 conflict recorded.
    # - pro of req_both_ratings: does not exist -> copied and deleted (+1 write)
    assert stats_dry["ratings_normalized"] == 1
    assert stats_dry["rating_conflicts"] == 1
    
    # RUN EXECUTION (must abort since there are conflicts)
    with pytest.raises(Exception) as exc:
        migrate_confirmadas(dry_run=False)
    assert "rating conflicts" in str(exc.value)
