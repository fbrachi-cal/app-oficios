import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireVerifiedPhone from "./RequireVerifiedPhone";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";

// Mock useAuth
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock useUser
vi.mock("../context/UserContext", () => ({
  useUser: vi.fn(),
}));

describe("RequireVerifiedPhone Guard", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(useUser).mockReturnValue({
      user: { id: "123", nombre: "Test User", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });
  });

  it("should show nothing (null) when auth is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
      tipo: null,
      loading: true,
      setUsuario: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/buscar"]}>
        <Routes>
          <Route element={<RequireVerifiedPhone />}>
            <Route path="/buscar" element={<div>Buscar Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it("should redirect to /auth/login when user is unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
      tipo: null,
      loading: false,
      setUsuario: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/buscar"]}>
        <Routes>
          <Route element={<RequireVerifiedPhone />}>
            <Route path="/buscar" element={<div>Buscar Page</div>} />
          </Route>
          <Route path="/auth/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login Page")).toBeDefined();
  });

  it("should redirect to /auth/verificar-telefono when user is authenticated but has no phone", () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "123", email: "test@example.com" }, // no phoneNumber
      tipo: "cliente",
      loading: false,
      setUsuario: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/buscar"]}>
        <Routes>
          <Route element={<RequireVerifiedPhone />}>
            <Route path="/buscar" element={<div>Buscar Page</div>} />
            <Route path="/auth/verificar-telefono" element={<div>Phone Verification Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Phone Verification Page")).toBeDefined();
  });

  it("should render Outlet when user has verified phone", () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "123", email: "test@example.com", phoneNumber: "+5491112345678" },
      tipo: "cliente",
      loading: false,
      setUsuario: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/buscar"]}>
        <Routes>
          <Route element={<RequireVerifiedPhone />}>
            <Route path="/buscar" element={<div>Buscar Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Buscar Page")).toBeDefined();
  });

  it("should redirect verified user away from /auth/verificar-telefono to /", () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "123", email: "test@example.com", phoneNumber: "+5491112345678" },
      tipo: "cliente",
      loading: false,
      setUsuario: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/auth/verificar-telefono"]}>
        <Routes>
          <Route element={<RequireVerifiedPhone />}>
            <Route path="/auth/verificar-telefono" element={<div>Phone Verification Page</div>} />
          </Route>
          <Route path="/" element={<div>Home Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Home Landing Page")).toBeDefined();
  });

  it("should show nothing (null) when profile is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "123", email: "test@example.com" },
      tipo: "cliente",
      loading: false,
      setUsuario: vi.fn(),
    });

    vi.mocked(useUser).mockReturnValue({
      user: null,
      setUser: vi.fn(),
      profileStatus: "loading",
      profileLoading: true,
      refrescarUsuario: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/buscar"]}>
        <Routes>
          <Route element={<RequireVerifiedPhone />}>
            <Route path="/buscar" element={<div>Buscar Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it("should redirect verified user from /auth/verificar-telefono to /completar-perfil if profile status is missing", () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "123", email: "test@example.com", phoneNumber: "+5491112345678" },
      tipo: null,
      loading: false,
      setUsuario: vi.fn(),
    });

    vi.mocked(useUser).mockReturnValue({
      user: null,
      setUser: vi.fn(),
      profileStatus: "missing",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/auth/verificar-telefono"]}>
        <Routes>
          <Route element={<RequireVerifiedPhone />}>
            <Route path="/auth/verificar-telefono" element={<div>Phone Verification Page</div>} />
          </Route>
          <Route path="/completar-perfil" element={<div>Completar Perfil Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Completar Perfil Page")).toBeDefined();
  });

  it("should redirect verified user from /auth/verificar-telefono to / if profile status is ready", () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "123", email: "test@example.com", phoneNumber: "+5491112345678" },
      tipo: "cliente",
      loading: false,
      setUsuario: vi.fn(),
    });

    vi.mocked(useUser).mockReturnValue({
      user: { id: "123", nombre: "Test User", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/auth/verificar-telefono"]}>
        <Routes>
          <Route element={<RequireVerifiedPhone />}>
            <Route path="/auth/verificar-telefono" element={<div>Phone Verification Page</div>} />
          </Route>
          <Route path="/" element={<div>Home Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Home Landing Page")).toBeDefined();
  });
});
