import React from "react";
import { Outlet } from "react-router-dom";
import TopNav from "../components/Navigation/TopNav";
import BottomTabBar from "../components/Navigation/BottomTabBar";
import { BuscadorProvider } from "../context/BuscadorContext";
import { useGamification } from "../hooks/useGamification";
import LevelUpModal from "../components/Gamification/LevelUpModal";

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
  const pendingEvent = data?.pending_event ?? null;

  return (
    <BuscadorProvider>
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <TopNav />

        {/* Main content — offset for the fixed top nav */}
        <main className="flex-1 pt-20 pb-20 md:pb-6">
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

