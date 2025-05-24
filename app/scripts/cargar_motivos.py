import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("../../app-oficios-ffc35-firebase-adminsdk-fbsvc-46ab492b2f.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

motivos = [
    {"key": "motivos_cancelacion.no_responde", "orden": 1},
    {"key": "motivos_cancelacion.precio_inadecuado", "orden": 2},
    {"key": "motivos_cancelacion.cliente_no_disponible", "orden": 3},
    {"key": "motivos_cancelacion.cambio_de_plan", "orden": 4},
    {"key": "motivos_cancelacion.trabajo_ya_realizado", "orden": 5},
    {"key": "motivos_cancelacion.informacion_insuficiente", "orden": 6},
]

for motivo in motivos:
    db.collection("motivos_cancelacion").add(motivo)

print("Motivos de cancelación/rechazo cargados.")
