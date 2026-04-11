import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("../../app-oficios-ffc35-firebase-adminsdk-fbsvc-46ab492b2f.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

categorias = [
    {
        "nombre": "Servicios del hogar",
        "orden": 1,
        "subcategorias": [
            {"nombre":"Electricidad","orden":1}, {"nombre":"Plomería","orden":1}, {"nombre":"Gas y calefacción","orden":1}, {"nombre":"Pintura","orden":1}, {"nombre":"Cerrajería","orden":1}, {"nombre":"Albañilería","orden":1},
            {"nombre":"Carpintería","orden":1}, {"nombre":"Limpieza","orden":1}, {"nombre":"Jardinería","orden":1}, {"nombre":"Mudanzas","orden":1}, {"nombre":"Reparaciones eléctricas","orden":1},
            {"nombre":"Reparación de electrodomésticos","orden":1}, {"nombre":"Reparación de computadoras","orden":1}, {"nombre":"Reparación de celulares","orden":1}
        ],
    },
    {
        "nombre": "Limpieza y mantenimiento",
        "orden": 2,
        "subcategorias": [
            {"nombre":"Limpieza general","orden":1}, {"nombre":"Limpieza profunda","orden":1}, {"nombre":"Limpieza de obra","orden":1},{"nombre":"Limpieza de vidrios","orden":1},
            {"nombre":"Jardinería y poda","orden":1}, {"nombre":"Lavado de autos a domicilio","orden":1}
        ]
    },
    {
        "nombre": "Cocina y Alimentos",
        "orden": 3,
        "subcategorias": [
            {"nombre":"Cocinero/a a domicilio","orden":1}, {"nombre":"Repostería / tortas por encargo","orden":1}, {"nombre":"Panificados/viandas a domicilio","orden":1},
            {"nombre":"Catering para eventos","orden":1}, {"nombre":"Delivery de comida","orden":1}, {"nombre":"Chef privado","orden":1}, {"nombre":"Bartender a domicilio","orden":1}
        ]
    },    
    {
        "nombre": "Lavandería y planchado",
        "orden": 4,
        "subcategorias": [
            {"nombre":"Lavado de ropa","orden":1},{"nombre":"Planchado","orden":1},{"nombre":"Servicio de tintorería","orden":1},{"nombre":"Lavado en seco","orden":1}
        ]
    },{
        "nombre": "Mascotas",
        "orden": 5,
        "subcategorias": [
            {"nombre":"Paseo de perros","orden":1},{"nombre":"Cuidado de mascotas","orden":1},
            {"nombre":"Peluquería canina","orden":1},{"nombre":"Entrenamiento/adiestramiento","orden":1},
            {"nombre":"Alojamiento/guardería","orden":1}
        ]
    },    
    {
        "nombre": "Servicios personales",
        "orden": 6,
        "subcategorias": [
            {"nombre":"Depilación","orden":1}, {"nombre":"Peluquería","orden":1}, {"nombre":"Barbería","orden":1}, {"nombre":"Masajes","orden":1}, {"nombre":"Manicuría","orden":1}, {"nombre":"Pedicuría","orden":1}, {"nombre":"Maquillaje","orden":1},
            {"nombre":"Personal trainer","orden":1},{"nombre":"Nutricionista","orden":1},{"nombre":"Reiki/terapia alternativa","orden":1},{"nombre":"Terapia psicológica","orden":1}
        ]
    },
    {
        "nombre": "Clases y apoyo escolar",
        "orden": 7,
        "subcategorias": [
            {"nombre":"Clases particulares","orden":1}, {"nombre":"Apoyo escolar","orden":1}, {"nombre":"Clases de idiomas","orden":1}, {"nombre":"Clases de música","orden":1},
            {"nombre":"Computación","orden":1}, {"nombre":"Talleres creativos","orden":1}
        ]
    },
    {
        "nombre": "Gestiones y trámites",
        "orden": 8,
        "subcategorias": [
            {"nombre":"Delegación de trámites presenciales","orden":1}, {"nombre":"Turnos médicos/bancarios","orden":1}, {"nombre":"Pago de servicios","orden":1}, {"nombre":"Mandados","orden":1}
        ]
    },
    {
        "nombre": "Cuidado de personas",
        "orden": 9,
        "subcategorias": [
            {"nombre":"Niñeras","orden":1}, {"nombre":"Acompañante terapéutico","orden":1},{"nombre":"Cuidador de adultos mayores","orden":1}, {"nombre":"Cuidado de personas con discapacidad","orden":1},
            {"nombre":"Enfermería domiciliaria","orden":1}
        ]
    },
    {
        "nombre": "Eventos y entretenimiento",
        "orden": 10,
        "subcategorias": [
            {"nombre":"Niñeras","orden":1}, {"nombre":"Animadores","orden":1},{"nombre":"Payasos/magos","orden":1}, {"nombre":"Fotografía","orden":1},{"nombre":"Sonido/luces/DJ","orden":1},
            {"nombre":"Decoración de eventos","orden":1}
        ]
    },
]

for cat in categorias:
    db.collection("categorias").add(cat)

print("Categorías cargadas.")
