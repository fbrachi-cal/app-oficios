from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository
from typing import Optional

def obtener_tipo(uid: str) -> Optional[str]:
    repo = FirebaseUserRepository()
    user = repo.get_user_by_id(uid)
    return user.get("tipo") if user else None


