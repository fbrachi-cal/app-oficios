import { createBrowserRouter } from "react-router-dom";
import Login from "../views/auth/Login";
import Registro from "../views/auth/Register";
import Landing from "../views/Landing";

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/auth/login", element: <Login /> },
  { path: "/auth/registro", element: <Registro /> }
]);
