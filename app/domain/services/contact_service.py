from app.ports.chat_repository import ChatRepository
from app.ports.user_repository import UserRepository
from app.adapters.whatsapp.whatsapp_adapter import WhatsAppAdapter

class ContactService:
    def __init__(
        self,
        chat_repo: ChatRepository,
        user_repo: UserRepository,
        # whatsapp: WhatsAppAdapter,
    ):
        self.chat_repo = chat_repo
        self.user_repo = user_repo
        #self.whatsapp = whatsapp
        
    async def contact_professional(self, client_id: str, pro_id: str, message: str) -> str:
        # 1) Validaciones básicas
        pro = self.user_repo.get_user_by_id(pro_id)
        if not pro:
            raise ValueError("Profesional no encontrado")
        if client_id == pro_id:
            raise ValueError("No puedes contactarte a ti mismo")

        # 2) Crear o recuperar el chat interno
        chat = self.chat_repo.get_or_create_chat([client_id, pro_id])

        # 3) Añadir mensaje al chat
        self.chat_repo.add_message(
            chat_id=chat["id"],
            sender_id=client_id,
            body=message
        )

        return chat["id"]

    '''async def contact_professional_whatsapp(self, client_id: str, pro_id: str, message: str) -> str:
        # 1) Busco el teléfono del profesional
        pro = self.user_repo.get_user_by_id(pro_id)
        phone = pro.get("telefono")
        if not phone:
            raise ValueError("El profesional no tiene número de teléfono registrado")

        # 2) Envío WhatsApp
        await self.whatsapp.send(
            to=f"whatsapp:{phone}",
            body=message
        )

        # 3) Creo/recupero chat y guardo el mensaje
        chat = self.chat_repo.get_or_create_chat([client_id, pro_id])
        msg_id = self.chat_repo.add_message(
            chat_id=chat["id"],
            sender_id=client_id,
            body=message
        )

        return chat["id"]'''
