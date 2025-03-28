import { createBrowserRouter } from "react-router-dom";
import Login from "../views/Login";
import Registro from "../views/Registro";
import Home from "../views/Home";

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/login", element: <Login /> },
  { path: "/registro", element: <Registro /> }
]);
