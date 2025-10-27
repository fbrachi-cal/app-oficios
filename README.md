bajar versión de node: 
npm use 20
mejor instalar pnpm
npm run dev

# 📦 App de Oficios — Frontend

Este proyecto es el frontend de la App de Oficios, construido con **React + Vite + TailwindCSS + PNPM** y autenticación integrada con **Firebase**.

---

## 🚀 Requisitos Previos

- Node.js 18 o superior
- PNPM (`npm install -g pnpm`)
- Cuenta de Firebase (con configuración ya exportada)
- Archivo `.env` con las credenciales necesarias

---

## 🛠️ Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/tuusuario/tu-repo-app-oficios.git
cd tu-repo-app-oficios
```

2. Instalar dependencias:

```bash
pnpm install
```

3. Crear el archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Y completar los valores, por ejemplo:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

---

## 🔍 Desarrollo Local

Ejecutá la app en modo desarrollo:

```bash
pnpm dev --host 0.0.0.0
```

Esto permitirá acceder desde otras máquinas en tu red local (útil si estás en WSL).

---

## 🧪 Tests

(Si aplicara — podés agregar más tarde si usás Vitest o Jest.)

---

## 🌐 Producción

Para generar una versión lista para deploy:

```bash
pnpm build
```

Esto generará la carpeta `/dist`.

---

## 📁 Estructura del Proyecto

```
src/
├── components/       → Componentes reutilizables
├── pages/            → Vistas principales
├── services/         → Comunicación con Firebase / backend
├── hooks/            → Hooks personalizados
├── i18n/             → Traducciones (es.json / en.json)
└── App.tsx           → Componente raíz
```

---

## 🔒 Autenticación

El login se gestiona con **Firebase Authentication** (email/contraseña y teléfono), usando la librería de Firebase JS SDK v9 (modular).