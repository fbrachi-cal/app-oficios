import { createBrowserRouter } from "react-router-dom";
import Login from "../views/Login";
import Registro from "../views/Registro";
import Landing from "../views/Landing";

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/auth/login", element: <Login /> },
  { path: "/auth/registro", element: <Registro /> }
]);
