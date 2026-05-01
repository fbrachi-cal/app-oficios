from app.api.dependencies import get_user_repo
from app.ports.user_repository import UserRepository
from fastapi import APIRouter, HTTPException, Depends
from app.adapters.firebase.firebase_user_repo import FirebaseUserRepository
from app.domain.services.user_service import UserService
from app.shared.firebase_auth import verify_token
from app.api.schemas.user_schema import UsuarioRegistro, UsuarioUpdate
from app.api.schemas.buscar_schema import FiltroBusquedaProfesionales
from app.shared.auth_utils import obtener_tipo
from app.shared.roles import require_role
from app.shared.logger import log
from app.shared.firebase_auth import verify_token


router = APIRouter()

def get_user_service(user_repo: UserRepository = Depends(get_user_repo)) -> UserService:
    return UserService(user_repo)

@router.get("/")
def listar_todos_los_usuarios(user_data: dict = Depends(require_role("admin")),service: UserService = Depends(get_user_service)):
    return service.listar_usuarios()


@router.post("/profesionales/buscar")
async def buscar_profesionales(filtros: FiltroBusquedaProfesionales, user=Depends(verify_token),service: UserService = Depends(get_user_service)): 
    log.info("CATEGORIA EN ROUTER: "+filtros.categoria) 
    return service.buscar_profesionales_multifiltro(filtros.zonas, filtros.categoria, filtros.subcategorias ,limit=filtros.limit,
        start_after_id=filtros.start_after_id)

@router.get("/me")
def obtener_usuario_autenticado(user_data: dict = Depends(verify_token),user_repo: UserRepository = Depends(get_user_repo)):
    log.info("OBTENIENDO USUARIO AUTENTICADO")
    uid = user_data["uid"]
    log.info(f"UID OBTENIDO: {uid}")
    usuario = user_repo.get_user_by_id(uid)
    log.info("Usuario desde Firestore: {}", usuario)

    if usuario:
        return usuario
    raise HTTPException(status_code=404, detail="Usuario no encontrado")

@router.put("/me")
def actualizar_usuario_autenticado(
    datos: UsuarioUpdate,
    user_data: dict = Depends(verify_token),
    service: UserService = Depends(get_user_service)
):
    uid = user_data["uid"]
    usuario_actualizado = service.actualizar_usuario(uid, datos)
    if usuario_actualizado:
        return {"mensaje": "Usuario actualizado con éxito", "usuario": usuario_actualizado}
    raise HTTPException(status_code=404, detail="Usuario no encontrado")

@router.get("/me/tipo")
def obtener_tipo_usuario(user_data: dict = Depends(verify_token)):
    uid = user_data["uid"]
    tipo = obtener_tipo(uid)
    if tipo:
        return {"tipo": tipo}
    raise HTTPException(status_code=404, detail="Tipo no encontrado")

@router.get("/me/rol")
def obtener_rol_usuario_legacy(user_data: dict = Depends(verify_token)):
    uid = user_data["uid"]
    tipo = obtener_tipo(uid)
    if tipo:
        return {"rol": tipo}
    raise HTTPException(status_code=404, detail="Rol no encontrado")


@router.post("/")
def registrar_usuario(usuario: UsuarioRegistro, service: UserService = Depends(get_user_service)):
    try:
        print(f"ANTES DE REGISTRAR: {usuario.dict()}")
        service.registrar_usuario(usuario)
        print("LUEGO DE REGISTRAR")
        return {"mensaje": "Usuario registrado con éxito"}
    except ValueError as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{user_id}")
def obtener_usuario(user_id: str, service: UserService = Depends(get_user_service)):
    usuario = service.obtener_usuario(user_id)
    if usuario:
        return usuario
    raise HTTPException(status_code=404, detail="Usuario no encontrado")


@router.post("/vincular_uid/{doc_id_existente}")
def vincular_uid_a_usuario_existente(
    doc_id_existente: str,
    user_data: dict = Depends(verify_token),
    user_repo: UserRepository = Depends(get_user_repo)
):
    uid = user_data["uid"]
    log.info("Asignando UID {} al documento existente {}", uid, doc_id_existente)

    user_existente = user_repo.get_user_by_id(doc_id_existente)

    if not user_existente:
        raise HTTPException(status_code=404, detail="Documento original no encontrado")

    # Crear nuevo documento con el UID
    user_existente["id"] = uid
    user_repo.save_user(user_existente)

    return {"mensaje": f"Usuario vinculado al UID {uid} correctamente"}
