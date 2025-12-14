// UserList.js
import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import Avatar from "../common/Avatar";

const UserList = ({
  users,
  onAddStudent,
  onEdit,
  onActivate,
  onDeactivate,
  allowManage = true,
  getDetailsPath,
}) => {
  if (users.length === 0) {
    return (
      <EmptyState
        title="No users found"
        description="There are currently no users in the system."
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell"
              >
                Role
              </th>
              {/* Identifier column removed per request */}
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => {
              const defaultId =
                user.UserID || user.userID || user.userId || user.id || null;
              const actionId =
                defaultId ||
                user.StudentID ||
                user.studentID ||
                user.studentId ||
                null;
              const rawId = defaultId ?? actionId ?? null;
              // determine prefix by role
              const rawType = String(
                user.UserTypeID ??
                  user.userTypeID ??
                  user.UserType ??
                  user.userType ??
                  ""
              ).trim();
              let rolePrefix = "";
              if (rawType === "1" || rawType.toLowerCase() === "admin") {
                rolePrefix = "A";
              } else if (
                rawType === "2" ||
                rawType.toLowerCase() === "teacher"
              ) {
                rolePrefix = "T";
              } else if (
                rawType === "3" ||
                rawType.toLowerCase() === "student"
              ) {
                rolePrefix = "S";
              }
              const displayedId = rawId ? `${rolePrefix}${rawId}` : "-";
              const detailPath = getDetailsPath
                ? getDetailsPath(user)
                : defaultId
                ? `/admin/users/${defaultId}`
                : null;

              const fullName = `${user.FirstName || user.firstName || ""} ${
                user.LastName || user.lastName || ""
              }`.trim();

              const isStudent = rolePrefix === "S";

              return (
                <tr
                  key={user.UserID || user.id || user.email}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-4 py-4 whitespace-nowrap align-top text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-mono text-sm">{displayedId}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-top">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Avatar name={fullName} size="sm" user={user} />
                      </div>
                      <div className="ml-3">
                        {detailPath ? (
                          <Link
                            to={detailPath}
                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 truncate block"
                            title={fullName}
                          >
                            {fullName}
                          </Link>
                        ) : (
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {fullName}
                          </div>
                        )}
                        {/* Email shown in its own column; removed duplicate here */}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-top text-sm text-gray-700 dark:text-gray-300">
                    {user.Email || user.email}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-top text-sm text-gray-700 dark:text-gray-300 hidden md:table-cell">
                    {getUserTypeText(user.UserTypeID || user.userTypeID)}
                  </td>
                  {/* Identifier column removed per request */}
                  <td className="px-4 py-4 whitespace-nowrap align-top text-right text-sm font-medium">
                    <div className="inline-flex items-center gap-2">
                      {allowManage && (() => {
                        const isActive = Boolean(user.IsActive ?? user.isActive ?? true);
                        return (
                          <>
                            {allowManage && isStudent && (
                              <button
                                onClick={() => {
                                  if (onAddStudent) {
                                    try {
                                      onAddStudent(actionId ?? undefined, { mode: "add" });
                                    } catch (e) {
                                      // ignore
                                    }
                                  } else {
                                    onEdit && actionId && onEdit(actionId);
                                  }
                                }}
                                title="Add"
                                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-green-600 hover:text-green-800"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}

                            {isActive && (
                              <button
                                onClick={() => {
                                  try {
                                    if (rolePrefix === "T" && actionId) {
                                      const obj = { id: String(actionId), name: fullName };
                                      window.localStorage.setItem(
                                        "selected_teacher_for_course",
                                        JSON.stringify(obj)
                                      );
                                    }
                                  } catch (e) {
                                    // ignore storage errors
                                  }
                                  onEdit && actionId && onEdit(actionId);
                                }}
                                title="Edit"
                                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4 1 1-4L16.862 3.487z" />
                                </svg>
                              </button>
                            )}

                            {!isActive && onActivate && (
                              <button
                                onClick={() => onActivate && actionId && onActivate(actionId)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-green-600 hover:text-green-800"
                              >
                                Active
                              </button>
                            )}

                            {isActive && onDeactivate && (
                              <button
                                onClick={() => onDeactivate && actionId && onDeactivate(actionId)}
                                title="Remove"
                                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-orange-600 hover:text-orange-800"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getUserTypeText = (userTypeID) => {
  switch (String(userTypeID)) {
    case "1":
      return "Admin";
    case "2":
      return "Teacher";
    case "3":
      return "Student";
    default:
      return "Unknown";
  }
};

export default UserList;
