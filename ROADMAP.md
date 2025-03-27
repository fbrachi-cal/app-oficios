# 🗺️ Roadmap del Backend - App de Oficios

Este documento resume las mejoras planificadas y sugerencias implementables para continuar desarrollando el backend de la aplicación.

---

## ✅ Implementado

- Registro de usuarios con UID de Firebase
- Validación de roles: cliente, profesional
- Seguridad con Firebase Auth (verify_token)
- Middleware de logging
- Calificaciones con control de rol
- Solicitudes con control de rol
- Búsqueda de profesionales por múltiples zonas y oficios
- Control de acceso por rol con `require_role`
- Rol de administrador (`admin`)

---

## 🛠️ Próximas mejoras sugeridas

### 🔐 1. Rol `"admin"`
- Ver todos los usuarios
- Eliminar calificaciones abusivas
- Ver actividad (eventualmente logs o métricas)

### 🧪 2. Testeo automatizado
- Pytest con mocks de Firebase
- Tests de servicios, validaciones de rol, y endpoints
- Cobertura de código

### 📄 3. Paginación y ordenamiento en búsquedas
- Endpoint `/profesionales/buscar`
- Agregar parámetros: `pagina`, `limite`, `orden_por`

### ⭐ 4. Rating promedio
- Calcular y almacenar el promedio de calificaciones por profesional
- Evita recalcular cada vez

### 📖 5. Historial por usuario
- Clientes: calificaciones dadas, solicitudes realizadas
- Profesionales: calificaciones recibidas

### 💬 6. Mensajería interna
- Conversación entre cliente y profesional posterior a aceptación de solicitud

### 🗓️ 7. Agenda de profesionales
- Definir días y horarios disponibles
- Permitir que el cliente reserve turnos

### 🔧 8. Entorno productivo
- `.env.production`
- Logging ajustado por entorno
- Configuración de CORS por dominio

### 🪵 9. Logs persistentes
- Guardar logs en archivo además de consola
- Archivos rotativos por día o por tamaño

---

## 🧠 Extras a considerar

- `require_roles(["admin", "cliente"])` para permitir múltiples roles
- Documentación automática con ejemplos
- Endpoint de salud (`/health`) para monitoreo
"""


