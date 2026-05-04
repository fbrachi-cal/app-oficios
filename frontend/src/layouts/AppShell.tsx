import React from "react";
import { Outlet } from "react-router-dom";
import TopNav from "../components/Navigation/TopNav";
import BottomTabBar from "../components/Navigation/BottomTabBar";

/**
 * AppShell — authenticated consumer layout.
 *
 * Renders the shared navigation (TopNav + BottomTabBar) and provides
 * a content area for child routes via <Outlet />.
 *
 * The pb-20 md:pb-0 padding ensures content is never hidden behind
 * the mobile bottom tab bar (64px = h-16).
 */
const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopNav />

      {/* Main content — offset for the fixed top nav */}
      <main className="flex-1 pt-20 pb-20 md:pb-6">
        <Outlet />
      </main>

      <BottomTabBar />
    </div>
  );
};

export default AppShell;
