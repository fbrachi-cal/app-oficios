# app/adapters/whatsapp/whatsapp_adapter.py
from twilio.rest import Client

class WhatsAppAdapter:
    def __init__(self, sid: str, token: str, from_whatsapp: str):
        self.client = Client(sid, token)
        self.from_whatsapp = from_whatsapp

    async def send(self, to: str, body: str):
        # Twilio envía  mensajes WhatsApp como “whatsapp:+123…”
        message = self.client.messages.create(
            body=body,
            from_=self.from_whatsapp,
            to=to
        )
        return message.sid
