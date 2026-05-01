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
| **Recruiter** | Upload, search, filter, and manage candidate CVs via a dedicated panel |
| **Admin** | All of the above + moderate users, chats, reports; full CRUD for ratings |

### Core Features

- 🔐 **Firebase Auth** — email/password, Google, phone verification
- 👤 **Role-Based Access** — `cliente`, `profesional`, `recruiter`, `admin`
- 📋 **Service Requests** — full lifecycle: created → accepted → confirmed → finished
- 💬 **Real-Time Chat** — Firestore-backed messaging per request
- ⭐ **Ratings System** — clients and professionals rate each other after a job
- 🛡️ **Admin Panel** — user management, chat moderation, report resolution, full ratings CRUD
- 📄 **Recruiter Panel** — CV management: upload, search, filter, and evaluate candidates
- 🚥 **User Status Management** — statuses including `ACTIVE`, `SUSPENDED`, `EXPELLED`, and `DEACTIVATED` to strictly control platform access

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

### CVs (Recruiter Module)

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/cvs/upload` | admin, recruiter | Upload a CV (multipart form: file + metadata) |
| `GET` | `/cvs/` | admin, recruiter | List/search CVs (filters: status, seniority, salary, zone, text) |
| `GET` | `/cvs/{id}` | admin, recruiter | Get single CV details |
| `PUT` | `/cvs/{id}` | admin, recruiter | Update CV metadata (status, notes, evaluation fields) |

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
/admin/usuarios       → User management (Roles, Status, Soft Deletion)
/admin/chats          → Chat moderation
/admin/reportes       → Report resolution
/admin/calificaciones → Ratings CRUD
```

### User Lifecycle & Status Management
Users default to an `ACTIVE` status. When moderating users, admins can enforce the following statuses:
- `ACTIVE` — Normal access.
- `SUSPENDED` — Temporary/reversible block.
- `EXPELLED` — Permanent block for serious violations.
- `DEACTIVATED` — Logical deactivation (user cannot access anymore).

**Security & Firebase Auth Integration:**
When an admin sets a user to `SUSPENDED`, `EXPELLED`, or `DEACTIVATED`, the system executes the following session revocation flow:
1. **Firebase Sync**: The underlying Firebase Auth account is disabled (blocking any new sign-ins) and its refresh tokens are explicitly revoked (blocking refresh token reuse).
2. **Immediate Enforcement**: To prevent previously-issued ID tokens from remaining valid during their standard 1-hour expiration window, the backend API uses `auth.verify_id_token(id_token, check_revoked=True)` to confirm token validity securely on every request.
3. **Database Fallback**: A manual `status` check is also evaluated in Firestore during the request pipeline as a fallback layer.
4. **Auto-Reactivation**: If a user is `SUSPENDED` with a `status_expires_at` date, the `verify_token` middleware will auto-reactivate the user securely upon their first authenticated request after the expiration passes.
5. **Frontend UX**: Blocked clients intercept 403 API errors systematically, securely clearing their local Firebase session and redirecting the user to a dedicated visual view (`/bloqueado`) explaining their sanction, duration, and reasons.

Changes to a user's status are transparently appended to a `status_history` list containing precisely who made the modification, the assigned timestamp, the chosen reason (visible to the user), the `expires_at` date, and private `admin_notes`.

### Granting Admin Access (Firestore)

In the Firebase Console → Firestore → `usuarios` collection, find the user document and set:

```json
{
  "tipo": "admin"
}
```

Or use a script/backend endpoint if available.

---

## 📄 Recruiter Panel

The recruiter panel is accessible at `/recruiter` for users with `tipo: "recruiter"` or `tipo: "admin"` in Firestore.

```
/recruiter/cvs  → CV management dashboard
```

### Functionality

The CV management module allows recruiters to:

- **Upload CVs** — attach PDF/DOC/DOCX files along with candidate metadata (name, phone, email, seniority, tags, skills, residence zone, age, salary expectation)
- **Search & filter** — full-text search plus filters by status, seniority, salary expectation, interview result, and residence zone
- **View details** — inspect full candidate profiles including extracted CV text, skills, tags, and evaluation notes
- **Edit evaluations** — update status (`New` → `Contacted` → `Interviewed` → `Discarded`), salary expectation, interview results (Casa Rayuela), client interview notes, and internal notes
- **Download originals** — direct link to the stored CV file in Firebase Storage

### CV Data Model

Each CV record stores:

| Field | Type | Description |
|---|---|---|
| `candidate_name` | string | Full name |
| `email` | string (optional) | Contact email |
| `phone` | string | Contact phone |
| `seniority` | enum | `Trainee`, `Junior`, `Semi-Senior`, `Senior` |
| `tags` | string[] | Free-form labels (e.g. `remoto`, `part-time`) |
| `skills` | string[] | Technical skills (e.g. `React`, `Python`) |
| `status` | enum | `New`, `Contacted`, `Interviewed`, `Discarded` |
| `residence_zone` | string (optional) | Candidate's location |
| `age` | int (optional) | Candidate's age |
| `salary_expectation` | enum (optional) | `high`, `medium`, `low` |
| `casa_rayuela_interview_result` | enum (optional) | `excellent`, `intermediate`, `bad` |
| `client_interview_notes` | string (optional) | Notes from client interviews |
| `notes` | string | Internal recruiter notes |
| `source` | string | Where the CV came from (default: `Direct`) |

### Access Control

- **Frontend**: The route `/recruiter/*` is protected by a `RequireRecruiter` guard that allows only `admin` and `recruiter` roles.
- **Backend**: All `/cvs/*` endpoints use `require_role(["admin", "recruiter"])` to enforce authorization.
- Admin users see a "Back to user management" link in the recruiter sidebar for quick navigation.

### Granting Recruiter Access (Firestore)

In the Firebase Console → Firestore → `usuarios` collection, find the user document and set:

```json
{
  "tipo": "recruiter"
}
```

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
    │   ├── views/            ← Pages (auth, admin, recruiter, landing)
    │   ├── components/       ← Shared UI components (admin/, recruiter/)
    │   ├── services/         ← Axios API service layer (cvService, adminService...)
    │   ├── context/          ← Auth + User context
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
