import os
import sys
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from app.adapters.firebase.firebase_config import get_firestore, init_firebase
from app.adapters.firebase.firebase_request_repo import FirebaseRequestRepository
from app.adapters.firebase.firebase_rating_repo import FirebaseRatingRepository
from app.domain.services.request_service import RequestService

def trace_all_active_requests():
    print("=== Tracing All Active Requests in Live Firestore ===")
    init_firebase()
    req_repo = FirebaseRequestRepository()
    rating_repo = FirebaseRatingRepository()
    service = RequestService(req_repo)
    
    requests = req_repo.get_all_requests()
    active_requests = [r for r in requests if r.get("estado") != "cancelada"]
    
    print(f"Total Active Requests (non-cancelled): {len(active_requests)}")
    
    for s in active_requests:
        req_id = s.get("id")
        estado = s.get("estado")
        client_id = s.get("solicitante_id")
        pro_id = s.get("profesional_id")
        consultas = s.get("historial_consultas", [])
        
        real_msgs = [
            m for m in consultas 
            if m.get("usuario_id") in [client_id, pro_id] 
            and m.get("tipo") != "admin" 
            and m.get("rol") != "admin"
        ]
        
        # Ratings in DB
        calif_client = rating_repo.obtener_calificacion_por_solicitud_y_usuario(req_id, client_id) is not None
        calif_pro = rating_repo.obtener_calificacion_por_solicitud_y_usuario(req_id, pro_id) is not None
        
        confirmo_client = bool(s.get("confirmo_realizacion_cliente") or (s.get("verificado_por") == client_id))
        confirmo_pro = bool(s.get("confirmo_realizacion_profesional") or (s.get("verificado_por") == pro_id))
        
        # Simulating exact endpoint calculation for Client
        s_client_copy = dict(s)
        s_client_copy["confirmo_realizacion_cliente"] = confirmo_client
        s_client_copy["confirmo_realizacion_profesional"] = confirmo_pro
        s_client_copy["califico_cliente"] = calif_client
        s_client_copy["califico_profesional"] = calif_pro
        prompt_client = service.calcular_eligibilidad_verificacion(s_client_copy, client_id)
        
        # Simulating exact endpoint calculation for Professional
        prompt_pro = service.calcular_eligibilidad_verificacion(s_client_copy, pro_id)
        
        print("\n==================================================")
        print(f"REQUEST ID: {req_id}")
        print(f"  Estado: {estado}")
        print(f"  Client ID (solicitante_id): {client_id}")
        print(f"  Pro ID (profesional_id): {pro_id}")
        print(f"  Total Messages: {len(consultas)} | Participant Messages: {len(real_msgs)}")
        print(f"  Fecha Creacion: {s.get('fecha_creacion')}")
        print(f"  Last Msg Fecha: {real_msgs[-1].get('fecha') if real_msgs else 'None'}")
        print(f"  verificado_por: {s.get('verificado_por')}")
        print(f"  confirmo_realizacion_cliente: {confirmo_client}")
        print(f"  confirmo_realizacion_profesional: {confirmo_pro}")
        print(f"  califico_cliente: {calif_client}")
        print(f"  califico_profesional: {calif_pro}")
        print(f"  no_prompt_client_at: {s.get('no_prompt_client_at')}")
        print(f"  no_prompt_professional_at: {s.get('no_prompt_professional_at')}")
        print(f"  --> Endpoint Calculated Prompt for Client: {prompt_client}")
        print(f"  --> Endpoint Calculated Prompt for Professional: {prompt_pro}")
        print("==================================================")

if __name__ == "__main__":
    trace_all_active_requests()
