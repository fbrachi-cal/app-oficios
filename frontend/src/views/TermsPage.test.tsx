// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import es from "../i18n/locales/es.json";
import App from "../App";
import Footer from "../components/Footers/Footer";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../context/UserContext", () => ({
  useUser: vi.fn(),
}));

describe("Public /terms Route and Footer Link", () => {
  beforeEach(async () => {
    cleanup();
    vi.clearAllMocks();
    await i18n.changeLanguage("es");

    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
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
  });

  it("renders the public /terms route for unauthenticated users without redirecting to login", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={["/terms"]}>
          <App />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByRole("heading", { level: 1, name: es.terminos_condiciones })).toBeDefined();
    expect(screen.getByText(/Bienvenido a Casa Click\./)).toBeDefined();
    expect(screen.getByText(es.comprendo_responsabilidad_casa_click)).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: es.ver_compromiso })).toBeDefined();
    expect(screen.getByText(/El Compromiso de Comunidad de Casa Click/)).toBeDefined();
  });

  it("renders a Terms and Conditions link to /terms in the public Footer", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </I18nextProvider>
    );

    const termsLink = screen.getByRole("link", { name: es.terminos_condiciones });
    expect(termsLink).toBeDefined();
    expect(termsLink.getAttribute("href")).toBe("/terms");
  });
});
