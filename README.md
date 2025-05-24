# 🛠️ App de Oficios - Backend

Este proyecto es el backend de una aplicación que conecta personas que necesitan servicios (como plomería, electricidad, gas, etc.) con profesionales que los ofrecen. Está desarrollado con **FastAPI**, utiliza **Firebase** para autenticación y base de datos, y sigue una arquitectura hexagonal.

---

## 🚀 Tecnologías utilizadas

- Python 3.10+
- FastAPI
- Firebase Admin SDK
- Firestore (base de datos)
- Firebase Auth (autenticación)
- Loguru (logging)
- Pydantic
- Uvicorn
- Pytest

---

## 🧱 Arquitectura

El proyecto sigue el patrón **hexagonal (puertos y adaptadores)**, separando claramente:

- `api/` → controladores HTTP
- `domain/` → lógica de negocio
- `adapters/` → Firebase, logging
- `shared/` → autenticación, dependencias
- `tests/` → pruebas unitarias

---

## 📦 Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd app_oficios
2. Crear entorno virtual
bash
Mostrar siempre los detalles

Copiar
python -m venv venv
source venv/bin/activate  # o .\\venv\\Scripts\\activate en Windows
3. Instalar dependencias
bash
Mostrar siempre los detalles

Copiar
pip install -r requirements.txt
4. Variables de entorno
Crear un archivo .env en la raíz del proyecto con tus credenciales de Firebase:

env
Mostrar siempre los detalles

Copiar
FIREBASE_PROJECT_ID=tu_proyecto
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FIREBASE_AUTH_URI=...
FIREBASE_TOKEN_URI=...
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=...
FIREBASE_CLIENT_X509_CERT_URL=...
▶️ Cómo levantar el servidor
bash
Mostrar siempre los detalles

Copiar
uvicorn app.main:app --reload
🔐 Autenticación
Se utiliza Firebase Auth.

Los endpoints protegidos requieren Authorization: Bearer <token>.

El backend verifica el token y extrae el uid.

👥 Roles de usuario
cliente → puede registrar solicitudes y calificar profesionales

profesional → recibe solicitudes y calificaciones

admin → puede ver todos los usuarios y moderar

📚 Endpoints clave
Método	Ruta	Rol requerido	Descripción
POST	/usuarios/registrar	(token válido)	Crear perfil con UID de Firebase
GET	/usuarios/me	autenticado	Obtener perfil del usuario actual
GET	/usuarios/me/rol	autenticado	Obtener rol del usuario
POST	/solicitudes/	cliente	Crear una nueva solicitud
GET	/solicitudes/cliente/{id}	cliente	Ver solicitudes propias
POST	/calificaciones/	cliente	Calificar a un profesional
GET	/calificaciones/profesional/{id}	profesional	Ver calificaciones recibidas
POST	/usuarios/profesionales/buscar	autenticado	Buscar profesionales por zona y oficio
GET	/usuarios/	admin	Listar todos los usuarios
🧪 Tests
bash
Mostrar siempre los detalles

Copiar
pytest
📄 Roadmap
Consultá el archivo roadmap_backend.md para ver mejoras futuras planificadas.

📬 Contacto
Creado por Federico.
Colaboración con IA para acelerar el desarrollo y la estructura. 💡