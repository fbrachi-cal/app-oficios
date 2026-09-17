import os
import sys
import json
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from app.adapters.firebase.firebase_config import init_firebase, get_firestore
from app.adapters.firebase.firebase_request_repo import FirebaseRequestRepository
from app.domain.services.request_service import RequestService

load_dotenv("backend/.env")

def test():
    init_firebase()
    repo = FirebaseRequestRepository()
    service = RequestService(repo)
    
    req_id = "ISenN7C0bCYkOuWryhka"
    user_id = "IrHWg31L8lZDGvIAiWMyWAqdul03" # Professional
    
    print(f"Testing responder_verificacion for request {req_id} and user {user_id}...")
    try:
        res = service.responder_verificacion(req_id, user_id, "si")
        print("Service returned:", res)
        # Try JSON serializing it
        json_str = json.dumps(res, default=str)
        print("JSON serializable string:", json_str)
    except Exception as e:
        print(f"EXCEPTIONS CAUGHT: {type(e)} -> {e}")

if __name__ == "__main__":
    test()
