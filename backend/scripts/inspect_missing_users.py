import os
import sys

# Ensure app is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.adapters.firebase.firebase_config import get_firestore

def inspect_missing_users():
    db = get_firestore()
    missing_uids = [
        "7QKCUQrcQ7aYqOKMD7yEl1iE7GA2",
        "fEjk2OJXW5UzVkMGbBVSS3n6ri22",
        "Iqcub0cAjrSZsBZPABq88rzzql73",
        "lziETjszxigQsSIKPgQ0EII47jG3",
        "W9SJbYu5v7YE17AYfRR8y4H2up72",
        "aqRdYA1tf0VWpGLTTKOM3mxlETZ2",
        "LfvhvfthEQhlLBJrevHgiClGuci2"
    ]
    
    requests_ref = db.collection("solicitudes")
    
    print("--------------------------------------------------")
    print("INSPECTING MISSING USERS IN SOLICITUDES")
    print("--------------------------------------------------")
    
    for uid in missing_uids:
        # Check if user document exists in DB
        u_snap = db.collection("usuarios").document(uid).get()
        exists = u_snap.exists
        
        # Count requests where user is solicitante_id
        client_reqs = list(requests_ref.where("solicitante_id", "==", uid).stream())
        # Count requests where user is profesional_id
        pro_reqs = list(requests_ref.where("profesional_id", "==", uid).stream())
        
        total_reqs = len(client_reqs) + len(pro_reqs)
        
        print(f"UID: {uid}")
        print(f"  Exists in usuarios collection: {exists}")
        print(f"  Total requests referencing this UID: {total_reqs}")
        print(f"  As client/solicitante: {len(client_reqs)}")
        print(f"  As professional/profesional: {len(pro_reqs)}")
        
        if total_reqs > 0:
            states = {}
            for r_doc in client_reqs + pro_reqs:
                req = r_doc.to_dict()
                state = req.get("estado")
                states[state] = states.get(state, 0) + 1
            print(f"  Request states: {states}")
        print("--------------------------------------------------")

if __name__ == "__main__":
    inspect_missing_users()
