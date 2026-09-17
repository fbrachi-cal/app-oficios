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

def get_user_info(uid):
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/usuarios/{uid}"
    res = requests.get(url, headers={"Authorization": f"Bearer {access_token}"})
    if res.status_code == 200:
        fields = res.json().get("fields", {})
        return {k: parse_val(v) for k, v in fields.items()}
    return None

u1 = get_user_info("TWcmWBmKHwWBcdzqQ5qPHe6lBVk2")
u2 = get_user_info("IrHWg31L8lZDGvIAiWMyWAqdul03")

print("User 1 (solicitante_id):", u1.get("nombre"), "| email:", u1.get("email"), "| tipo:", u1.get("tipo"))
print("User 2 (profesional_id):", u2.get("nombre"), "| email:", u2.get("email"), "| tipo:", u2.get("tipo"))
