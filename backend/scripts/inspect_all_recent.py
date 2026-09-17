import os
import sys
import json
import time
import requests
from dotenv import load_dotenv
import jwt
from google.oauth2 import service_account
import google.auth.transport.requests

load_dotenv("backend/.env")

private_key = os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n')
client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
project_id = os.getenv("FIREBASE_PROJECT_ID")

cred_dict = {
    "type": "service_account",
    "project_id": project_id,
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": private_key,
    "client_email": client_email,
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
}
creds = service_account.Credentials.from_service_account_info(
    cred_dict,
    scopes=["https://www.googleapis.com/auth/datastore"]
)
creds.refresh(google.auth.transport.requests.Request())
access_token = creds.token

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

url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/solicitudes"
headers = {"Authorization": f"Bearer {access_token}"}
res = requests.get(url, headers=headers)
docs = res.json().get("documents", [])

print(f"Total documents in solicitudes: {len(docs)}")

all_reqs = []
for d in docs:
    fields = d.get("fields", {})
    req_id = d["name"].split("/")[-1]
    data = {k: parse_val(v) for k, v in fields.items()}
    data["id"] = req_id
    all_reqs.append(data)

# Sort by fecha_creacion or fecha_cambio_estado descending
all_reqs.sort(key=lambda x: str(x.get("fecha_creacion") or x.get("fecha_cambio_estado") or ""), reverse=True)

print("\n--- RECENT REQUESTS (TOP 10) ---")
for s in all_reqs[:10]:
    client_id = s.get("solicitante_id")
    pro_id = s.get("profesional_id")
    consultas = s.get("historial_consultas", [])
    real_msgs = [m for m in consultas if isinstance(m, dict) and m.get("usuario_id") in [client_id, pro_id] and m.get("tipo") != "admin" and m.get("rol") != "admin"]
    
    print(f"\nID: {s['id']}")
    print(f"  Estado: {s.get('estado')}")
    print(f"  Client: {client_id}")
    print(f"  Pro: {pro_id}")
    print(f"  Created: {s.get('fecha_creacion')}")
    print(f"  Total Msgs: {len(consultas)} | Participant Msgs: {len(real_msgs)}")
    print(f"  confirmo_cliente: {s.get('confirmo_realizacion_cliente')}")
    print(f"  confirmo_pro: {s.get('confirmo_realizacion_profesional')}")
    print(f"  califico_cliente: {s.get('califico_cliente')}")
    print(f"  califico_pro: {s.get('califico_profesional')}")
    print(f"  no_prompt_client_at: {s.get('no_prompt_client_at')}")
    print(f"  no_prompt_pro_at: {s.get('no_prompt_professional_at')}")
