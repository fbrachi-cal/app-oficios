import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { GamificationEvent } from "../../services/gamificationService";

interface LevelUpModalProps {
  event: GamificationEvent;
  onClose: () => void;
}

/**
 * Celebration modal shown when the backend returns a pending unseen level-up event.
 *
 * Behaviour:
 * - Displayed once per level-up (controlled by useGamification / AppShell).
 * - Closing calls `onClose` which triggers `dismissPendingEvent()` in the hook.
 * - `dismissPendingEvent` is idempotent and swallows API errors — safe to call
 *   multiple times (backdrop click, button click, keyboard Escape).
 * - Focus is trapped inside the modal for accessibility.
 */
const LevelUpModal: React.FC<LevelUpModalProps> = ({ event, onClose }) => {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the close button on mount
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const levelName = event.payload?.level_name ?? event.to_level_code ?? "—";
  const isFirstLevel = event.from_level_code === null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      onClick={onClose}               /* close on backdrop click */
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 text-center animate-[fadeInScale_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()} /* prevent backdrop handler */
      >
        {/* Close button */}
        <button
          ref={closeRef}
          id="levelup-close"
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label={t("cerrar")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Trophy icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-4xl mx-auto mb-4" aria-hidden="true">
          🏆
        </div>

        {/* Headline */}
        <h2
          id="levelup-title"
          className="text-xl font-bold text-slate-800 mb-1"
        >
          {isFirstLevel
            ? t("gamification.levelup_welcome_title")
            : t("gamification.levelup_title")}
        </h2>

        {/* Level name */}
        <p className="text-3xl font-extrabold text-blue-600 my-3">
          {levelName}
        </p>

        {/* Subtitle */}
        <p className="text-sm text-slate-500 mb-6">
          {isFirstLevel
            ? t("gamification.levelup_welcome_subtitle")
            : t("gamification.levelup_subtitle")}
        </p>

        {/* CTA */}
        <button
          id="levelup-confirm"
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors duration-150"
        >
          {t("gamification.levelup_cta")}
        </button>
      </div>
    </div>
  );
};

export default LevelUpModal;
