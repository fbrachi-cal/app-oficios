# 🛠️ App de Oficios
bla bla bla bla
A full-stack services marketplace that connects **clients** who need home and professional services with **skilled professionals** who provide them — directly, without commissions or intermediaries.

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Architecture Overview](#-architecture-overview)
4. [Prerequisites](#-prerequisites)
5. [Getting Started](#-getting-started)
   - [Backend (oficios-web)](#backend-oficios-web)
   - [Frontend (oficios-front)](#frontend-oficios-front)
6. [Environment Variables](#-environment-variables)
7. [API Reference](#-api-reference)
8. [Admin Panel](#-admin-panel)
9. [Project Structure](#-project-structure)
10. [Running with Docker](#-running-with-docker)

---

## 📌 Project Overview

**App de Oficios** is a two-sided marketplace:

| Role | Capabilities |
|---|---|
| **Cliente** | Search professionals, send service requests, chat, rate professionals |
| **Profesional** | Receive requests, reply to queries, confirm/reject jobs, view ratings |
| **Admin** | Moderate users, chats, reports; full CRUD for ratings |

### Core Features

- 🔐 **Firebase Auth** — email/password, Google, phone verification
- 👤 **Role-Based Access** — `cliente`, `profesional`, `admin`
- 📋 **Service Requests** — full lifecycle: created → accepted → confirmed → finished
- 💬 **Real-Time Chat** — Firestore-backed messaging per request
- ⭐ **Ratings System** — clients and professionals rate each other after a job
- 🛡️ **Admin Panel** — user management, chat moderation, report resolution, full ratings CRUD

---

## 🧰 Tech Stack

### Frontend (`oficios-front`)

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.7 | Type safety |
| Vite | 6 | Build tool & dev server |
| Tailwind CSS | 3 | Utility-first styling |
| Firebase SDK | 11 | Client-side auth |
| react-icons | 5 | Icon components |
| react-i18next | 15 | Internationalization (es/en) |
| react-router-dom | 7 | Client-side routing |
| Axios | 1.9 | HTTP client |

### Backend (`oficios-web`)

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Runtime |
| FastAPI | 0.115 | REST API framework |
| Uvicorn | 0.34 | ASGI server |
| Firebase Admin SDK | 6.7 | Server-side auth + Firestore |
| Firestore | — | Primary database (NoSQL) |
| Pydantic | 2 | Schema validation |
| Loguru | 0.7 | Structured logging |
| Twilio | — | Phone verification (OTP) |
| Pillow | — | Image processing |
| Pytest | 8 | Testing |

---

## 🏗️ Architecture Overview

```
┌────────────────────────────┐      HTTPS       ┌────────────────────────────┐
│      oficios-front         │ ───────────────▶ │       oficios-web          │
│   React SPA (Vite)         │                  │   FastAPI REST API         │
│                            │                  │                            │
│  Firebase Auth (client)    │                  │  Firebase Admin SDK        │
│  Firestore (real-time      │                  │  Firestore (server-side)   │
│    chat listener)          │                  │  Firebase Storage          │
└────────────────────────────┘                  └────────────────────────────┘
```

### Backend — Hexagonal Architecture (Ports & Adapters)

```
app/
├── api/            ← HTTP layer (routes, schemas, dependencies)
│   ├── routes/     ← Endpoint handlers (users, solicitudes, ratings, admin...)
│   └── schemas/    ← Pydantic request/response models
├── domain/         ← Business logic (pure Python, no framework deps)
│   └── services/   ← Use cases (RatingService, AdminRatingService, etc.)
├── ports/          ← Abstract interfaces (RatingRepository, UserRepository...)
├── adapters/       ← Concrete implementations
│   └── firebase/   ← FirebaseRatingRepository, FirebaseUserRepository...
└── shared/         ← Auth helpers, logger, roles, middleware
```

**Data flow:** `Route → Service → Repository Interface (Port) → Firebase Adapter`

Firestore transactions are used for all operations that require reading and writing simultaneously (e.g. updating a rating and the user's cached statistics atomically).

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

### Git

```bash
# Verify
git --version
```

Download: https://git-scm.com/downloads

---

### Node.js (v20+ recommended)

```bash
# Verify
node --version
npm --version
```

Download: https://nodejs.org/en

---

### PNPM (preferred) or NPM

```bash
# Install pnpm globally
npm install -g pnpm

# Verify
pnpm --version
```

---

### Python 3.10+

```bash
# Verify
python --version
```

Download: https://www.python.org/downloads/

---

### Docker (for containerized local runs)

#### Windows
Download and install **Docker Desktop**: https://www.docker.com/products/docker-desktop/

After install, ensure it's running before using any `docker` commands.

#### macOS
```bash
brew install --cask docker
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
newgrp docker
```

---

### Firebase Project

You need a Firebase project with the following services enabled:

- **Authentication** (Email/Password, Google — optional: Phone)
- **Firestore Database** (in Native mode)
- **Storage** (for profile images)

1. Go to https://console.firebase.google.com
2. Create a project
3. Generate a **Service Account key** (Project Settings → Service Accounts → Generate new private key)
4. Save the JSON file — you'll reference it in `.env`

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone <repo-url>
cd oficios-app
```

---

### Backend (`oficios-web`)

```bash
cd oficios-web
```

#### 1. Create and activate a virtual environment

```bash
# Create
python -m venv venv

# Activate — Windows
.\\venv\\Scripts\\activate

# Activate — macOS/Linux
source venv/bin/activate
```

#### 2. Install dependencies

```bash
pip install -r requirements.txt
```

#### 3. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

See the [Environment Variables](#-environment-variables) section for the full reference.

#### 4. Run the development server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs`

---

### Frontend (`oficios-front`)

```bash
cd oficios-front
```

#### 1. Install dependencies

```bash
pnpm install
# or
npm install
```

#### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in your Firebase web app credentials (from Firebase Console → Project Settings → Your apps → SDK config).

#### 3. Run the development server

```bash
pnpm dev
# or
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🔑 Environment Variables

### Backend — `oficios-web/.env`

```env
# Firebase Service Account (from the downloaded JSON key)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=...
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=...

# Twilio (optional — for phone OTP)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=...

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend — `oficios-front/.env`

```env
# Firebase Web SDK config (from Firebase Console)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Backend API base URL
VITE_API_BASE_URL=http://localhost:8000
```

---

## 📚 API Reference

All protected endpoints require an `Authorization: Bearer <firebase_id_token>` header.

### Users

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/usuarios/registrar` | authenticated | Create user profile |
| `GET` | `/usuarios/me` | authenticated | Get own profile |
| `PUT` | `/usuarios/me` | authenticated | Update own profile |
| `GET` | `/usuarios/` | admin | List all users |
| `POST` | `/usuarios/profesionales/buscar` | authenticated | Search professionals |

### Service Requests

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/solicitudes/` | cliente | Create a request |
| `GET` | `/solicitudes/cliente/{id}` | cliente | Own sent requests |
| `GET` | `/solicitudes/profesional/{id}` | profesional | Received requests |
| `PATCH` | `/solicitudes/{id}/estado` | authenticated | Update request status |

### Ratings

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/calificaciones/` | authenticated | Rate a user |
| `GET` | `/calificaciones/profesional/{id}` | authenticated | Get user ratings |

### Admin

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/admin/calificaciones` | admin | List all ratings (filterable) |
| `POST` | `/admin/calificaciones` | admin | Create rating manually |
| `PATCH` | `/admin/calificaciones/{id}` | admin | Edit rating |
| `DELETE` | `/admin/calificaciones/{id}` | admin | Soft delete rating |
| `GET` | `/admin/usuarios` | admin | List all users |
| `PATCH` | `/admin/usuarios/{id}` | admin | Update user role/status |
| `GET` | `/admin/chats` | admin | List all chats |
| `GET` | `/admin/reportes` | admin | List reports |
| `PATCH` | `/admin/reportes/{id}/resolver` | admin | Resolve report |

---

## 🛡️ Admin Panel

The admin panel is accessible at `/admin` when logged in with an account that has `tipo: "admin"` set in its Firestore user document.

```
/admin/usuarios       → User management
/admin/chats          → Chat moderation
/admin/reportes       → Report resolution
/admin/calificaciones → Ratings CRUD
```

### Granting Admin Access (Firestore)

In the Firebase Console → Firestore → `usuarios` collection, find the user document and set:

```json
{
  "tipo": "admin"
}
```

Or use a script/backend endpoint if available.

---

## 🐳 Running with Docker

A `Dockerfile` is provided for the backend.

```bash
cd oficios-web

# Build the image
docker build -t oficios-web .

# Run the container
docker run -p 8000:8000 --env-file .env oficios-web
```

> **Note:** The frontend is a Vite SPA — run it locally with `pnpm dev` or build it with `pnpm build` and serve the `dist/` folder via any static host (Firebase Hosting, Vercel, Nginx, etc.).

---

## 📁 Project Structure

```
oficios-app/
├── oficios-web/              ← Backend (FastAPI)
│   ├── app/
│   │   ├── api/              ← Routes & schemas
│   │   ├── domain/           ← Business logic (services)
│   │   ├── ports/            ← Repository interfaces
│   │   ├── adapters/         ← Firebase implementations
│   │   └── shared/           ← Auth, roles, logger
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── oficios-front/            ← Frontend (React + Vite)
    ├── src/
    │   ├── views/            ← Pages (auth, admin, landing)
    │   ├── components/       ← Shared UI components
    │   ├── services/         ← Axios API service layer
    │   ├── context/          ← Auth context
    │   └── i18n/             ← Translation files (es/en)
    ├── package.json
    └── .env.example
```

---

## 🧪 Running Tests

```bash
cd oficios-web

# Activate virtual environment first
source venv/bin/activate  # or .\venv\Scripts\activate on Windows

# Run all tests
pytest

# Run with verbose output
pytest -v
```

---

## 📬 Contact

Created by **Federico**.
Built with AI-assisted development. 💡
