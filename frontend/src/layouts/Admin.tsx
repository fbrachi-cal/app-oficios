/**
 * Admin layout shell.
 * Reuses the existing AuthNavbar (top bar with user dropdown + language switcher).
 * Implements the 3-column structure as required:
 *   [Sidebar] [Main Content (Outlet)] [Right panel (reserved)]
 */
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbars/AuthNavbar";
import AdminSidebar from "../components/admin/AdminSidebar";

const Admin = () => {
  return (
    <>
      {/* Top bar — reuses the existing navbar */}
      <Navbar />

      {/* Page body — starts below the absolute-positioned navbar */}
      <div className="flex min-h-screen pt-24">
        {/* Left column: admin sidebar */}
        <AdminSidebar />

        {/* Center column: page content */}
        <main className="flex-1 bg-blueGray-100 p-6 overflow-y-auto">
          <Outlet />
        </main>

        {/* Right column: reserved for future quick-stats / contextual panels */}
        <aside className="hidden xl:flex w-64 bg-white border-l border-blueGray-200 p-4 flex-col gap-4">
          <div className="text-xs font-bold uppercase tracking-widest text-blueGray-400 mb-2">
            Panel Admin
          </div>
          <p className="text-xs text-blueGray-400">
            Seleccioná una sección del menú para comenzar.
          </p>
        </aside>
      </div>
    </>
  );
};

export default Admin;
