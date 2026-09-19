import React from "react";

export interface StatusInfo {
  label: string;
  badgeClass: string;
  isNonCompletion: boolean;
}

export interface StatusOptions {
  currentUser?: any;
  otroUsuario?: any;
  clientName?: string;
  proName?: string;
}

export function getRequestStatusInfo(solicitud: any, t: any, options?: StatusOptions): StatusInfo {
  if (!solicitud) {
    return { label: "", badgeClass: "", isNonCompletion: false };
  }

  // 1. Work reported as not completed (reason present or cancelled state)
  const motivo = solicitud.motivo_cancelacion || solicitud.motivo;
  const lowerState = (solicitud.estado || "").toLowerCase();
  const isCancelledState = ["cancelada", "rechazada"].includes(lowerState);

  if (motivo) {
    const translatedReason =
      t(`motivos_cancelacion.${motivo}`, "") ||
      t(motivo, "") ||
      t(`motivo_${motivo}`, "") ||
      motivo;

    return {
      label: translatedReason,
      badgeClass: "bg-rose-100 text-rose-800 border border-rose-200 rounded-full font-semibold",
      isNonCompletion: true,
    };
  }

  if (isCancelledState) {
    return {
      label: t("estado.cancelada", "Cancelada"),
      badgeClass: "bg-rose-100 text-rose-800 border border-rose-200 rounded-full font-semibold",
      isNonCompletion: true,
    };
  }

  // 2. Derive participant confirmation states
  const clientConfirmed = Boolean(
    solicitud.confirmo_realizacion_cliente ||
    (solicitud.verificado_por && solicitud.verificado_por === solicitud.solicitante_id)
  );

  const proConfirmed = Boolean(
    solicitud.confirmo_realizacion_profesional ||
    (solicitud.verificado_por && solicitud.verificado_por === solicitud.profesional_id)
  );

  // 3. Both confirmed
  if (clientConfirmed && proConfirmed) {
    return {
      label: t("estado.verificada", "Trabajo verificado"),
      badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-semibold",
      isNonCompletion: false,
    };
  }

  // Helper to resolve client name
  const getClientName = (): string => {
    if (options?.clientName) return options.clientName;
    if (solicitud.solicitante_nombre) return solicitud.solicitante_nombre;
    if (solicitud.cliente_nombre) return solicitud.cliente_nombre;
    if (options?.currentUser && (options.currentUser.id === solicitud.solicitante_id || options.currentUser.tipo === "cliente")) {
      return options.currentUser.nombre;
    }
    if (options?.otroUsuario && options.otroUsuario.id === solicitud.solicitante_id) {
      return options.otroUsuario.nombre;
    }
    return t("cliente", "El cliente");
  };

  // Helper to resolve pro name
  const getProName = (): string => {
    if (options?.proName) return options.proName;
    if (solicitud.profesional_nombre) return solicitud.profesional_nombre;
    if (options?.currentUser && (options.currentUser.id === solicitud.profesional_id || options.currentUser.tipo === "profesional")) {
      return options.currentUser.nombre;
    }
    if (options?.otroUsuario && options.otroUsuario.id === solicitud.profesional_id) {
      return options.otroUsuario.nombre;
    }
    return t("profesional", "El profesional");
  };

  // 4. Only client confirmed
  if (clientConfirmed && !proConfirmed) {
    const name = getClientName();
    const labelText = t("confirmo_trabajo", "{{nombre}} confirmó el trabajo", { nombre: name });
    return {
      label: labelText,
      badgeClass: "bg-blue-100 text-blue-800 border border-blue-200 rounded-full font-semibold",
      isNonCompletion: false,
    };
  }

  // 5. Only professional confirmed
  if (proConfirmed && !clientConfirmed) {
    const name = getProName();
    const labelText = t("confirmo_trabajo", "{{nombre}} confirmó el trabajo", { nombre: name });
    return {
      label: labelText,
      badgeClass: "bg-blue-100 text-blue-800 border border-blue-200 rounded-full font-semibold",
      isNonCompletion: false,
    };
  }

  // 6. Legacy fallback for verified state if flags missing
  if (lowerState === "verificada") {
    return {
      label: t("estado.verificada", "Trabajo verificado"),
      badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-semibold",
      isNonCompletion: false,
    };
  }

  // 7. Neither confirmed -> En curso
  return {
    label: t("en_curso", "En curso"),
    badgeClass: "bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-semibold",
    isNonCompletion: false,
  };
}

export function getStatusBadge(solicitud: any, t: any, extraClasses: string = "text-xs px-2.5 py-1", options?: StatusOptions) {
  const { label, badgeClass } = getRequestStatusInfo(solicitud, t, options);
  return <span className={`badge ${extraClasses} ${badgeClass}`}>{label}</span>;
}

