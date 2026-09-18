import os
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

req_id = "ISenN7C0bCYkOuWryhka"
url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/solicitudes/{req_id}?updateMask.fieldPaths=confirmo_realizacion_profesional&updateMask.fieldPaths=confirmo_profesional_at&updateMask.fieldPaths=verificado_por&updateMask.fieldPaths=verificado_at&updateMask.fieldPaths=estado"
headers = {"Authorization": f"Bearer {access_token}"}
payload = {
    "fields": {
        "estado": {"stringValue": "consulta"}
    }
}
res = requests.patch(url, headers=headers, json=payload)
print("Reset response status:", res.status_code)

# Delete rating doc for ISenN7C0bCYkOuWryhka if exists
url_ratings = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/calificaciones"
res_r = requests.get(url_ratings, headers=headers)
if res_r.status_code == 200:
    for d in res_r.json().get("documents", []):
        fields = d.get("fields", {})
        sol_val = fields.get("solicitud_id", {}).get("stringValue")
        if sol_val == req_id:
            name = d["name"]
            requests.delete(f"https://firestore.googleapis.com/v1/{name}", headers=headers)
            print("Deleted rating doc:", name)
