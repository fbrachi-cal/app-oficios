import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import TopNav from "../components/Navigation/TopNav";
import BottomTabBar from "../components/Navigation/BottomTabBar";
import { BuscadorProvider } from "../context/BuscadorContext";
import { useGamification } from "../hooks/useGamification";
import { useUser } from "../context/UserContext";
import LevelUpModal from "../components/Gamification/LevelUpModal";
import { FiAlertCircle } from "react-icons/fi";

/**
 * AppShell — authenticated consumer layout.
 *
 * Renders the shared navigation (TopNav + BottomTabBar) and provides
 * a content area for child routes via <Outlet />.
 *
 * The pb-20 md:pb-0 padding ensures content is never hidden behind
 * the mobile bottom tab bar (64px = h-16).
 *
 * Gamification: the LevelUpModal is mounted here so it fires on any
 * consumer route without coupling to a specific view.
 */
const AppShell: React.FC = () => {
  const { data, dismissPendingEvent } = useGamification();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const pendingEvent = data?.pending_event ?? null;

  const needsCoverageSetup =
    user?.tipo === "profesional" &&
    (user.requires_coverage_setup || !user.cobertura_ids || user.cobertura_ids.length === 0);

  const isOnProfileSetup =
    location.pathname === "/perfil" || location.pathname === "/completar-perfil";

  return (
    <BuscadorProvider>
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <TopNav />

        {/* Main content — offset for the fixed top nav */}
        <main className="flex-1 pt-20 pb-20 md:pb-6">
          {needsCoverageSetup && !isOnProfileSetup && (
            <div className="container mx-auto px-4 pt-4">
              <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <FiAlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div className="text-sm">
                    <span className="font-bold block">Configurá tus zonas de cobertura</span>
                    <span>
                      Para aparecer en las búsquedas de clientes y recibir solicitudes, seleccioná los barrios, comunas o partidos donde trabajás.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/perfil")}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase px-4 py-2.5 rounded-lg shrink-0 transition-colors"
                >
                  Configurar zonas
                </button>
              </div>
            </div>
          )}
          <Outlet />
        </main>

        <BottomTabBar />

        {/* Level-up celebration — only rendered when a pending event exists */}
        {pendingEvent && (
          <LevelUpModal
            event={pendingEvent}
            onClose={dismissPendingEvent}
          />
        )}
      </div>
    </BuscadorProvider>
  );
};

export default AppShell;

