import { Routes, Route } from 'react-router-dom';
import Home from './views/Home';
import Login from './views/Login';
import Registro from './views/Registro';
import Navbar from './components/Navbar';
import CompletarPerfil from './views/CompletarPerfil';


function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/completar-perfil" element={<CompletarPerfil />} />
      </Routes>
    </>
  );
}

export default App;
