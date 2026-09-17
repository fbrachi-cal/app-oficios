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
    
    def get_all_requests(self) -> List[Dict[str, Any]]:
        docs = self.collection.stream()
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

    def responder_verificacion_si_transaccional(self, solicitud_id: str, user_id: str) -> dict:
        transaction = self.db.transaction()
        solicitud_ref = self.collection.document(solicitud_id)

        @firestore.transactional
        def _run(txn):
            snap = solicitud_ref.get(transaction=txn)
            if not snap.exists:
                raise Exception("Solicitud no encontrada")
            
            solicitud = snap.to_dict()
            solicitud["id"] = snap.id
            
            client_id = solicitud.get("solicitante_id")
            pro_id = solicitud.get("profesional_id")
            if user_id not in [client_id, pro_id]:
                raise Exception("No tenés permiso para responder la verificación de esta solicitud")
            
            is_client = user_id == client_id

            # Canonical source of truth: participant-specific completion fields. Fallback to verificado_por for historical data.
            already_confirmed = (
                solicitud.get("confirmo_realizacion_cliente") if is_client
                else solicitud.get("confirmo_realizacion_profesional")
            )
            if already_confirmed is None:
                already_confirmed = (solicitud.get("verificado_por") == user_id)

            if already_confirmed:
                return {"solicitud": solicitud, "ofrecer_calificacion": True, "already_done": True}

            if solicitud.get("estado") == "cancelada":
                raise Exception("No se pueden verificar solicitudes canceladas")

            ahora = datetime.utcnow()
            
            field_name = "confirmo_realizacion_cliente" if is_client else "confirmo_realizacion_profesional"
            date_field = "confirmo_cliente_at" if is_client else "confirmo_profesional_at"

            updates = {
                field_name: True,
                date_field: ahora,
            }
            
            # Historical fallback fields
            if not solicitud.get("verificado_por"):
                updates["verificado_por"] = user_id
                updates["verificado_at"] = ahora

            # Retain "verificada" state for UI status badges only if active and not already verified/calificada
            if solicitud.get("estado") not in ["verificada", "calificada"]:
                updates["estado"] = "verificada"
                updates["fecha_cambio_estado"] = ahora
                historial_entry = {"estado": "verificada", "fecha": ahora}
                updates["historial_estados"] = firestore.ArrayUnion([historial_entry])

            # Perform all transactional reads first
            target_user_ref = self.db.collection("usuarios").document(user_id)
            target_snap = target_user_ref.get(transaction=txn)

            # Perform transactional writes second
            txn.update(solicitud_ref, updates)
            
            if target_snap.exists:
                target_data = target_snap.to_dict()
                new_count = int(target_data.get("cantidadTrabajosVerificados", 0)) + 1
                txn.update(target_user_ref, {"cantidadTrabajosVerificados": new_count})
            else:
                txn.set(target_user_ref, {"cantidadTrabajosVerificados": 1}, merge=True)
            
            solicitud.update(updates)
            return {"solicitud": solicitud, "ofrecer_calificacion": True, "already_done": False}

        return _run(transaction)