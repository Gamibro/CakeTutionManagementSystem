import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Modal from "./Modal";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminNavigation = [
    { name: "Dashboard", href: "/admin", icon: "home" },
    { name: "Courses", href: "/admin/courses", icon: "book" },
    // {
    //   name: "Classes",
    //   href: "/admin/subjects",
    //   icon: "document-text",
    //   matchPaths: ["/admin/subjects", "/subjects"],
    // },
    { name: "Class Schedule", href: "/admin/class-schedule", icon: "calendar" },
    { name: "Users", href: "/admin/users", icon: "users" },
    { name: "Settings", href: "/admin/settings", icon: "cog" },
  ];

  const teacherNavigation = [
    { name: "Dashboard", href: "/teacher", icon: "home" },
    { name: "Courses", href: "/teacher/courses", icon: "book" },
    // {
    //   name: "Classes",
    //   href: "/teacher/subjects",
    //   icon: "document-text",
    //   // also match the shared class view so that when user opens /subjects/:id
    //   // the teacher "Classes" tab is highlighted
    //   matchPaths: ["/teacher/subjects", "/subjects"],
    // },
    {
      name: "Class Schedule",
      href: "/teacher/class-schedule",
      icon: "calendar",
    },
    { name: "Attendance", href: "/teacher/attendance", icon: "check-circle" },
    { name: "Materials", href: "/teacher/materials", icon: "document-text" },
    { name: "Students", href: "/teacher/students", icon: "users" },
    { name: "Notices", href: "/teacher/notices", icon: "document-text" },
    // { name: "Complaints", href: "/teacher/complaints", icon: "chat" },
  ];

  const studentNavigation = [
    { name: "Dashboard", href: "/student", icon: "home" },
    { name: "Courses", href: "/student/courses", icon: "book" },
    { name: "Attendance", href: "/student/attendance", icon: "check-circle" },
    { name: "Materials", href: "/student/materials", icon: "document-text" },
    // { name: "Complaints", href: "/student/complaints", icon: "chat" },
    {
      name: "Class Schedule",
      href: "/student/class-schedule",
      icon: "calendar",
    },
  ];

  const navigation =
    user?.userType === "admin"
      ? adminNavigation
      : user?.userType === "teacher"
      ? teacherNavigation
      : studentNavigation;

  const indicatorVariant =
    user?.userType === "teacher"
      ? "nav-indicator-teacher"
      : user?.userType === "admin"
      ? "nav-indicator-admin"
      : "nav-indicator-student";

  // collapse the mobile drawer when navigation changes so content stays visible
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleNavigate = (href) => {
    setMobileOpen(false);
    navigate(href);
  };

  // Choose a single best navigation item to mark active. We pick the
  // most-specific match (longest href) whose href equals or prefixes the
  // current pathname. This prevents the dashboard (/admin) parent item from
  // being highlighted when a more-specific child route (e.g. /admin/users)
  // should be active.
  const activeNavItem = (() => {
    if (!navigation || !navigation.length) return null;
    const path = location.pathname || "";
    let best = null;
    for (const item of navigation) {
      // allow items to declare multiple match paths (e.g. shared /subjects)
      const candidates = item.matchPaths || [item.href || ""];
      for (const href of candidates) {
        if (!href) continue;
        if (path === href || (href !== "/" && path.startsWith(href))) {
          if (!best || href.length > (best.matchHrefLength || 0)) {
            // store the matched href length so we can compare specificity
            best = { ...item, matchHrefLength: href.length };
          }
        }
      }
    }
    // strip helper property before returning
    if (best && best.matchHrefLength !== undefined) {
      const { matchHrefLength, ...rest } = best;
      return rest;
    }
    return best;
  })();

  const getIcon = (iconName) => {
    switch (iconName) {
      case "home":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        );
      case "book":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        );
      case "users":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        );
      case "cog":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        );
      case "check-circle":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "document-text":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "calendar":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case "chat":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.88L3 20l1.076-3.223A7.966 7.966 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        );
      case "profile":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.121 17.804A9 9 0 1118.879 6.196 9 9 0 015.12 17.804zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        );
      case "logout":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={`md:hidden fixed top-3 left-3 z-50 inline-flex items-center justify-center p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow ${
          mobileOpen ? "hidden" : ""
        }`}
        aria-label="Open sidebar"
        aria-expanded={mobileOpen}
      >
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
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/30"
            aria-label="Close sidebar"
          />
          <div className="relative h-full w-full sm:w-72 md:w-80 flex flex-col rounded-none sm:rounded-r-xl overflow-hidden bg-white dark:bg-gray-900 shadow-xl glass-surface admin-bg transform transition-transform duration-300 ease-out translate-x-0">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Navigation
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close sidebar"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex h-full flex-col overflow-y-auto safe-area-b">
              <nav className="flex-1 px-3 py-4 space-y-2">
                {navigation.map((item) => {
                  const isActive =
                    activeNavItem && activeNavItem.href === item.href;
                  const classes = `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-base hover-lift space-x-3 ${
                    isActive
                      ? "bg-white/30 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100"
                      : "text-gray-700 hover:bg-white/10 dark:text-gray-300 dark:hover:bg-gray-700/40"
                  }`;

                  return (
                    <div key={item.name} className="flex items-center">
                      {isActive ? (
                        <div
                          className={`nav-indicator ${indicatorVariant}`}
                          aria-hidden
                        />
                      ) : (
                        <div className="w-1 mr-3" />
                      )}

                      <button
                        type="button"
                        onClick={() => handleNavigate(item.href)}
                        className={classes}
                      >
                        <span className="mr-2 icon-pop text-xl text-indigo-500/90">
                          {getIcon(item.icon)}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </button>
                    </div>
                  );
                })}
              </nav>
              {user?.userType && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      navigate("/profile", {
                        state: { backgroundLocation: location },
                      });
                    }}
                    className="group w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                  >
                    <span className="mr-3">{getIcon("profile")}</span>
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      setShowLogout(true);
                    }}
                    className="group w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-700/60"
                  >
                    <span className="mr-3">{getIcon("logout")}</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop static sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-56 sm:w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 h-screen md:h-[100dvh]">
          <div className="h-0 flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive =
                  activeNavItem && activeNavItem.href === item.href;

                const classes = `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-base hover-lift ${
                  isActive
                    ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                }`;

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleNavigate(item.href)}
                    className={classes}
                  >
                    <span className="mr-3">{getIcon(item.icon)}</span>
                    {item.name}
                  </button>
                );
              })}
            </nav>
            {user?.userType && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-2 py-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  User
                </div>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/profile", {
                        state: { backgroundLocation: location },
                      })
                    }
                    className="group w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                  >
                    <span className="mr-3">{getIcon("profile")}</span>
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogout(true)}
                    className="group w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                  >
                    <span className="mr-3">{getIcon("logout")}</span>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Logout confirmation modal */}
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
    </>
  );
};

export default Sidebar;
