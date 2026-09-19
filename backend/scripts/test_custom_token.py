import os
import time
import json
import requests
import jwt
from dotenv import load_dotenv

load_dotenv("backend/.env")

private_key = os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n')
client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
API_KEY = os.getenv("FIREBASE_API_KEY")
if not API_KEY:
    raise RuntimeError("FIREBASE_API_KEY is not configured")

def get_id_token(uid: str):
    now = int(time.time())
    payload = {
        "iss": client_email,
        "sub": client_email,
        "aud": "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
        "iat": now,
        "exp": now + 3600,
        "uid": uid
    }
    custom_token = jwt.encode(payload, private_key, algorithm="RS256")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}"
    res = requests.post(url, json={"token": custom_token, "returnSecureToken": True})
    print(f"Auth exchange status for {uid}: {res.status_code}")
    if res.status_code != 200:
        print(res.text)
        return None
    return res.json()["idToken"]

req_id = "ISenN7C0bCYkOuWryhka"
client_uid = "TWcmWBmKHwWBcdzqQ5qPHe6lBVk2"
pro_uid = "IrHWg31L8lZDGvIAiWMyWAqdul03"

print("--- CLIENT CALL ---")
token_c = get_id_token(client_uid)
if token_c:
    r = requests.get(f"https://oficios-web-back.onrender.com/solicitudes/{req_id}", headers={"Authorization": f"Bearer {token_c}"})
    print(f"Client Render Status: {r.status_code}")
    print(json.dumps(r.json(), indent=2, ensure_ascii=False))

print("\n--- PRO CALL ---")
token_p = get_id_token(pro_uid)
if token_p:
    r = requests.get(f"https://oficios-web-back.onrender.com/solicitudes/{req_id}", headers={"Authorization": f"Bearer {token_p}"})
    print(f"Pro Render Status: {r.status_code}")
    print(json.dumps(r.json(), indent=2, ensure_ascii=False))
