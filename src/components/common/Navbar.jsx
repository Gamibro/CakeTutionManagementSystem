import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import Avatar from "./Avatar";
import Dropdown from "./Dropdown";
import Modal from "./Modal";
const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);

  // derive display name for avatar (falls back to email local part / username)
  const rawName = (
    user?.name ||
    user?.fullName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    ""
  ).trim();
  const email = user?.email || user?.Email || user?.username || "-";
  const emailLocal = email && email !== "-" ? String(email).split("@")[0] : "";
  const fullName = (
    rawName ||
    emailLocal ||
    user?.username ||
    user?.userName ||
    ""
  ).trim();
  const capitalize = (s) =>
    String(s || "")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const displayName = capitalize(fullName) || "User";

  const userNavigation = [
    {
      name: "Your Profile",
      onClick: () =>
        navigate("/profile", { state: { backgroundLocation: location } }),
    },
  ];

  // show Settings only for admin users
  if (user?.userType === "admin") {
    userNavigation.push({
      name: "Settings",
      onClick: () =>
        navigate(user?.userType === "admin" ? "/admin/settings" : "/profile"),
    });
  }

  userNavigation.push({ name: "Sign out", onClick: () => setShowLogout(true) });
  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm glass-surface drop-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 min-h-[4rem] md:h-16 md:flex-nowrap">
          <div className="flex items-center ml-12 md:ml-0 min-w-0">
            <Link
              to="/"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              Sweet of K Cakes
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
            >
              {theme === "dark" ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
            <Dropdown
              button={
                <div className="flex items-center space-x-2">
                  <span className="hidden sm:inline-block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {displayName}
                  </span>
                  <Avatar name={displayName} size="sm" user={user} />
                </div>
              }
              items={userNavigation}
            />
            <Modal
              isOpen={showLogout}
              onClose={() => setShowLogout(false)}
              title="Confirm logout"
            >
              <div className="space-y-4">
                <p>Are you sure you want to sign out?</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowLogout(false)}
                    className="px-3 py-2 rounded bg-gray-200 text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLogout(false);
                      logout();
                      navigate("/login");
                    }}
                    className="px-3 py-2 rounded bg-red-600 text-white"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
