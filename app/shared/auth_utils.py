from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository

def obtener_rol(uid: str) -> str | None:
    repo = FirebaseUserRepository()
    user = repo.get_user_by_id(uid)
    return user.get("tipo") if user else None


