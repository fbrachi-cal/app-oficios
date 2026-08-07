import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireVerifiedPhone from "./RequireVerifiedPhone";
import { useAuth } from "../context/AuthContext";

// Mock useAuth
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("RequireVerifiedPhone Guard", () => {
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
});
