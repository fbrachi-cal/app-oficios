from app.adapters.firebase.firebase_config import get_firestore
from firebase_admin import storage

db = get_firestore()
print(db)  # Si no tira error, está OK

bucket = storage.bucket()
print("✅ Bucket name:", bucket.name)