import { useState, useEffect } from "react";
import { FiCalendar, FiUserCheck, FiUserX, FiUsers, FiX } from "react-icons/fi";
import { formatDate } from "../../utils/helpers";
import { getAttendanceByStudentAndSubject } from "../../services/attendanceService";

const getStatusBadgeClasses = (statusKey) => {
  switch ((statusKey || "").toLowerCase()) {
    case "present":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "late":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "absent":
    case "excused":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    default:
      return "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};

const StudentClassStatsPanel = ({ open, classInfo, onClose, studentId }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      console.log("StudentClassStatsPanel useEffect triggered:", {
        open,
        classInfo,
        studentId,
      });

      if (!open || !classInfo) {
        console.log("Early return: panel not open or no classInfo");
        return;
      }

      const subjectId =
        classInfo.subjectId || classInfo.SubjectID || classInfo.subjectID;

      if (!subjectId || !studentId) {
        console.log("Missing required data:", { subjectId, studentId });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log(
          `Fetching attendance for student ${studentId} and subject ${subjectId}`
        );

        const data = await getAttendanceByStudentAndSubject(
          studentId,
          subjectId
        );

        console.log("Student attendance data received:", data);

        if (data && data.length > 0) {
          // Format the data for display
          const formattedData = data.map((record) => ({
            id: `${record.ScanDate || record.scanDate}-${
              record.FirstScanTime || record.firstScanTime
            }`,
            scanDate: record.ScanDate || record.scanDate,
            firstScanTime: record.FirstScanTime || record.firstScanTime,
            statusKey: "present",
            statusLabel: "Present",
            attendanceDate: record.FirstScanTime || record.firstScanTime,
          }));

          setAttendanceData(formattedData);
        } else {
          setAttendanceData([]);
        }
      } catch (err) {
        console.error("Failed to fetch attendance data:", err);
        setError("Failed to load attendance data");
        setAttendanceData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [open, classInfo, studentId]);

  if (!open || !classInfo) {
    return null;
  }

  const { label, code, latestAttendanceDate } = classInfo;

  const formattedLatest = latestAttendanceDate
    ? formatDate(latestAttendanceDate)
    : "";

  // Calculate stats from attendance data
  const displayTotal = attendanceData.length;
  const displayPresent = attendanceData.filter(
    (s) => s.statusKey === "present"
  ).length;
  const displayAbsent = 0; // Students only see their present records

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              My Attendance
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {label || "Class"}
            </h2>
            {code ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Code: {code}
              </p>
            ) : null}
            {formattedLatest ? (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                <FiCalendar className="w-3 h-3" />
                Last record: {formattedLatest}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-full p-1 dark:text-gray-500 dark:hover:text-gray-200"
            aria-label="Close class statistics"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Total
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="p-2 rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                <FiUsers className="w-4 h-4" />
              </span>
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {displayTotal}
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Present
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="p-2 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                <FiUserCheck className="w-4 h-4" />
              </span>
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {displayPresent}
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Absent
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="p-2 rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                <FiUserX className="w-4 h-4" />
              </span>
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {displayAbsent}
              </span>
            </div>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto px-4 py-3 bg-white dark:bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            </div>
          ) : error ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          ) : attendanceData.length > 0 ? (
            <ul className="space-y-2">
              {attendanceData.map((record) => {
                const formatDateTime = (dateTimeString) => {
                  if (!dateTimeString) return "";
                  const dt = new Date(dateTimeString);
                  if (isNaN(dt.getTime())) return "";

                  const date = dt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  const time = dt.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });

                  return `${date} at ${time}`;
                };

                return (
                  <li
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2.5"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {record.scanDate}
                      </p>
                      {record.attendanceDate ? (
                        <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1 font-medium">
                          <FiCalendar className="w-3 h-3" />
                          {formatDateTime(record.attendanceDate)}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`px-2 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap self-start ${getStatusBadgeClasses(
                        record.statusKey
                      )}`}
                    >
                      {record.statusLabel || "No record"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No attendance data available for this class yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentClassStatsPanel;
