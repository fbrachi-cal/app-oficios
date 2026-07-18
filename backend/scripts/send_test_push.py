import sys
import os
import firebase_admin
from firebase_admin import credentials, messaging

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.adapters.firebase.firebase_config import get_firestore

def send_test_push(token: str):
    print(f"Sending test notification to: {token}")
    try:
        message = messaging.Message(
            token=token,
            notification=messaging.Notification(
                title="CasaClick Test Notification",
                body="Hola! Si estás viendo esto, las notificaciones push nativas de CasaClick están funcionando correctamente."
            ),
            data={
                "type": "test_push",
                "message": "Enviado exitosamente desde el SDK de administración."
            }
        )
        response = messaging.send(message)
        print(f"✅ Notification sent successfully! Message ID: {response}")
    except Exception as e:
        print(f"❌ Error sending notification: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/send_test_push.py <FCM_TOKEN>")
        sys.exit(1)
        
    target_token = sys.argv[1]
    send_test_push(target_token)
