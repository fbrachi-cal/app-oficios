from fastapi import APIRouter, HTTPException, Depends
from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository
from app.domain.services.user_service import UserService
from app.shared.firebase_auth import verify_token
from app.api.schemas.user_schema import UsuarioRegistro
from app.api.schemas.buscar_schema import FiltroBusquedaProfesionales
from app.shared.auth_utils import obtener_rol
from app.shared.roles import require_role
from app.shared.logger import log



router = APIRouter()
service = UserService(FirebaseUserRepository())

@router.get("/")
def listar_todos_los_usuarios(user_data: dict = Depends(require_role("admin"))):
    return service.listar_usuarios()

@router.post("/profesionales/buscar")
def buscar_profesionales_filtro(filtros: FiltroBusquedaProfesionales, user_data: dict = Depends(verify_token)):
    log.info("BUSCANDO PROFESIONALES...")
    zonas = filtros.zonas or []
    oficios = filtros.oficios or []
    return service.buscar_profesionales_multifiltro(zonas, oficios)


@router.get("/me")
def obtener_usuario_autenticado(user_data: dict = Depends(verify_token)):
    log.info("OBTENIENDO USUARIO AUTENTICADO")
    uid = user_data["uid"]
    log.info(f"UID OBTENIDO: {uid}")
    usuario = FirebaseUserRepository().get_user_by_id(uid)
    log.info("Usuario desde Firestore: {}", usuario)

    if usuario:
        return usuario
    raise HTTPException(status_code=404, detail="Usuario no encontrado")

@router.get("/me/rol")
def obtener_rol_usuario(user_data: dict = Depends(verify_token)):
    uid = user_data["uid"]
    rol = obtener_rol(uid)
    if rol:
        return {"rol": rol}
    raise HTTPException(status_code=404, detail="Rol no encontrado")

@router.post("/")
def registrar_usuario(usuario: UsuarioRegistro):
    try:
        print(f"ANTES DE REGISTRAR: {usuario.dict()}")
        service.registrar_usuario(usuario.dict())
        print("LUEGO DE REGISTRAR")
        return {"mensaje": "Usuario registrado con éxito"}
    except ValueError as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{user_id}")
def obtener_usuario(user_id: str):
    usuario = service.obtener_usuario(user_id)
    if usuario:
        return usuario
    raise HTTPException(status_code=404, detail="Usuario no encontrado")


@router.post("/vincular_uid/{doc_id_existente}")
def vincular_uid_a_usuario_existente(
    doc_id_existente: str,
    user_data: dict = Depends(verify_token)
):
    uid = user_data["uid"]
    log.info("Asignando UID {} al documento existente {}", uid, doc_id_existente)

    repo = FirebaseUserRepository()
    user_existente = repo.get_user_by_id(doc_id_existente)

    if not user_existente:
        raise HTTPException(status_code=404, detail="Documento original no encontrado")

    # Crear nuevo documento con el UID
    user_existente["id"] = uid
    repo.save_user(user_existente)

    return {"mensaje": f"Usuario vinculado al UID {uid} correctamente"}
