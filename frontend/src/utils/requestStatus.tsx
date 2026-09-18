import React from "react";

export interface StatusInfo {
  label: string;
  badgeClass: string;
  isNonCompletion: boolean;
}

export function getRequestStatusInfo(solicitud: any, t: any): StatusInfo {
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

  // 2. Count ratings submitted
  const ratingCount =
    (solicitud.califico_cliente ? 1 : 0) +
    (solicitud.califico_profesional ? 1 : 0);

  // Both client and professional submitted a rating
  if (ratingCount >= 2 || lowerState === "verificada") {
    return {
      label: t("estado.verificada", "Trabajo verificado"),
      badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-semibold",
      isNonCompletion: false,
    };
  }

  // Exactly one of the two submitted a rating
  if (ratingCount === 1) {
    return {
      label: t("trabajo_realizado", "Trabajo realizado"),
      badgeClass: "bg-blue-100 text-blue-800 border border-blue-200 rounded-full font-semibold",
      isNonCompletion: false,
    };
  }

  // Neither side submitted a rating (0 ratings, no non-completion reason)
  return {
    label: t("en_curso", "En curso"),
    badgeClass: "bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-semibold",
    isNonCompletion: false,
  };
}

export function getStatusBadge(solicitud: any, t: any, extraClasses: string = "text-xs px-2.5 py-1") {
  const { label, badgeClass } = getRequestStatusInfo(solicitud, t);
  return <span className={`badge ${extraClasses} ${badgeClass}`}>{label}</span>;
}
