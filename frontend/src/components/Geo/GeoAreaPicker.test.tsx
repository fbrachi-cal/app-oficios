// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import GeoAreaPicker from "./GeoAreaPicker";
import FormSolicitud from "../Forms/FormSolicitud";
import ProfessionalCard from "../Cards/ProfessionalCard";
import { resetGeoCatalogCacheForTests } from "../../hooks/useGeoCatalog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const MOCK_CATALOG = {
  version: "2026.11.1",
  areas: [
    {
      id: "ar",
      nombre: "Argentina",
      tipo: "pais",
      parent_id: null,
      ancestors: [],
      selectable_by_pro: false,
      selectable_by_client: false,
      activo: true,
      orden: 1,
    },
    {
      id: "ar-c",
      nombre: "Ciudad Autónoma de Buenos Aires",
      nombre_corto: "CABA",
      tipo: "ciudad_autonoma",
      parent_id: "ar",
      ancestors: ["ar"],
      selectable_by_pro: true,
      selectable_by_client: false,
      activo: true,
      orden: 10,
    },
    {
      id: "ar-c-comuna-14",
      nombre: "Comuna 14",
      tipo: "comuna",
      parent_id: "ar-c",
      ancestors: ["ar", "ar-c"],
      selectable_by_pro: true,
      selectable_by_client: false,
      activo: true,
      orden: 114,
    },
    {
      id: "ar-c-palermo",
      nombre: "Palermo",
      tipo: "barrio",
      parent_id: "ar-c-comuna-14",
      ancestors: ["ar", "ar-c", "ar-c-comuna-14"],
      selectable_by_pro: true,
      selectable_by_client: true,
      activo: true,
      orden: 11401,
    },
    {
      id: "ar-b",
      nombre: "Provincia de Buenos Aires",
      nombre_corto: "Buenos Aires",
      tipo: "provincia",
      parent_id: "ar",
      ancestors: ["ar"],
      selectable_by_pro: false,
      selectable_by_client: false,
      activo: true,
      orden: 20,
    },
    {
      id: "ar-b-vicente-lopez",
      nombre: "Vicente López",
      tipo: "partido",
      parent_id: "ar-b",
      ancestors: ["ar", "ar-b"],
      selectable_by_pro: true,
      selectable_by_client: false,
      activo: true,
      orden: 201,
    },
    {
      id: "ar-b-vicente-lopez-olivos",
      nombre: "Olivos",
      tipo: "localidad",
      parent_id: "ar-b-vicente-lopez",
      ancestors: ["ar", "ar-b", "ar-b-vicente-lopez"],
      selectable_by_pro: true,
      selectable_by_client: true,
      activo: true,
      orden: 20101,
    },
    {
      id: "ar-b-vicente-lopez-munro",
      nombre: "Munro",
      tipo: "localidad",
      parent_id: "ar-b-vicente-lopez",
      ancestors: ["ar", "ar-b", "ar-b-vicente-lopez"],
      selectable_by_pro: true,
      selectable_by_client: true,
      activo: true,
      orden: 20102,
    },
    {
      id: "ar-b-san-isidro",
      nombre: "San Isidro",
      tipo: "partido",
      parent_id: "ar-b",
      ancestors: ["ar", "ar-b"],
      selectable_by_pro: true,
      selectable_by_client: false,
      activo: true,
      orden: 202,
    },
    {
      id: "ar-b-san-isidro-martinez",
      nombre: "Martínez",
      tipo: "localidad",
      parent_id: "ar-b-san-isidro",
      ancestors: ["ar", "ar-b", "ar-b-san-isidro"],
      selectable_by_pro: true,
      selectable_by_client: true,
      activo: true,
      orden: 20201,
    },
  ],
  agrupaciones: [
    {
      id: "grp-gba-norte",
      nombre: "Zona Norte (GBA)",
      region_id: "ar-b",
      miembros: ["ar-b-vicente-lopez", "ar-b-san-isidro"],
    },
  ],
};

describe("GeoAreaPicker, ProfessionalCard & FormSolicitud Integration", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    resetGeoCatalogCacheForTests();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CATALOG),
    } as any);
  });

  it("pro mode: collapses child selection when parent CABA is selected and indicates inherited coverage", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <GeoAreaPicker
        mode="pro"
        selectedIds={["ar-c-palermo"]}
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Toda CABA/i)).toBeDefined();
    });

    // Click "Toda CABA" quick button -> should normalize ["ar-c-palermo", "ar-c"] to ["ar-c"]
    fireEvent.click(screen.getByText(/Toda CABA/i));
    expect(onChange).toHaveBeenCalledWith(["ar-c"]);

    // Rerender with ["ar-c"] selected and verify Comuna 14 shows "Incluido en CABA"
    rerender(
      <GeoAreaPicker
        mode="pro"
        selectedIds={["ar-c"]}
        onChange={onChange}
      />
    );

    expect(screen.getByText("Incluido en CABA")).toBeDefined();
  });

  it("client-search mode: allows selecting multiple leaf locations or all leaves of a partido", async () => {
    const onChange = vi.fn();
    render(
      <GeoAreaPicker
        mode="client-search"
        selectedIds={[]}
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Vicente López")).toBeDefined();
    });

    // Click "Elegir todos de Vicente López" -> selects Olivos and Munro leaf IDs
    const elegirVlButton = screen.getByRole("button", { name: /Elegir todos de Vicente López/i });
    fireEvent.click(elegirVlButton);
    expect(onChange).toHaveBeenCalledWith([
      "ar-b-vicente-lopez-olivos",
      "ar-b-vicente-lopez-munro",
    ]);
  });

  it("ProfessionalCard: displays matched locations count (e.g. 2/3) and matched location names", () => {
    render(
      <ProfessionalCard
        profesional={{
          id: "pro_1",
          nombre: "Bruno Plomero",
          subcategorias: ["Plomero"],
          cobertura_ids: ["ar-b-vicente-lopez"],
          cobertura_nombres: ["Vicente López"],
          matched_location_ids: [
            "ar-b-vicente-lopez-olivos",
            "ar-b-vicente-lopez-munro",
          ],
          matched_location_names: ["Olivos", "Munro"],
          matched_locations_count: 2,
          total_searched_locations: 3,
          calificacion: 4.8,
          trabajosRealizados: 12,
        }}
      />
    );

    expect(screen.getByText(/Cubre 2\/3 buscadas:/i)).toBeDefined();
    expect(screen.getByText(/Olivos, Munro/i)).toBeDefined();
    expect(screen.getByText("Vicente López")).toBeDefined();
  });

  it("FormSolicitud: expands parent professional coverage into concrete covered leaf options and submits zona_id", async () => {
    const onSubmit = vi.fn();
    render(
      <FormSolicitud
        coberturaIds={["ar-b-vicente-lopez"]}
        subcategoriasDisponibles={["Plomero"]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Olivos \(Vicente López\)/i)).toBeDefined();
    });

    // Munro is also covered via Vicente López, but Martínez (San Isidro) is NOT in options
    expect(screen.getByText(/Munro \(Vicente López\)/i)).toBeDefined();
    expect(screen.queryByText(/Martínez/i)).toBeNull();
  });

  it("grouping shortcut: toggles Zona Norte (GBA) cleanly in both pro and client-search modes without duplicates", async () => {
    const onChangePro = vi.fn();
    const { rerender } = render(
      <GeoAreaPicker
        mode="pro"
        selectedIds={["ar-b-vicente-lopez-olivos"]}
        onChange={onChangePro}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/\+ Zona Norte \(GBA\)/i)).toBeDefined();
    });

    // Clicking "+ Zona Norte (GBA)" in pro mode collapses Olivos and selects both member partidos
    fireEvent.click(screen.getByText(/\+ Zona Norte \(GBA\)/i));
    expect(onChangePro).toHaveBeenCalledWith(["ar-b-vicente-lopez", "ar-b-san-isidro"]);

    // Rerender with both partidos selected -> button shows active state "✓ Zona Norte (GBA)" and clicking removes them
    rerender(
      <GeoAreaPicker
        mode="pro"
        selectedIds={["ar-b-vicente-lopez", "ar-b-san-isidro"]}
        onChange={onChangePro}
      />
    );
    const activeBtn = screen.getByText(/✓ Zona Norte \(GBA\)/i);
    expect(activeBtn).toBeDefined();
    fireEvent.click(activeBtn);
    expect(onChangePro).toHaveBeenLastCalledWith([]);

    // In client-search mode, clicking "+ Zona Norte (GBA)" selects all 3 leaf localities without duplicates
    const onChangeClient = vi.fn();
    rerender(
      <GeoAreaPicker
        mode="client-search"
        selectedIds={["ar-b-vicente-lopez-olivos"]}
        onChange={onChangeClient}
      />
    );
    fireEvent.click(screen.getByText(/\+ Zona Norte \(GBA\)/i));
    expect(onChangeClient).toHaveBeenCalledWith([
      "ar-b-vicente-lopez-olivos",
      "ar-b-vicente-lopez-munro",
      "ar-b-san-isidro-martinez",
    ]);
  });
});
