import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './views/Home';
import Auth from "./layouts/Auth";
import Login from './views/auth/Login';
import Perfil from './views/auth/Perfil';
import Register from './views/auth/Register';
import CompletarPerfil from './views/auth/CompletarPerfil';
import Landing from './views/Landing';


function App() {
  return (
    <>
      <Routes>
  {/* Ruta principal con layout Auth */}
  <Route path="/auth" element={<Auth />}>
    <Route path="login" element={<Login />} />
    <Route path="registro" element={<Register />} />
    <Route path="completar-perfil" element={<CompletarPerfil />} />
    <Route path="perfil" element={<Perfil />} />
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
