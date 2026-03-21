from datetime import timedelta, datetime
import inspect
import uuid
import imghdr
from firebase_admin import storage, firestore
from fastapi import UploadFile, HTTPException
from typing import Any, List, Dict, Optional
from PIL import Image
from io import BytesIO
from app.shared.logger import log


class FirebaseRequestRepository:
    def __init__(self):
        self.db = firestore.client()
        self.collection = self.db.collection("solicitudes")
        

    def agregar_a_array(self, solicitud_id: str, campo: str, nuevo_valor: dict, extra_fields: dict = None) -> dict:
        doc_ref = self.collection.document(solicitud_id)
        updates = {
            campo: firestore.ArrayUnion([nuevo_valor])
        }

        if extra_fields:
            updates.update(extra_fields)

            # Si viene un nuevo estado, agregamos también al historial
            if "estado" in extra_fields:
                historial_entry = {
                    "estado": extra_fields["estado"],
                    "fecha": datetime.utcnow()
                }
                updates["historial_estados"] = firestore.ArrayUnion([historial_entry])

        doc_ref.update(updates)
        return doc_ref.get().to_dict()


    async def save_request(self, request_data: Dict[str, Any]) -> dict:
        doc_ref = self.collection.document()
        doc_ref.set(request_data)
        return {"id": doc_ref.id, **request_data}
    
    def listar_por_solicitante(self, solicitante_id: str) -> List[Dict[str, Any]]:
        query = self.collection.where("solicitante_id", "==", solicitante_id)
        docs = query.stream()
        return [dict(doc.to_dict(), id=doc.id) for doc in docs]

    def listar_por_profesional(self, profesional_id: str) -> List[Dict[str, Any]]:
        query = self.collection.where("profesional_id", "==", profesional_id)
        docs = query.stream()
        return [dict(doc.to_dict(), id=doc.id) for doc in docs]
    
    def get_by_id(self, solicitud_id: str) -> Optional[dict]:
        doc_ref = self.collection.document(solicitud_id)
        doc = doc_ref.get()
        if doc.exists:
            return dict(doc.to_dict(), id=doc.id)
        return None
    
    def actualizar_con_historial(self, solicitud_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        doc_ref = self.collection.document(solicitud_id)

        # Separar historial del resto
        historial_item = data.pop("historial_estados")

        # Hacer la actualización en 2 pasos
        doc_ref.update(data)
        doc_ref.update({
            "historial_estados": firestore.ArrayUnion([historial_item])
        })

        return (doc_ref.get()).to_dict()

    def actualizar(self, solicitud_id: str, update_data: dict) -> dict:
        log.info("EN ACTUALIZAR: "+str(update_data))
        doc_ref = self.collection.document(solicitud_id)
        doc_ref.update(update_data)
        return doc_ref.get().to_dict()