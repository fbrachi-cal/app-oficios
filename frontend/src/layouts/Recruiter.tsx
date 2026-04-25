/**
 * Recruiter layout shell.
 */
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbars/AuthNavbar";
import RecruiterSidebar from "../components/recruiter/RecruiterSidebar";

const RecruiterLayout = () => {
  return (
    <>
      {/* Top bar — reuses the existing navbar */}
      <Navbar />

      {/* Page body — starts below the absolute-positioned navbar */}
      <div className="flex min-h-screen pt-24">
        {/* Left column: recruiter sidebar */}
        <RecruiterSidebar />

        {/* Center column: page content */}
        <main className="flex-1 bg-blueGray-100 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default RecruiterLayout;
