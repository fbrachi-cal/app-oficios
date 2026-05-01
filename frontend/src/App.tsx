import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './views/Home';
import Auth from "./layouts/Auth";
import AdminLayout from "./layouts/Admin";
import Login from './views/auth/Login';
import UpdateProfile from './views/auth/UpdateProfile';
import Register from './views/auth/Register';
import CompletarPerfil from './views/auth/CompletarPerfil';
import Landing from './views/Landing';
import PerfilProfesional from './views/auth/PerfilProfesional';
import DetalleSolicitud from "./views/auth/DetalleSolicitud";
import LoadingScreen from './components/Screens/LoadingScreen';
import RequireAdmin from './utils/RequireAdmin';
import UsersPage from './views/admin/UsersPage';
import ChatsPage from './views/admin/ChatsPage';
import ReportsPage from './views/admin/ReportsPage';
import RatingsPage from './views/admin/RatingsPage';
import SolicitudesInteraccionesPage from './views/admin/SolicitudesInteraccionesPage';
import BlockedPage from './views/BlockedPage';
import RequireRecruiter from './utils/RequireRecruiter';
import RecruiterLayout from './layouts/Recruiter';
import CvDashboard from './views/recruiter/CvDashboard';
import RequireAcceptedTerms from './utils/RequireAcceptedTerms';
import TermsAndConditionsPage from './views/auth/TermsAndConditionsPage';


function App() {
  return (
    <>
      <LoadingScreen />
      <Routes>
        {/* Ruta principal con layout Auth */}
        <Route path="/auth" element={<Auth />}>
          <Route path="login" element={<Login />} />
          <Route path="registro" element={<Register />} />
          
          <Route element={<RequireAcceptedTerms />}>
            <Route path="completar-perfil" element={<CompletarPerfil />} />
            <Route path="actualizar-perfil" element={<UpdateProfile />} />
            <Route path="profesionales/:id" element={<PerfilProfesional />} />
            <Route path="solicitudes/:id" element={<DetalleSolicitud />} />
          </Route>

          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Route>

        {/* Ruta alternativa directa */}
        <Route path="/login" element={<Auth />}>
          <Route index element={<Login />} />
        </Route>

        <Route path="/landing" element={<Landing />} />
        <Route path="/" element={<Landing />} />
        <Route path="/bloqueado" element={<BlockedPage />} />
        <Route path="/terminos-y-condiciones" element={<TermsAndConditionsPage />} />

        {/* Rutas protegidas por T&C */}
        <Route element={<RequireAcceptedTerms />}>
          <Route path="/home" element={<Home />} />

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
        </Route>
      </Routes>

    </>
  );
}

export default App;
