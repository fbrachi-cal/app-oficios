from fastapi import Depends, HTTPException
from app.shared.firebase_auth import verify_token
from app.shared.auth_utils import obtener_rol
from typing import Union, List

def require_role(required_roles: Union[str, List[str]]):
    """
    Dependency that enforces one or multiple roles.
    Usage:
        require_role("admin")
        require_role(["admin", "superadmin"])
    Future roles like "moderator" or "superadmin" can be added without changing callers.
    """
    if isinstance(required_roles, str):
        required_roles = [required_roles]

    def role_checker(user_data: dict = Depends(verify_token)):
        rol = obtener_rol(user_data["uid"])
        if rol not in required_roles:
            roles_str = ", ".join(required_roles)
            raise HTTPException(
                status_code=403,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {roles_str}"
            )
        return user_data

    return role_checker
