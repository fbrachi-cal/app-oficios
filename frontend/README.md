# 🖥️ App de Oficios — Frontend

SPA (Single Page Application) del marketplace de servicios **App de Oficios**. Permite a clientes buscar y contratar profesionales, gestionar solicitudes, chatear y calificar. Incluye un **panel de administración** completo y un **panel de recruiter** para gestión de CVs.

Desarrollado con **React + TypeScript + Vite** sobre **Tailwind CSS**.

---

## 📋 Índice

1. [Descripción](#-descripción)
2. [Tech Stack](#-tech-stack)
3. [Roles de usuario](#-roles-de-usuario)
4. [Prerrequisitos](#-prerrequisitos)
5. [Variables de entorno](#-variables-de-entorno)
6. [Cómo correr el proyecto](#-cómo-correr-el-proyecto)
7. [Conexión con el backend](#-conexión-con-el-backend)
8. [Módulo de administración](#-módulo-de-administración)
9. [Módulo de recruiter](#-módulo-de-recruiter)
10. [Estructura del proyecto](#-estructura-del-proyecto)

---

## 📌 Descripción

El frontend es una SPA que maneja toda la experiencia de usuario:

- Registro e inicio de sesión con **Firebase Auth** (email, Google)
- Búsqueda y visualización de profesionales
- Creación y gestión de solicitudes de servicio
- **Chat en tiempo real** via Firestore
- Sistema de **calificaciones**
- **Panel de administración** con gestión de usuarios, chats, reportes y calificaciones
- **Panel de recruiter** con gestión de CVs de candidatos
- Soporte completo de **internacionalización** (español / inglés)

---

## 🧰 Tech Stack

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19 | Framework UI |
| TypeScript | 5.7 | Tipado estático |
| Vite | 6 | Bundler y servidor de desarrollo |
| Tailwind CSS | 3 | Estilos utilitarios |
| Firebase SDK | 11 | Auth del lado cliente + Firestore (chat) |
| react-icons | 5 | Componentes de íconos (FI set) |
| react-i18next | 15 | i18n (es/en) |
| react-router-dom | 7 | Ruteo del lado cliente |
| Axios | 1.9 | Cliente HTTP para el backend |

---

## 👥 Roles de usuario

| Rol | Permisos |
|---|---|
| **cliente** | Buscar profesionales, crear solicitudes, calificar, chatear |
| **profesional** | Recibir solicitudes, aceptar/rechazar, calificar clientes, chatear |
| **recruiter** | Subir, buscar, filtrar y gestionar CVs de candidatos |
| **admin** | Todo lo anterior + panel de administración completo |

El rol se define en el documento del usuario en Firestore (`tipo: "cliente"` / `"profesional"` / `"recruiter"` / `"admin"`).

---

## ✅ Prerrequisitos

### Node.js (v20+ recomendado)

```bash
# Verificar
node --version
```

Descarga: https://nodejs.org/en

---

### PNPM (recomendado) o NPM

```bash
# Instalar pnpm globalmente
npm install -g pnpm

# Verificar
pnpm --version
```

---

### Firebase

Necesitás las credenciales del **Web SDK** de tu proyecto Firebase:

1. Ir a https://console.firebase.google.com
2. Seleccionar tu proyecto → **Configuración del proyecto → Tus apps**
3. Si no hay una app web creada, crear una (sin Firebase Hosting)
4. Copiar el objeto `firebaseConfig` — sus valores van al `.env`

---

## 🔑 Variables de entorno

Copiar el archivo de ejemplo:

```bash
cp .env.example .env
```

Completar con los valores de tu proyecto Firebase y la URL del backend:

```env
# Firebase Web SDK (de la consola de Firebase → Configuración → Tu app web)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# URL base del backend (sin barra al final)
VITE_API_BASE_URL=http://localhost:8000
```

> ⚠️ Las variables de Vite deben comenzar con `VITE_` para ser accesibles en el cliente.

> ⚠️ **Nunca** cometer el `.env` real al repositorio. Está en `.gitignore`.

---

## 🚀 Cómo correr el proyecto

```bash
# 1. Instalar dependencias
pnpm install
# o: npm install

# 2. Configurar .env (ver sección anterior)

# 3. Levantar servidor de desarrollo
pnpm dev
# o: npm run dev
```

La app estará disponible en: `http://localhost:5173`

---

### Otros comandos útiles

```bash
# Build de producción
pnpm build

# Preview del build
pnpm preview

# Lint
pnpm lint
```

---

## 🔗 Conexión con el backend

El frontend se comunica con el backend REST via **Axios** con autenticación Firebase incluida.

En `src/services/axiosInstance.ts` (o equivalente), cada request incluye automáticamente el token del usuario activo:

```ts
// El interceptor agrega el header en cada llamada autenticada
headers: { Authorization: `Bearer ${token}` }
```

La URL base del backend se configura via `VITE_API_BASE_URL` en el `.env`.

**Requisito:** El backend debe estar corriendo en `http://localhost:8000` (o la URL configurada) antes de usar la app.

---

## 🛡️ Módulo de administración

El panel de administración está disponible en `/admin` para usuarios con `tipo: "admin"`.

### Acceso

1. Loguearse con una cuenta que tenga `tipo: "admin"` en Firestore
2. Navegar a `http://localhost:5173/admin`

Para otorgar rol admin, editá el documento del usuario en Firestore y seteá `tipo: "admin"`.

### Secciones disponibles

| Ruta | Descripción |
|---|---|
| `/admin/usuarios` | Gestión de usuarios (ver, editar rol, deshabilitar) |
| `/admin/chats` | Moderación de chats (vista de solo lectura) |
| `/admin/reportes` | Resolución de reportes de usuarios |
| `/admin/calificaciones` | **CRUD completo de calificaciones** |

### Gestión de calificaciones (`/admin/calificaciones`)

Esta sección permite a los administradores:

- **Listar** todas las calificaciones con paginación por cursor
- **Filtrar** por estado: Todas / Activas / Eliminadas
- **Crear** calificaciones manualmente (especificando calificador, calificado y puntuación)
- **Editar** calificaciones existentes (puntuación y observación)
- **Eliminar** calificaciones con **soft delete** (se marca `deleted_at`, no se borra físicamente)

#### Reglas de negocio en el panel

- Una calificación eliminada **no puede editarse** — el botón de edición se deshabilita y muestra badge rojo `Eliminada`
- El **soft delete es idempotente**: llamar DELETE múltiples veces es seguro
- Al editar o eliminar, las **estadísticas del usuario** (`promedioCalificacion`, `cantidadCalificaciones`) se recalculan **atómicamente** via transacciones de Firestore
- Las calificaciones eliminadas quedan **completamente ocultas** en todas las vistas de usuarios normales

#### Restricción de acceso

La ruta `/admin/*` está protegida por un guard `RequireAdmin` que verifica el rol en tiempo real. Cualquier usuario sin rol `admin` es redirigido automáticamente.

---

## 📄 Módulo de recruiter

El panel de recruiter está disponible en `/recruiter` para usuarios con `tipo: "recruiter"` o `tipo: "admin"`.

### Acceso

1. Loguearse con una cuenta que tenga `tipo: "recruiter"` (o `"admin"`) en Firestore
2. Navegar a `http://localhost:5173/recruiter`

Para otorgar rol recruiter, editá el documento del usuario en Firestore y seteá `tipo: "recruiter"`.

### Secciones disponibles

| Ruta | Descripción |
|---|---|
| `/recruiter/cvs` | Dashboard de gestión de CVs |

### Funcionalidades del dashboard de CVs

- **Subir CVs** — formulario modal con campos de candidato (nombre, teléfono, email, seniority, tags, skills, zona, edad, expectativa salarial) y archivo adjunto (PDF, DOC, DOCX)
- **Buscar y filtrar** — búsqueda full-text + filtros por estado, expectativa salarial, resultado de entrevista CR y zona de residencia
- **Ver detalle** — modal con información completa del candidato, skills, tags y evaluación
- **Editar evaluación** — actualizar estado (`New` → `Contacted` → `Interviewed` → `Discarded`), expectativa salarial, resultado de entrevista, notas internas y notas de entrevista con cliente
- **Descargar CV** — enlace directo al archivo almacenado en Firebase Storage

### Restricción de acceso

La ruta `/recruiter/*` está protegida por un guard `RequireRecruiter` que permite únicamente los roles `admin` y `recruiter`. Cualquier usuario sin alguno de estos roles es redirigido automáticamente a `/home`.

Los usuarios admin ven un enlace "Volver a gestión de usuarios" en el sidebar del recruiter para navegar rápidamente al panel de administración.

---

## 📁 Estructura del proyecto

```
src/
├── views/
│   ├── auth/           ← Vistas de usuarios autenticados (solicitudes, perfil, chat)
│   ├── admin/          ← Panel de administración (UsersPage, ChatsPage, RatingsPage...)
│   ├── recruiter/      ← Panel de recruiter (CvDashboard)
│   └── landing/        ← Página pública
│
├── components/
│   ├── admin/          ← AdminSidebar, layout del panel admin
│   ├── recruiter/      ← RecruiterSidebar, CvUploadModal, CvDetailModal
│   ├── Navbars/        ← Navbar principal
│   ├── Modal/          ← Modales reutilizables
│   └── ...
│
├── services/
│   ├── adminService.ts ← Llamadas a /admin/* del backend
│   ├── cvService.ts    ← Llamadas a /cvs/* del backend (upload, list, update)
│   ├── userService.ts  ← Llamadas a /usuarios/*
│   └── ...
│
├── context/
│   └── AuthContext.tsx ← Estado global de autenticación Firebase
│
├── i18n/
│   └── locales/
│       ├── es.json     ← Traducciones en español
│       └── en.json     ← Traducciones en inglés
│
└── App.tsx             ← Árbol de rutas principal
```

---

## 📬 Contacto

Creado por **Federico**. Desarrollado con asistencia de IA. 💡