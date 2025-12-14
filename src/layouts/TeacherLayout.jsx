import { Outlet } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

const TeacherLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden admin-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar />
        <main className="flex-1 min-h-0 w-full overflow-y-auto scrollbar-hide p-4 md:p-6 page-enter overscroll-contain">
          <div className="max-w-7xl mx-auto p-4 md:p-6 animated-card soft-shadow-md rounded-lg bg-white/60 dark:bg-gray-800/50">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
