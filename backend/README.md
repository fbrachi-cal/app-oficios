# 🛠️ App de Oficios — Backend

API REST del marketplace de servicios **App de Oficios**. Permite conectar clientes con profesionales del hogar, gestionando solicitudes, calificaciones, chats, un panel de administración y un módulo de recruiter para gestión de CVs.

Desarrollado con **FastAPI** y **Firebase**, siguiendo **arquitectura hexagonal (puertos y adaptadores)**.

---

## 📋 Índice

1. [Descripción](#-descripción)
2. [Tech Stack](#-tech-stack)
3. [Prerrequisitos](#-prerrequisitos)
4. [Variables de entorno](#-variables-de-entorno)
5. [Cómo correr el proyecto](#-cómo-correr-el-proyecto)
6. [Estructura del proyecto](#-estructura-del-proyecto)
7. [Endpoints principales](#-endpoints-principales)
8. [Errores comunes](#-errores-comunes)

---

## 📌 Descripción

El backend es el núcleo de la plataforma. Sus responsabilidades principales son:

- Verificar identidad via **Firebase Auth** (token JWT en cada request)
- Gestionar perfiles de usuarios, solicitudes, calificaciones y chats en **Firestore**
- Aplicar **reglas de negocio** (roles, estados de solicitudes, estadísticas de usuarios)
- Exponer un **panel de administración** con operaciones de moderación y CRUD completo
- Proveer un **módulo de recruiter** para subir, buscar y gestionar CVs de candidatos

---

## 🧰 Tech Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.10+ | Runtime |
| FastAPI | 0.115 | Framework REST |
| Uvicorn | 0.34 | Servidor ASGI |
| Firebase Admin SDK | 6.7 | Auth + Firestore (server-side) |
| Firestore | — | Base de datos principal (NoSQL) |
| Pydantic | 2 | Validación de esquemas |
| Loguru | 0.7 | Logging estructurado |
| Twilio | — | Verificación de teléfono (OTP) |
| Pillow | — | Procesamiento de imágenes |
| Pytest | 8 | Tests |

---

## ✅ Prerrequisitos

### Python 3.10+

```bash
# Verificar
python --version
```

Descarga: https://www.python.org/downloads/

---

### Docker (para correr en contenedor)

#### Windows
Instalar **Docker Desktop**: https://www.docker.com/products/docker-desktop/

Asegurarse de que Docker Desktop esté corriendo antes de ejecutar cualquier comando `docker`.

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
newgrp docker
```

#### macOS

```bash
brew install --cask docker
```

---

### Firebase

Necesitás un proyecto Firebase con lo siguiente habilitado:

- **Authentication** (Email/Password; Google y Teléfono opcionales)
- **Firestore Database** (modo nativo)
- **Storage** (para imágenes de perfil)

Pasos:
1. Ir a https://console.firebase.google.com
2. Crear o seleccionar un proyecto
3. En **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**
4. Guardar el JSON generado — sus valores van al `.env`

---

## 🔑 Variables de entorno

Copiar el archivo de ejemplo:

```bash
cp .env.example .env
```

Referencia completa del `.env`:

```env
# Firebase Service Account (del JSON descargado)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=...
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=...

# Twilio (opcional — para OTP de teléfono)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=...

# CORS — orígenes permitidos (separados por coma)
ALLOWED_ORIGINS=http://localhost:5173
```

> ⚠️ **Nunca** cometer el `.env` real al repositorio. Está en `.gitignore`.

---

## 🚀 Cómo correr el proyecto

### Opción A — Local (recomendado para desarrollo)

```bash
# 1. Crear entorno virtual
python -m venv venv

# 2. Activar
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar .env (ver sección anterior)

# 5. Levantar servidor
uvicorn app.main:app --reload
```

La API estará disponible en: `http://localhost:8000`

Documentación interactiva (Swagger): `http://localhost:8000/docs`

---

### Opción B — Docker

```bash
# Construir imagen
docker build -t oficios-web .

# Correr contenedor con las variables de entorno
docker run -p 8000:8000 --env-file .env oficios-web
```

Para correr en background:

```bash
docker run -d -p 8000:8000 --env-file .env --name oficios-api oficios-web
```

Ver logs:

```bash
docker logs -f oficios-api
```

---

## 📁 Estructura del proyecto

```
app/
├── api/
│   ├── routes/         ← Handlers HTTP (users, solicitudes, calificaciones, admin...)
│   ├── schemas/        ← Modelos Pydantic de request/response
│   └── dependencies.py ← Inyección de dependencias (repos, servicios)
│
├── domain/
│   └── services/       ← Lógica de negocio pura (sin dependencias de framework)
│
├── ports/              ← Interfaces abstractas (RatingRepository, UserRepository...)
│
├── adapters/
│   └── firebase/       ← Implementaciones concretas con Firestore
│
└── shared/             ← Auth, roles, logger, middleware
```

**Nota:** El módulo de CV tiene su propia estructura dentro de `domain/cv/` con models, ports y service dedicados.

**Flujo de datos:** `Route → Service → Port (interfaz) → Firebase Adapter → Firestore`

Las operaciones que requieren consistencia (ej: actualizar calificación + estadísticas del usuario) usan **transacciones de Firestore** (`@firestore.transactional`).

---

## 📚 Endpoints principales

Todos los endpoints protegidos requieren header: `Authorization: Bearer <firebase_id_token>`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `POST` | `/usuarios/registrar` | autenticado | Crear perfil |
| `GET` | `/usuarios/me` | autenticado | Perfil propio |
| `POST` | `/solicitudes/` | cliente | Crear solicitud |
| `PATCH` | `/solicitudes/{id}/estado` | autenticado | Actualizar estado |
| `POST` | `/calificaciones/` | autenticado | Calificar usuario |
| `GET` | `/admin/calificaciones` | admin | Listar calificaciones |
| `POST` | `/admin/calificaciones` | admin | Crear calificación |
| `PATCH` | `/admin/calificaciones/{id}` | admin | Editar calificación |
| `DELETE` | `/admin/calificaciones/{id}` | admin | Soft delete |

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `POST` | `/cvs/upload` | admin, recruiter | Subir CV (multipart: archivo + metadatos del candidato) |
| `GET` | `/cvs/` | admin, recruiter | Listar/buscar CVs (filtros: status, seniority, salario, zona, texto) |
| `GET` | `/cvs/{id}` | admin, recruiter | Obtener detalle de un CV |
| `PUT` | `/cvs/{id}` | admin, recruiter | Actualizar metadatos de un CV (estado, notas, evaluación) |

Documentación completa: `http://localhost:8000/docs`

---

## 🧪 Tests

```bash
# Activar entorno virtual primero
pytest

# Con output detallado
pytest -v
```

---

## ⚠️ Errores comunes

### Error de CORS

Verificar que `ALLOWED_ORIGINS` en el `.env` incluya el origen del frontend exacto (con puerto), ej:

```env
ALLOWED_ORIGINS=http://localhost:5173
```

### Firebase: `Could not deserialize key data`

La `FIREBASE_PRIVATE_KEY` debe tener los saltos de línea como `\n` dentro de comillas dobles:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

### Token expirado / inválido

Los tokens de Firebase expiran en 1 hora. El frontend debe renovarlos automáticamente. Si testeás con Swagger, generá un token fresco desde el cliente.

### Puerto 8000 ocupado

```bash
# Windows — identificar proceso en el puerto
netstat -ano | findstr :8000

# Linux/macOS
lsof -i :8000
```

---

## 📬 Contacto

Creado por **Federico**. Desarrollado con asistencia de IA. 💡