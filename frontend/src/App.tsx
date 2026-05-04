import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './views/Home';
import Auth from "./layouts/Auth";
import AdminLayout from "./layouts/Admin";
import Login from './views/auth/Login';
import UpdateProfile from './views/auth/UpdateProfile';
import Register from './views/auth/Register';
import CompletarPerfil from './views/auth/CompletarPerfil';
import Landing from './views/Landing';
import AppShell from './layouts/AppShell';
import BuscarView from './views/BuscarView';
import ActividadView from './views/ActividadView';
import PerfilProfesional from './views/auth/PerfilProfesional';
import DetalleSolicitud from "./views/auth/DetalleSolicitud";
import LoadingScreen from './components/Screens/LoadingScreen';
import UsersPage from './views/admin/UsersPage';
import RequireAdmin from './utils/RequireAdmin';
import ChatsPage from './views/admin/ChatsPage';
import ReportsPage from './views/admin/ReportsPage';
import RatingsPage from './views/admin/RatingsPage';
import SolicitudesInteraccionesPage from './views/admin/SolicitudesInteraccionesPage';
import BlockedPage from './views/BlockedPage';
import RequireRecruiter from './utils/RequireRecruiter';
import RecruiterLayout from './layouts/Recruiter';
import CvDashboard from './views/recruiter/CvDashboard';


function App() {
  return (
    <>
      <LoadingScreen />
      <Routes>
        {/* Public Routes */}
        <Route path="/auth">
          <Route path="login" element={<Login />} />
          <Route path="registro" element={<Register />} />
        </Route>

        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/registro" element={<Navigate to="/auth/registro" replace />} />

        <Route path="/landing" element={<Landing />} />
        <Route path="/home" element={<Navigate to="/buscar" replace />} />
        <Route path="/" element={<Landing />} />
        <Route path="/bloqueado" element={<BlockedPage />} />

        {/* Consumer authenticated routes with AppShell (TopNav/BottomTabBar) */}
        <Route element={<AppShell />}>
          <Route path="/buscar" element={<BuscarView />} />
          <Route path="/actividad" element={<ActividadView />} />
          <Route path="/perfil" element={<UpdateProfile />} />
          <Route path="/completar-perfil" element={<CompletarPerfil />} />
          <Route path="/profesional/:id" element={<PerfilProfesional />} />
          <Route path="/solicitud/:id" element={<DetalleSolicitud />} />
        </Route>

        {/* Admin panel — protected by role guard */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="usuarios" replace />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="chats" element={<ChatsPage />} />
            <Route path="reportes" element={<ReportsPage />} />
            <Route path="calificaciones" element={<RatingsPage />} />
            <Route path="solicitudes-interacciones" element={<SolicitudesInteraccionesPage />} />
          </Route>
        </Route>

        {/* Recruiter panel — protected by recruiter + admin role guard */}
        <Route element={<RequireRecruiter />}>
          <Route path="/recruiter" element={<RecruiterLayout />}>
            <Route index element={<Navigate to="cvs" replace />} />
            <Route path="cvs" element={<CvDashboard />} />
          </Route>
        </Route>
      </Routes>

    </>
  );
}

export default App;
