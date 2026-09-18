import os
import sys
import json
import requests
from dotenv import load_dotenv
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

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))
from app.domain.services.request_service import RequestService

class DummyRepo:
    pass

service = RequestService(DummyRepo())

print("=== CHECKING ALL ACTIVE UNCONFIRMED UNRATED REQUESTS ===")
for d in docs:
    fields = d.get("fields", {})
    req_id = d["name"].split("/")[-1]
    data = {k: parse_val(v) for k, v in fields.items()}
    data["id"] = req_id

    estado = data.get("estado")
    client_id = data.get("solicitante_id")
    pro_id = data.get("profesional_id")
    consultas = data.get("historial_consultas", [])

    if estado == "cancelada":
        continue

    confirmo_c = bool(data.get("confirmo_realizacion_cliente") or (data.get("verificado_por") == client_id))
    confirmo_p = bool(data.get("confirmo_realizacion_profesional") or (data.get("verificado_por") == pro_id))
    califico_c = bool(data.get("califico_cliente"))
    califico_p = bool(data.get("califico_profesional"))

    elig_c = service.calcular_eligibilidad_verificacion(data, client_id)
    elig_p = service.calcular_eligibilidad_verificacion(data, pro_id)

    if elig_c or elig_p:
        print(f"\nRequest ID: {req_id}")
        print(f"  Estado: {estado}")
        print(f"  Client: {client_id} (Eligible: {elig_c}, Confirmed: {confirmo_c}, Rated: {califico_c})")
        print(f"  Pro: {pro_id} (Eligible: {elig_p}, Confirmed: {confirmo_p}, Rated: {califico_p})")
