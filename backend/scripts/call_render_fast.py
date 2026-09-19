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
API_KEY = os.getenv("FIREBASE_API_KEY")
if not API_KEY:
    raise RuntimeError("FIREBASE_API_KEY is not configured")

def mint_custom_token(uid: str) -> str:
    now = int(time.time())
    payload = {
        "iss": client_email,
        "sub": client_email,
        "aud": "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
        "iat": now,
        "exp": now + 3600,
        "uid": uid,
    }
    return jwt.encode(payload, private_key, algorithm="RS256")

def get_id_token(uid: str) -> str:
    custom_token = mint_custom_token(uid)
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}"
    res = requests.post(url, json={"token": custom_token, "returnSecureToken": True}, timeout=10)
    return res.json()["idToken"]

def inspect_request(req_id: str):
    # Fetch Firestore doc via OAuth2 Service Account
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

    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/solicitudes/{req_id}"
    res = requests.get(url, headers={"Authorization": f"Bearer {creds.token}"}, timeout=10)
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
    consultas = data.get("historial_consultas", [])

    print(f"\n==================================================")
    print(f"FIRESTORE DATA FOR REQUEST ID: {req_id}")
    print(f"solicitante_id: {client_id}")
    print(f"profesional_id: {pro_id}")
    print(f"estado: {data.get('estado')}")
    print(f"historial_consultas (total): {len(consultas)}")
    
    real_msgs = [m for m in consultas if isinstance(m, dict) and m.get("usuario_id") in [client_id, pro_id] and m.get("tipo") != "admin" and m.get("rol") != "admin"]
    print(f"historial_consultas (participant msgs): {len(real_msgs)}")
    print(f"created_at (fecha_creacion): {data.get('fecha_creacion')}")
    print(f"last message timestamp: {real_msgs[-1].get('fecha') if real_msgs else None}")
    print(f"verificado_por: {data.get('verificado_por')}")
    print(f"confirmo_realizacion_cliente: {data.get('confirmo_realizacion_cliente')}")
    print(f"confirmo_realizacion_profesional: {data.get('confirmo_realizacion_profesional')}")
    print(f"califico_cliente: {data.get('califico_cliente')}")
    print(f"califico_profesional: {data.get('califico_profesional')}")
    print(f"no_prompt_client_at: {data.get('no_prompt_client_at')}")
    print(f"no_prompt_professional_at: {data.get('no_prompt_professional_at')}")

    print(f"\n==================================================")
    print(f"CALLING LIVE RENDER ENDPOINT AS CLIENT ({client_id})")
    print(f"==================================================")
    c_token = get_id_token(client_id)
    r_client = requests.get(f"https://oficios-web-back.onrender.com/solicitudes/{req_id}", headers={"Authorization": f"Bearer {c_token}"}, timeout=10)
    print(f"HTTP Status: {r_client.status_code}")
    client_json = r_client.json()
    print("JSON Response:")
    print(json.dumps(client_json, indent=2, ensure_ascii=False))

    print(f"\n==================================================")
    print(f"CALLING LIVE RENDER ENDPOINT AS PROFESSIONAL ({pro_id})")
    print(f"==================================================")
    p_token = get_id_token(pro_id)
    r_pro = requests.get(f"https://oficios-web-back.onrender.com/solicitudes/{req_id}", headers={"Authorization": f"Bearer {p_token}"}, timeout=10)
    print(f"HTTP Status: {r_pro.status_code}")
    pro_json = r_pro.json()
    print("JSON Response:")
    print(json.dumps(pro_json, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    req_id = sys.argv[1] if len(sys.argv) > 1 else "ISenN7C0bCYkOuWryhka"
    inspect_request(req_id)
