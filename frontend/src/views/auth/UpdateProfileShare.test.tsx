// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UpdateProfile from "./UpdateProfile";
import { useUser } from "../../context/UserContext";
import { useGamification } from "../../hooks/useGamification";
import { useCategorias } from "../../hooks/useCategorias";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        recomendar_la_app: "Recomendar CasaClick",
        titulo: "Casa Click",
        compartir_app_texto: "Encontrá profesionales para tu casa en CasaClick 🏠",
        compartir_app_exito: "Enlace copiado al portapapeles",
        compartir_app_error: "Error al copiar el enlace",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("../../context/UserContext", () => ({
  useUser: vi.fn(),
}));

vi.mock("../../hooks/useGamification", () => ({
  useGamification: vi.fn(),
}));

vi.mock("../../hooks/useCategorias", () => ({
  useCategorias: vi.fn(),
}));

vi.mock("@capacitor/share", () => ({
  Share: {
    share: vi.fn(),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

// Mock fetch for zonas endpoint in UpdateProfile
globalThis.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve(["Palermo", "Belgrano"]),
} as any);

describe("UpdateProfile - Recomendar CasaClick Native Share Flow", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();

    vi.mocked(useUser).mockReturnValue({
      user: {
        id: "user123",
        nombre: "Test User",
        tipo: "cliente",
        zonas: [],
        descripcion: "",
        disponibilidad: "",
      },
      setUser: vi.fn(),
      refrescarUsuario: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
    });

    vi.mocked(useGamification).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
      dismissPendingEvent: vi.fn(),
    });

    vi.mocked(useCategorias).mockReturnValue({
      categorias: [],
      loading: false,
      error: null,
    });
  });

  it("should open native Capacitor share sheet when running on native mobile platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Share.share).mockResolvedValue({ activityType: "whatsapp" } as any);

    render(
      <MemoryRouter>
        <UpdateProfile />
      </MemoryRouter>
    );

    const shareButton = screen.getByRole("button", { name: /Recomendar CasaClick/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith({
        title: "Casa Click",
        text: "Encontrá profesionales para tu casa en CasaClick 🏠",
        url: "https://casaclick.app",
        dialogTitle: "Recomendar CasaClick",
      });
    });
  });

  it("should handle native share sheet cancellation gracefully without errors or success notifications", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Share.share).mockRejectedValue(new Error("Share canceled"));

    render(
      <MemoryRouter>
        <UpdateProfile />
      </MemoryRouter>
    );

    const shareButton = screen.getByRole("button", { name: /Recomendar CasaClick/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalled();
    });

    expect(screen.queryByText(/Enlace copiado al portapapeles/i)).toBeNull();
  });

  it("should use Web Share API fallback on web browsers supporting navigator.share", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const mockWebShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockWebShare,
      configurable: true,
      writable: true,
    });

    render(
      <MemoryRouter>
        <UpdateProfile />
      </MemoryRouter>
    );

    const shareButton = screen.getByRole("button", { name: /Recomendar CasaClick/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockWebShare).toHaveBeenCalledWith({
        title: "Casa Click",
        text: "Encontrá profesionales para tu casa en CasaClick 🏠",
        url: "https://casaclick.app",
      });
    });
  });

  it("should copy message + URL to clipboard as fallback when native share and Web Share API are unavailable", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      configurable: true,
      writable: true,
    });

    render(
      <MemoryRouter>
        <UpdateProfile />
      </MemoryRouter>
    );

    const shareButton = screen.getByRole("button", { name: /Recomendar CasaClick/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        "Encontrá profesionales para tu casa en CasaClick 🏠 https://casaclick.app"
      );
      expect(screen.getByText("Enlace copiado al portapapeles")).toBeDefined();
    });
  });
});
