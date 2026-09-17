import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from app.adapters.firebase.firebase_config import get_firestore, init_firebase
from app.adapters.firebase.firebase_request_repo import FirebaseRequestRepository
from app.domain.services.request_service import RequestService

def inspect_requests():
    print("=== Inspecting Live Firestore Requests ===")
    init_firebase()
    repo = FirebaseRequestRepository()
    service = RequestService(repo)
    
    requests = repo.get_all_requests()
    print(f"Total solicitudes in Firestore: {len(requests)}")
    
    for s in requests:
        req_id = s.get("id")
        estado = s.get("estado")
        client_id = s.get("solicitante_id")
        pro_id = s.get("profesional_id")
        consultas = s.get("historial_consultas", [])
        
        # Count real participant messages
        real_msgs = [
            m for m in consultas 
            if m.get("usuario_id") in [client_id, pro_id] 
            and m.get("tipo") != "admin" 
            and m.get("rol") != "admin"
        ]
        
        confirmo_client = s.get("confirmo_realizacion_cliente")
        confirmo_pro = s.get("confirmo_realizacion_profesional")
        verificado_por = s.get("verificado_por")
        
        eligibility_client = service.calcular_eligibilidad_verificacion(s, client_id) if client_id else False
        eligibility_pro = service.calcular_eligibilidad_verificacion(s, pro_id) if pro_id else False
        
        print(f"\n--- Request ID: {req_id} ---")
        print(f"  Estado: {estado}")
        print(f"  Solicitante (Client): {client_id}")
        print(f"  Profesional: {pro_id}")
        print(f"  Total messages: {len(consultas)} (Participant messages: {len(real_msgs)})")
        print(f"  verificado_por: {verificado_por}")
        print(f"  confirmo_realizacion_cliente: {confirmo_client}")
        print(f"  confirmo_realizacion_profesional: {confirmo_pro}")
        print(f"  califico_cliente: {s.get('califico_cliente')}")
        print(f"  califico_profesional: {s.get('califico_profesional')}")
        print(f"  no_prompt_client_at: {s.get('no_prompt_client_at')}")
        print(f"  no_prompt_professional_at: {s.get('no_prompt_professional_at')}")
        print(f"  Calculated Prompt Eligibility for Client: {eligibility_client}")
        print(f"  Calculated Prompt Eligibility for Professional: {eligibility_pro}")

if __name__ == "__main__":
    inspect_requests()
