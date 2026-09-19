import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

import firebase_admin
from firebase_admin import credentials, auth
from app.adapters.firebase.firebase_config import init_firebase, get_firestore

print("Step 1: Init Firebase", flush=True)
init_firebase()
db = get_firestore()

req_id = sys.argv[1] if len(sys.argv) > 1 else "ISenN7C0bCYkOuWryhka"
print(f"Step 2: Fetch doc {req_id}", flush=True)
doc_snap = db.collection("solicitudes").document(req_id).get()

if not doc_snap.exists:
    print(f"Request {req_id} does not exist in Firestore!", flush=True)
    sys.exit(1)

data = doc_snap.to_dict()
client_id = data.get("solicitante_id")
pro_id = data.get("profesional_id")
print(f"Client: {client_id}, Pro: {pro_id}", flush=True)

API_KEY = os.getenv("FIREBASE_API_KEY")
if not API_KEY:
    raise RuntimeError("FIREBASE_API_KEY is not configured")

def get_id_token(uid: str) -> str:
    print(f"Creating custom token for {uid}...", flush=True)
    custom_token = auth.create_custom_token(uid).decode("utf-8")
    print(f"Exchanging custom token via REST for {uid}...", flush=True)
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}"
    res = requests.post(url, json={"token": custom_token, "returnSecureToken": True}, timeout=10)
    print(f"Exchange status: {res.status_code}", flush=True)
    return res.json()["idToken"]

print("\n--- Testing Client ---", flush=True)
client_token = get_id_token(client_id)
headers = {"Authorization": f"Bearer {client_token}"}
print("Calling Render API as Client...", flush=True)
r_client = requests.get(f"https://oficios-web-back.onrender.com/solicitudes/{req_id}", headers=headers, timeout=15)
print(f"Render Status: {r_client.status_code}", flush=True)
print("Response JSON:")
print(json.dumps(r_client.json(), indent=2, ensure_ascii=False))

print("\n--- Testing Professional ---", flush=True)
pro_token = get_id_token(pro_id)
headers = {"Authorization": f"Bearer {pro_token}"}
print("Calling Render API as Professional...", flush=True)
r_pro = requests.get(f"https://oficios-web-back.onrender.com/solicitudes/{req_id}", headers=headers, timeout=15)
print(f"Render Status: {r_pro.status_code}", flush=True)
print("Response JSON:")
print(json.dumps(r_pro.json(), indent=2, ensure_ascii=False))
