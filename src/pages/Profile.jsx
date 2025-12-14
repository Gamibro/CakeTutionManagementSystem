import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Avatar from "../components/common/Avatar";
import { getUserBasicInfo } from "../services/userService";
import StudentQRPass from "../components/attendance/StudentQRPass";

// Simple inline SVG icons (no external deps)
const Icon = ({ name, className = "w-5 h-5" }) => {
  switch (name) {
    case "user":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.5 20.25a8.25 8.25 0 1115 0v.75H4.5v-.75z"
          />
        </svg>
      );
    case "mail":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21.75 7.5v9a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 16.5v-9A2.25 2.25 0 014.5 5.25h15A2.25 2.25 0 0121.75 7.5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7.5l8.25 5.25L19.5 7.5"
          />
        </svg>
      );
    case "badge":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7.5 4.5h9a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0116.5 19.5h-9A2.25 2.25 0 015.25 17.25V6.75A2.25 2.25 0 017.5 4.5z"
          />
        </svg>
      );
    case "phone":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.25 6.75A2.25 2.25 0 014.5 4.5h3a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 12v0c0 4.556 3.694 8.25 8.25 8.25v0a2.25 2.25 0 002.25-2.25v-1.5A2.25 2.25 0 0012.75 14.25H11.25A2.25 2.25 0 019 12v0"
          />
        </svg>
      );
    case "school":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 3l8.25 4.5L12 12 3.75 7.5 12 3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3.75 12L12 16.5 20.25 12"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 12v9"
          />
        </svg>
      );
    case "download":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
          />
        </svg>
      );
    default:
      return null;
  }
};

const Profile = () => {
  const { user } = useAuth();

  const role = user?.userType || user?.role || "student";
  const [fetchedUserData, setFetchedUserData] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [userDataError, setUserDataError] = useState("");

  const displayRole =
    role === "admin"
      ? "Administrator"
      : role === "teacher"
      ? "Teacher"
      : "Student";

  const toTitleCase = (value) =>
    String(value || "")
      .trim()
      .replace(
        /\w\S*/g,
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      );

  const email =
    fetchedUserData?.Email ||
    fetchedUserData?.email ||
    user?.email ||
    user?.Email ||
    user?.username ||
    "-";
  const emailLocal = email && email !== "-" ? String(email).split("@")[0] : "";

  const apiFullNameRaw =
    fetchedUserData?.FullName ??
    fetchedUserData?.fullName ??
    fetchedUserData?.Name ??
    fetchedUserData?.name ??
    "";
  const apiFullName = String(apiFullNameRaw || "").trim();

  const fallbackNameFromProfile = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ");
  const fallbackFullName = (
    fallbackNameFromProfile ||
    user?.fullName ||
    user?.name ||
    ""
  ).trim();

  const baseFullName = (
    apiFullName ||
    fallbackFullName ||
    emailLocal ||
    user?.username ||
    user?.userName ||
    ""
  ).trim();

  const normalizedFullName = baseFullName
    ? apiFullName
      ? apiFullName
      : toTitleCase(baseFullName)
    : "";

  const displayName = normalizedFullName || "User";
  const phone =
    fetchedUserData?.Phone ??
    fetchedUserData?.phone ??
    fetchedUserData?.ContactNumber ??
    fetchedUserData?.contactNumber ??
    user?.phone ??
    user?.PhoneNumber ??
    user?.phoneNumber ??
    user?.mobile ??
    "-";

  const fields = (() => {
    const base = [
      {
        key: "Full Name",
        value: normalizedFullName || "-",
        icon: "user",
      },
      { key: "Email", value: email || "-", icon: "mail" },
    ];

    if (role === "admin") {
      return [
        ...base,
        { key: "Role", value: "Administrator", icon: "badge" },
        {
          key: "Department",
          value: user?.department || "Administration",
          icon: "school",
        },
      ];
    }

    if (role === "teacher") {
      return [...base, { key: "Role", value: "Teacher", icon: "badge" }];
    }

    return [...base, { key: "Role", value: "Student", icon: "badge" }];
  })();

  useEffect(() => {
    let cancelled = false;

    const fetchUserData = async () => {
      const userId =
        user?.UserID ??
        user?.userID ??
        user?.userId ??
        user?.id ??
        user?.Id ??
        user?.StudentID ??
        user?.studentID ??
        user?.studentId ??
        null;

      if (!userId) {
        console.warn("No user ID available to fetch user data");
        return;
      }

      try {
        setIsLoadingUserData(true);
        setUserDataError("");

        const userData = await getUserBasicInfo(userId);

        if (!cancelled) {
          setFetchedUserData(userData);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        if (!cancelled) {
          setUserDataError(error.message || "Failed to load user information");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUserData(false);
        }
      }
    };

    fetchUserData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/10 py-8 sm:py-8 px-3 sm:px-4 lg:px-8 font-sans">
      {/* soft blobs */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-24 -left-24 h-64 w-64 sm:h-72 sm:w-72 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/30" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 sm:h-80 sm:w-80 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/30" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-gray-800 via-blue-700 to-indigo-600 dark:from-white dark:via-blue-200 dark:to-indigo-300 bg-clip-text text-transparent mb-2">
            Profile
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Manage your account information and access credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Left Column - Profile Card & QR */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-5">
            {/* Profile Card */}
            <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 dark:border-gray-800/70 p-5 sm:p-6 text-center">
              <div className="flex justify-center mb-4 sm:mb-5">
                <div className="relative inline-block">
                  <Avatar
                    key={`avatar-${user?.UserID || user?.id}-${
                      user?.ProfilePictureVersion ||
                      user?.profilePictureVersion ||
                      ""
                    }`}
                    name={displayName}
                    user={user}
                    src={user?.ProfilePicture || user?.profilePicture}
                    size="xl"
                    className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-white/80 dark:ring-gray-800/80 shadow-2xl bg-gradient-to-br from-blue-500 to-indigo-600"
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] sm:text-[12px] font-semibold px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
                    {displayRole}
                  </div>
                </div>
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-1 truncate">
                {displayName}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 break-all">
                {email}
              </p>
              {isLoadingUserData && (
                <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-300 mb-2">
                  Refreshing profile details...
                </p>
              )}
              {userDataError && (
                <p className="text-[11px] sm:text-xs text-red-600 dark:text-red-400 mb-2">
                  {userDataError}
                </p>
              )}

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-3 sm:p-4 border border-blue-100 dark:border-blue-800/40">
                <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                  <Icon name="badge" className="w-4 h-4" />
                  <span className="tracking-[0.14em] uppercase">
                    Account Status
                  </span>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Active
                </span>
              </div>
            </div>

            {/* QR Code Section (use centralized student attendance QR) */}
            {role === "student" && (
              <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 dark:border-gray-800/70 p-5 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 text-center">
                  Student QR Code
                </h3>
                <StudentQRPass
                  showTitle={false}
                  className="bg-transparent dark:bg-transparent shadow-none p-0 space-y-3"
                />
              </div>
            )}
          </div>

          {/* Right Column - Information */}
          <div className="lg:col-span-3">
            <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 dark:border-gray-800/70 p-5 sm:p-6 md:p-7 h-full">
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <div className="p-2.5 bg-blue-100/80 dark:bg-blue-900/40 rounded-xl">
                  <Icon
                    name="user"
                    className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    Personal Information
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                    Basic account details linked to your profile.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {fields.map((field, index) => (
                  <div
                    key={field.key}
                    className="group bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-900/10 rounded-2xl p-4 sm:p-5 border border-gray-100/70 dark:border-gray-800/70 hover:border-blue-200 dark:hover:border-blue-700/70 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                        <Icon
                          name={field.icon}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.12em] mb-1">
                          {field.key}
                        </h4>
                        <p className="text-xs sm:text-base font-medium text-gray-900 dark:text-white break-words">
                          {String(field.value)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Info Section */}
              <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-200/80 dark:border-gray-800/80">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl p-4 sm:p-5 border border-green-100/80 dark:border-green-800/60">
                    <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5">
                      <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        Account Security
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Your account is secured with industry-standard encryption
                      and regular security updates.
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/10 rounded-2xl p-4 sm:p-5 border border-purple-100/80 dark:border-purple-800/60">
                    <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        Last Updated
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Profile information is synchronized in real-time across
                      all your devices.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
