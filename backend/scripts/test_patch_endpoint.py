import os
import sys
import json
import requests
from dotenv import load_dotenv
import jwt

load_dotenv("backend/.env")

private_key = os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n')
client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
API_KEY = "AIzaSyC8gokmmf8rO3qooeP6w0P11tbQHyGCLB8"

import time
now = int(time.time())
payload = {
    "iss": client_email,
    "sub": client_email,
    "aud": "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    "iat": now,
    "exp": now + 3600,
    "uid": "IrHWg31L8lZDGvIAiWMyWAqdul03" # Professional
}
custom_token = jwt.encode(payload, private_key, algorithm="RS256")
res = requests.post(f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}", json={"token": custom_token, "returnSecureToken": True})
id_token = res.json()["idToken"]

req_id = "ISenN7C0bCYkOuWryhka"
url = f"https://oficios-web-back.onrender.com/solicitudes/{req_id}/responder-verificacion"
headers = {"Authorization": f"Bearer {id_token}", "Content-Type": "application/json"}
body = {"respuesta": "si"}

print("Calling PATCH /solicitudes/{id}/responder-verificacion on live Render...")
resp = requests.patch(url, headers=headers, json=body)
print("HTTP Status Code:", resp.status_code)
print("HTTP Response Body:", resp.text)
