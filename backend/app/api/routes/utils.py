from fastapi import APIRouter, Depends
from firebase_admin import firestore
from app.api.dependencies import get_current_user_id


router = APIRouter(prefix="/utils", tags=["utils"])

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
async def listar_motivos_cancelacion(user_id: str = Depends(get_current_user_id)):
    db = firestore.client()
    snapshot = db.collection("motivos_cancelacion").stream()
    motivos = []
    for doc in snapshot:
        data = doc.to_dict()
        data["id"] = doc.id
        motivos.append(data)
    motivos = sorted(motivos, key=lambda m: m.get("orden", 999))
    return motivos