import { FiCalendar, FiUserCheck, FiUserX, FiUsers, FiX } from "react-icons/fi";
import { formatDate } from "../../utils/helpers";

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

const ClassStatsPanel = ({ open, classInfo, onClose }) => {
  if (!open || !classInfo) {
    return null;
  }

  const {
    label,
    code,
    total = 0,
    present = 0,
    absent = 0,
    students = [],
    records = [],
    latestAttendanceDate,
  } = classInfo;

  const formattedLatest = latestAttendanceDate
    ? formatDate(latestAttendanceDate)
    : "";

  const safeStudents = Array.isArray(students) ? students : [];
  const safeRecords = Array.isArray(records) ? records : [];
  const hasStudentSummaries = safeStudents.length > 0;
  const hasRecordSummaries = safeRecords.length > 0;

  return (
   <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Class Overview
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
                {total}
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
                {present}
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
                {absent}
              </span>
            </div>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto px-4 py-3 bg-white dark:bg-gray-900">
          {hasStudentSummaries ? (
            <ul className="space-y-2">
              {safeStudents.map((student) => (
                <li
                  key={student.id || student.name}
                  className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {student.name}
                    </p>
                    {student.attendanceDate ? (
                      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FiCalendar className="w-3 h-3" />
                        {formatDate(student.attendanceDate)}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`px-2 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap ${getStatusBadgeClasses(
                      student.statusKey
                    )}`}
                  >
                    {student.statusLabel || "No record"}
                  </span>
                </li>
              ))}
            </ul>
          ) : hasRecordSummaries ? (
            <ul className="space-y-2">
              {safeRecords.map((record) => (
                <li
                  key={record.id || record.date || record.statusLabel}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {record.title || "Session"}
                    </span>
                    {record.date ? (
                      <span className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FiCalendar className="w-3 h-3" />
                        {formatDate(record.date)}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`px-2 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap ${getStatusBadgeClasses(
                      record.statusKey
                    )}`}
                  >
                    {record.statusLabel || "No record"}
                  </span>
                </li>
              ))}
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

export default ClassStatsPanel;
