import { Outlet } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

const StudentLayout = () => {
  return (
    <div className="relative flex flex-col md:flex-row min-h-[100dvh] md:h-[100dvh] w-full md:overflow-hidden student-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col md:overflow-hidden min-w-0">
        <Navbar />
        <main className="flex-1 min-h-0 w-full overflow-visible md:overflow-y-auto scrollbar-hide p-4 sm:p-5 md:p-6 page-enter overscroll-contain">
          <div className="max-w-7xl w-full mx-auto p-4 sm:p-5 md:p-6 animated-card soft-shadow-md rounded-lg bg-white/60 dark:bg-gray-800/50">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
