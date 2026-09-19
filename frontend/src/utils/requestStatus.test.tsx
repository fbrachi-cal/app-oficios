import { describe, it, expect } from "vitest";
import { getRequestStatusInfo } from "./requestStatus";

const dummyTranslate = (key: string, fallback?: string, options?: any) => {
  if (key === "confirmo_trabajo" && options?.nombre) {
    return `${options.nombre} confirmó el trabajo`;
  }
  return fallback || key;
};

describe("getRequestStatusInfo - Status derivation rules", () => {
  it("Scenario 1: 0 ratings/confirmations, no non-completion reason -> En curso", () => {
    const solicitud = {
      califico_cliente: false,
      califico_profesional: false,
      confirmo_realizacion_cliente: false,
      confirmo_realizacion_profesional: false,
      estado: "creada",
    };
    const info = getRequestStatusInfo(solicitud, dummyTranslate);
    expect(info.label).toBe("En curso");
    expect(info.isNonCompletion).toBe(false);
  });

  it("Scenario 2a: Only client confirmed -> {Nombre} confirmó el trabajo", () => {
    const solicitudWithClientConfirm = {
      solicitante_id: "client_1",
      profesional_id: "pro_1",
      solicitante_nombre: "Juan",
      confirmo_realizacion_cliente: true,
      confirmo_realizacion_profesional: false,
      estado: "verificada",
    };
    const info = getRequestStatusInfo(solicitudWithClientConfirm, dummyTranslate);
    expect(info.label).toBe("Juan confirmó el trabajo");
    expect(info.badgeClass).toContain("bg-blue-100");
    expect(info.isNonCompletion).toBe(false);
  });

  it("Scenario 2b: Only professional confirmed -> {Nombre} confirmó el trabajo", () => {
    const solicitudWithProConfirm = {
      solicitante_id: "client_1",
      profesional_id: "pro_1",
      profesional_nombre: "María",
      confirmo_realizacion_cliente: false,
      confirmo_realizacion_profesional: true,
      estado: "verificada",
    };
    const info = getRequestStatusInfo(solicitudWithProConfirm, dummyTranslate);
    expect(info.label).toBe("María confirmó el trabajo");
    expect(info.badgeClass).toContain("bg-blue-100");
    expect(info.isNonCompletion).toBe(false);
  });

  it("Scenario 3: Both participants confirmed -> Trabajo verificado", () => {
    const solicitudWithBothConfirm = {
      solicitante_id: "client_1",
      profesional_id: "pro_1",
      confirmo_realizacion_cliente: true,
      confirmo_realizacion_profesional: true,
      estado: "verificada",
    };
    const info = getRequestStatusInfo(solicitudWithBothConfirm, dummyTranslate);
    expect(info.label).toBe("Trabajo verificado");
    expect(info.badgeClass).toContain("bg-emerald-100");
    expect(info.isNonCompletion).toBe(false);
  });

  it("Scenario 4: Non-completion reason present -> that specific reason", () => {
    const solicitudWithReason = {
      califico_cliente: false,
      califico_profesional: false,
      estado: "cancelada",
      motivo_cancelacion: "no_llegamos_a_un_acuerdo",
    };

    const mockTranslate = (key: string, fallback?: string) => {
      if (key === "motivos_cancelacion.no_llegamos_a_un_acuerdo") return "No llegamos a un acuerdo";
      return fallback || key;
    };

    const info = getRequestStatusInfo(solicitudWithReason, mockTranslate);
    expect(info.label).toBe("No llegamos a un acuerdo");
    expect(info.isNonCompletion).toBe(true);
    expect(info.label).not.toBe("En curso");
    expect(info.label).not.toBe("Trabajo verificado");
  });
});

