import { describe, it, expect } from "vitest";
import { getRequestStatusInfo } from "./requestStatus";

const dummyTranslate = (key: string, fallback?: string) => fallback || key;

describe("getRequestStatusInfo - Status derivation rules", () => {
  it("Scenario 1: 0 ratings, no non-completion reason -> En curso", () => {
    const solicitud = {
      califico_cliente: false,
      califico_profesional: false,
      estado: "creada",
    };
    const info = getRequestStatusInfo(solicitud, dummyTranslate);
    expect(info.label).toBe("En curso");
    expect(info.isNonCompletion).toBe(false);
  });

  it("Scenario 2: 1 rating -> Trabajo realizado", () => {
    const solicitudWithClientRating = {
      califico_cliente: true,
      califico_profesional: false,
      estado: "creada",
    };
    const info1 = getRequestStatusInfo(solicitudWithClientRating, dummyTranslate);
    expect(info1.label).toBe("Trabajo realizado");
    expect(info1.isNonCompletion).toBe(false);

    const solicitudWithProRating = {
      califico_cliente: false,
      califico_profesional: true,
      estado: "creada",
    };
    const info2 = getRequestStatusInfo(solicitudWithProRating, dummyTranslate);
    expect(info2.label).toBe("Trabajo realizado");
    expect(info2.isNonCompletion).toBe(false);
  });

  it("Scenario 3: 2 ratings -> Trabajo verificado", () => {
    const solicitudWithBothRatings = {
      califico_cliente: true,
      califico_profesional: true,
      estado: "creada",
    };
    const info = getRequestStatusInfo(solicitudWithBothRatings, dummyTranslate);
    expect(info.label).toBe("Trabajo verificado");
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
    expect(info.label).not.toBe("Trabajo realizado");
    expect(info.label).not.toBe("Trabajo verificado");
  });
});
