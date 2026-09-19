import os
import sys
import json
import requests
from dotenv import load_dotenv
from google.oauth2 import service_account
import google.auth.transport.requests

load_dotenv("backend/.env")

private_key = os.getenv("FIREBASE_PRIVATE_KEY")
cred_dict = {
    "type": "service_account",
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": private_key.replace('\\n', '\n') if private_key else "",
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
    "token_uri": os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
}

credentials = service_account.Credentials.from_service_account_info(
    cred_dict,
    scopes=["https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/cloud-platform"]
)

request = google.auth.transport.requests.Request()
credentials.refresh(request)
access_token = credentials.token

req_id = sys.argv[1] if len(sys.argv) > 1 else "ISenN7C0bCYkOuWryhka"
project_id = os.getenv("FIREBASE_PROJECT_ID")

print(f"Fetching document {req_id} via Firestore REST API...", flush=True)
url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/solicitudes/{req_id}"
headers = {"Authorization": f"Bearer {access_token}"}
res = requests.get(url, headers=headers, timeout=10)
print(f"Firestore REST Status: {res.status_code}", flush=True)

doc = res.json()
fields = doc.get("fields", {})

def parse_val(val):
    if "stringValue" in val: return val["stringValue"]
    if "booleanValue" in val: return val["booleanValue"]
    if "integerValue" in val: return int(val["integerValue"])
    if "timestampValue" in val: return val["timestampValue"]
    if "arrayValue" in val:
        return [parse_val(x) for x in val["arrayValue"].get("values", [])]
    if "mapValue" in val:
        return {k: parse_val(v) for k, v in val["mapValue"].get("fields", {}).items()}
    if "nullValue" in val: return None
    return val

data = {k: parse_val(v) for k, v in fields.items()}
client_id = data.get("solicitante_id")
pro_id = data.get("profesional_id")

print(f"Solicitante ID: {client_id}")
print(f"Profesional ID: {pro_id}")
print(f"Estado: {data.get('estado')}")
print(f"Confirmo Realizacion Cliente: {data.get('confirmo_realizacion_cliente')}")
print(f"Confirmo Realizacion Profesional: {data.get('confirmo_realizacion_profesional')}")
print(f"Califico Cliente: {data.get('califico_cliente')}")
print(f"Califico Profesional: {data.get('califico_profesional')}")

# Now mint custom token & ID token for client & pro
API_KEY = os.getenv("FIREBASE_API_KEY")
if not API_KEY:
    raise RuntimeError("FIREBASE_API_KEY is not configured")

import firebase_admin
from firebase_admin import auth as fb_auth

if not firebase_admin._apps:
    cred = firebase_admin.credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)

def get_id_token(uid):
    custom_token = fb_auth.create_custom_token(uid).decode("utf-8")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}"
    res = requests.post(url, json={"token": custom_token, "returnSecureToken": True}, timeout=10)
    return res.json()["idToken"]

print("\n==================================================")
print("CALLING RENDER API AS CLIENT")
print("==================================================")
client_token = get_id_token(client_id)
r_client = requests.get(f"https://oficios-web-back.onrender.com/solicitudes/{req_id}", headers={"Authorization": f"Bearer {client_token}"}, timeout=15)
print(f"Status: {r_client.status_code}")
print(json.dumps(r_client.json(), indent=2, ensure_ascii=False))

print("\n==================================================")
print("CALLING RENDER API AS PROFESSIONAL")
print("==================================================")
pro_token = get_id_token(pro_id)
r_pro = requests.get(f"https://oficios-web-back.onrender.com/solicitudes/{req_id}", headers={"Authorization": f"Bearer {pro_token}"}, timeout=15)
print(f"Status: {r_pro.status_code}")
print(json.dumps(r_pro.json(), indent=2, ensure_ascii=False))
