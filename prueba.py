from app.adapters.firebase.firebase_config import get_firestore

db = get_firestore()
print(db)  # Si no tira error, está OK
