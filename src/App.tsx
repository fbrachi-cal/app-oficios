import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './views/Home';
import Auth from "./layouts/Auth";
import Login from './views/auth/Login';
import UpdateProfile from './views/auth/UpdateProfile';
import Register from './views/auth/Register';
import CompletarPerfil from './views/auth/CompletarPerfil';
import Landing from './views/Landing';
import PerfilProfesional from './views/auth/PerfilProfesional';
import DetalleSolicitud from "./views/auth/DetalleSolicitud";
import LoadingScreen from './components/Screens/LoadingScreen';



function App() {
  return (
    <>
      <LoadingScreen />
      <Routes>
        {/* Ruta principal con layout Auth */}
        <Route path="/auth" element={<Auth />}>
          <Route path="login" element={<Login />} />
          <Route path="registro" element={<Register />} />
          <Route path="completar-perfil" element={<CompletarPerfil />} />
          <Route path="actualizar-perfil" element={<UpdateProfile />} />
          <Route path="profesionales/:id" element={<PerfilProfesional />} />
          <Route path="solicitudes/:id" element={<DetalleSolicitud />} />
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Route>

        {/* Ruta alternativa directa */}
        <Route path="/login" element={<Auth />}>
          <Route index element={<Login />} />
        </Route>

        <Route path="/landing" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/" element={<Landing />} />
      </Routes>

    </>
  );
}

export default App;
