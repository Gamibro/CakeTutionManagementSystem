import { useState, useEffect } from "react";
import { formatDate } from "../../utils/helpers";
import EmptyState from "../common/EmptyState";
import { getStudentById } from "../../services/studentService";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  FiUser,
  FiMail,
  FiClock,
  FiCheckCircle,
  FiCalendar,
} from "react-icons/fi";

const AttendanceList = ({ attendance, loading, simpleView = false }) => {
  const [studentsWithDetails, setStudentsWithDetails] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsCache, setStudentsCache] = useLocalStorage(
    "students_cache",
    {}
  );

  const formatScanTime = (record) => {
    const candidates =
      record?.ScanTime ??
      record?.scanTime ??
      record?.AttendanceDate ??
      record?.attendanceDate ??
      record?.Date ??
      record?.date ??
      null;

    if (!candidates) return "";

    const s = String(candidates).trim();
    // Try direct Date parse
    let d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      // Try replacing space with 'T' for formats like 'yyyy-MM-dd HH:mm:ss'
      const alt = s.replace(" ", "T");
      d = new Date(alt);
    }

    if (!Number.isNaN(d.getTime())) {
      const datePart = d.toLocaleDateString();
      const timePart = d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${datePart} ${timePart}`;
    }

    return s;
  };

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!attendance || attendance.length === 0) {
        setStudentsWithDetails([]);
        return;
      }

      // Skip fetching student details if simple view is enabled
      if (simpleView) {
        setStudentsWithDetails(attendance);
        return;
      }

      setLoadingStudents(true);

      try {
        const updatedCache = { ...studentsCache };
        const studentsData = await Promise.all(
          attendance.map(async (record) => {
            const recordStudentId =
              record.StudentID ||
              record.studentID ||
              record.studentId ||
              record.student_id ||
              record.Id ||
              record.id;

            if (!recordStudentId) {
              return {
                ...record,
                studentName: "Unknown Student",
                studentEmail: "",
              };
            }

            try {
              let student = null;

              // Check cache first
              if (updatedCache[recordStudentId]) {
                student = updatedCache[recordStudentId];
              } else {
                // Fetch student data
                student = await getStudentById(recordStudentId);
                if (student) {
                  updatedCache[recordStudentId] = student;
                }
              }

              // Extract full name
              const fullName =
                student?.FirstName && student?.LastName
                  ? `${student.FirstName} ${student.LastName}`.trim()
                  : student?.firstName && student?.lastName
                  ? `${student.firstName} ${student.lastName}`.trim()
                  : student?.name ||
                    student?.Name ||
                    `Student ${recordStudentId}`;

              const studentEmail = student?.Email || student?.email || "";

              return {
                ...record,
                studentName: fullName,
                studentEmail: studentEmail,
              };
            } catch (err) {
              console.error(`Failed to fetch student ${recordStudentId}`, err);

              // Try cache on error
              const cachedStudent = updatedCache[recordStudentId];
              if (cachedStudent) {
                const fullName =
                  cachedStudent?.FirstName && cachedStudent?.LastName
                    ? `${cachedStudent.FirstName} ${cachedStudent.LastName}`.trim()
                    : cachedStudent?.firstName && cachedStudent?.lastName
                    ? `${cachedStudent.firstName} ${cachedStudent.lastName}`.trim()
                    : `Student ${recordStudentId}`;

                return {
                  ...record,
                  studentName: fullName,
                  studentEmail:
                    cachedStudent?.Email || cachedStudent?.email || "",
                };
              }

              return {
                ...record,
                studentName: `Student ${recordStudentId}`,
                studentEmail: "",
              };
            }
          })
        );

        setStudentsCache(updatedCache);
        setStudentsWithDetails(studentsData);
      } catch (error) {
        console.error("Error fetching student details:", error);
        setStudentsWithDetails(attendance);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentDetails();
  }, [attendance, simpleView]);

  if (loading || loadingStudents) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Simple view for student side - only shows date and time
  if (simpleView) {
    return (
      <div>
        {studentsWithDetails && studentsWithDetails.length > 0 ? (
          <div>
            {/* Summary Header */}
            <div className="mb-3 sm:mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-800 rounded-lg p-2 sm:p-3 border border-indigo-100 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total Attendance: {studentsWithDetails.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance List - Simple View */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg sm:rounded-lg border border-gray-200 dark:border-gray-700">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {studentsWithDetails.map((record, index) => {
                  const scanDate =
                    record.ScanDate ?? record.scanDate ?? record.date ?? "";
                  const scanTime =
                    record.FirstScanTime ??
                    record.firstScanTime ??
                    record.scanTime ??
                    "";

                  return (
                    <li
                      key={index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                    >
                      <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6">
                        <div className="flex items-center justify-between gap-3">
                          {/* Date Section */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <FiCalendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                                {scanDate
                                  ? new Date(scanDate).toLocaleDateString(
                                      "en-US",
                                      {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      }
                                    )
                                  : "N/A"}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600 dark:text-gray-300">
                                <FiClock className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <span>
                                  {scanTime
                                    ? new Date(scanTime).toLocaleTimeString(
                                        "en-US",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                        }
                                      )
                                    : "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-1 sm:px-3 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 whitespace-nowrap">
                              <FiCheckCircle className="w-3.5 h-3.5 mr-1" />
                              Present
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No attendance records"
            description="Select a schedule to view attendance records."
          />
        )}
      </div>
    );
  }

  // Full view for admin/teacher side - shows student details
  return (
    <div>
      {studentsWithDetails && studentsWithDetails.length > 0 ? (
        <div>
          {/* Summary Header */}
          <div className="mb-3 sm:mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-800 rounded-lg p-2 sm:p-3 border border-indigo-100 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FiCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Total Present: {studentsWithDetails.length}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance List */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg sm:rounded-lg border border-gray-200 dark:border-gray-700">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {studentsWithDetails.map((record, index) => (
                <li
                  key={record.StudentID || index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                >
                  <div className="px-3 py-3 sm:px-4 sm:py-3 md:px-6">
                    <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3">
                      {/* Left Section: Avatar + Student Info */}
                      <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <FiUser className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                        </div>

                        {/* Student Details */}
                        <div className="flex-1 min-w-0">
                          {/* Name and ID */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {record.studentName}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              ID:{" "}
                              {record.StudentID ||
                                record.studentID ||
                                record.id}
                            </span>
                          </div>

                          {/* Email and Scan Time */}
                          <div className="mt-1 flex flex-col gap-1">
                            {record.studentEmail && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                                <FiMail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <span className="truncate">
                                  {record.studentEmail}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                              <FiClock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                              <span className="truncate">
                                {formatScanTime(record) ||
                                  formatDate(record.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Section: Status Badge */}
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 whitespace-nowrap">
                          <FiCheckCircle className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">Present</span>
                          <span className="sm:hidden">✓</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No attendance records"
          description="Select a schedule to view attendance records."
        />
      )}
    </div>
  );
};

export default AttendanceList;
