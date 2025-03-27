from fastapi import Depends, HTTPException
from app.shared.firebase_auth import verify_token
from app.shared.auth_utils import obtener_rol

def require_role(required_role: str):
    def role_checker(user_data: dict = Depends(verify_token)):
        rol = obtener_rol(user_data["uid"])
        if rol != required_role:
            raise HTTPException(status_code=403, detail=f"Se requiere rol: {required_role}")
        return user_data
    return role_checker
