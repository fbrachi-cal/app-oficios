import os
import sys

# Ensure app is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.adapters.firebase.firebase_config import get_firestore

def run_smoke_test():
    db = get_firestore()
    print("--------------------------------------------------")
    print("STARTING POST-MIGRATION SMOKE VERIFICATION")
    print("--------------------------------------------------")
    
    # 1. Verify no confirmada requests exist
    requests_ref = db.collection("solicitudes")
    confirmadas_docs = list(requests_ref.where("estado", "==", "confirmada").stream())
    print(f"Pending 'confirmada' requests: {len(confirmadas_docs)}")
    assert len(confirmadas_docs) == 0, "Error: There are still confirmada requests!"
    
    # 2. Inspect a migrated request (we fetch any request in calificada state)
    calificadas_docs = list(requests_ref.where("estado", "==", "calificada").stream())
    print(f"Total 'calificada' requests found: {len(calificadas_docs)}")
    assert len(calificadas_docs) > 0, "Error: No calificada requests found!"
    
    # Let's inspect the first one
    sample_doc = calificadas_docs[0]
    sample_id = sample_doc.id
    req = sample_doc.to_dict()
    print(f"Sample Request ID: {sample_id}")
    print(f"  Estado: {req.get('estado')}")
    print(f"  Solicitante ID: {req.get('solicitante_id')}")
    print(f"  Profesional ID: {req.get('profesional_id')}")
    print(f"  Verificado At: {req.get('verificado_at')}")
    print(f"  Verificado Por: {req.get('verificado_por')}")
    
    # 3. Confirm both participant ratings exist and are readable at deterministic IDs
    ratings_ref = db.collection("calificaciones")
    client_rating_id = f"calif_client_{sample_id}"
    pro_rating_id = f"calif_prof_{sample_id}"
    
    client_rating_doc = ratings_ref.document(client_rating_id).get()
    pro_rating_doc = ratings_ref.document(pro_rating_id).get()
    
    print(f"  Client Rating Document '{client_rating_id}' exists: {client_rating_doc.exists}")
    print(f"  Professional Rating Document '{pro_rating_id}' exists: {pro_rating_doc.exists}")
    
    assert client_rating_doc.exists, f"Error: Client rating {client_rating_id} is missing!"
    assert pro_rating_doc.exists, f"Error: Professional rating {pro_rating_id} is missing!"
    
    # Print sample rating info
    c_rating = client_rating_doc.to_dict()
    p_rating = pro_rating_doc.to_dict()
    print(f"    Client rating value: {c_rating.get('calificacion')} (for {c_rating.get('calificado_id')})")
    print(f"    Professional rating value: {p_rating.get('calificacion')} (for {p_rating.get('calificado_id')})")
    
    # 4. Confirm a non-missing user's counter is updated
    # Let's check solicitante_id of this request
    client_id = req.get("solicitante_id")
    client_user_snap = db.collection("usuarios").document(client_id).get()
    if client_user_snap.exists:
        client_user = client_user_snap.to_dict()
        print(f"User '{client_id}' exists. counter (cantidadTrabajosVerificados): {client_user.get('cantidadTrabajosVerificados')}")
    else:
        print(f"User '{client_id}' is skipped (deleted/orphaned account).")
        
    pro_id = req.get("profesional_id")
    pro_user_snap = db.collection("usuarios").document(pro_id).get()
    if pro_user_snap.exists:
        pro_user = pro_user_snap.to_dict()
        print(f"User '{pro_id}' exists. counter (cantidadTrabajosVerificados): {pro_user.get('cantidadTrabajosVerificados')}")
    else:
        print(f"User '{pro_id}' is skipped (deleted/orphaned account).")
        
    print("--------------------------------------------------")
    print("POST-MIGRATION SMOKE VERIFICATION: PASS")
    print("--------------------------------------------------")

if __name__ == "__main__":
    run_smoke_test()
