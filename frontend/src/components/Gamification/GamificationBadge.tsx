import React from "react";
import { useTranslation } from "react-i18next";
import type { GamificationMeResponse } from "../../services/gamificationService";

interface GamificationBadgeProps {
  data: GamificationMeResponse;
}

/**
 * Compact badge shown on the user's profile page.
 * Displays current level, next level (if any), and numeric progress bars
 * for metrics that the API already provides (no frontend rule duplication).
 */
const GamificationBadge: React.FC<GamificationBadgeProps> = ({ data }) => {
  const { t } = useTranslation();
  const { current_level, next_level, progress } = data;

  if (!current_level) return null;

  return (
    <div
      className="w-full rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4 mb-4"
      role="region"
      aria-label={t("gamification.badge_aria_label")}
    >
      {/* Current level */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-lg font-bold shrink-0"
          aria-hidden="true"
        >
          {current_level.level_order}
        </span>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium leading-none mb-0.5">
            {t("gamification.current_level_label")}
          </p>
          <p className="text-base font-semibold text-slate-800 leading-tight">
            {current_level.name}
          </p>
        </div>
      </div>

      {/* Next level + progress */}
      {next_level && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-400 mb-2">
            {t("gamification.next_level_label")}{" "}
            <span className="font-medium text-slate-600">{next_level.name}</span>
          </p>

          {progress.length > 0 && (
            <ul className="space-y-2">
              {progress.map((item) => {
                const pct =
                  typeof item.current === "number" && item.required > 0
                    ? Math.min(100, Math.round((item.current / item.required) * 100))
                    : item.met
                    ? 100
                    : 0;

                return (
                  <li key={item.metric}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-slate-500">
                        {t(`gamification.metric.${item.metric}`, { defaultValue: item.metric })}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {typeof item.current === "number"
                          ? `${item.current} / ${item.required}`
                          : item.met
                          ? "✓"
                          : "—"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5" role="progressbar"
                      aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          item.met ? "bg-green-500" : "bg-blue-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {!next_level && (
        <p className="text-xs text-green-600 font-medium mt-1">
          {t("gamification.max_level_reached")}
        </p>
      )}
    </div>
  );
};

export default GamificationBadge;
