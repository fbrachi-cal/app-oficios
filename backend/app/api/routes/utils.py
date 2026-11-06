from fastapi import APIRouter, Depends, Response
from firebase_admin import firestore
from app.api.dependencies import get_current_verified_user_id
from app.domain.services.geo_service import get_geo_catalog


router = APIRouter(prefix="/utils", tags=["utils"])
geo_router = APIRouter(prefix="/geo", tags=["geo"])


@geo_router.get("/catalog")
def obtener_catalogo_geografico(response: Response):
    catalog = get_geo_catalog()
    response.headers["ETag"] = f'"{catalog.version}"'
    return catalog.to_dict()


@router.get("/zonas")
def listar_zonas():
    return ["Caballito", "Belgrano", "Palermo", "Saavedra", "Villa Urquiza"]

@router.get("/oficios")
def listar_oficios():
    return ["plomero", "electricista", "gasista", "carpintero", "techista"]

@router.get("/categorias")
async def listar_categorias():
    db = firestore.client()
    snapshot = db.collection("categorias").stream()
    categorias = []
    for doc in snapshot:
        data = doc.to_dict()
        data["id"] = doc.id
        data["subcategorias"] = sorted(data.get("subcategorias", []), key=lambda s: s.get("orden", 999))
        categorias.append(data)
        
    categorias = sorted(categorias, key=lambda c: c.get("orden", 999))
    return categorias

@router.get("/motivos_cancelacion")
async def listar_motivos_cancelacion(user_id: str = Depends(get_current_verified_user_id)):
    db = firestore.client()
    snapshot = db.collection("motivos_cancelacion").stream()
    motivos = []
    for doc in snapshot:
        data = doc.to_dict()
        data["id"] = doc.id
        motivos.append(data)
    motivos = sorted(motivos, key=lambda m: m.get("orden", 999))
    return motivos