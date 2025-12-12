import { useState, useEffect } from "react";
import { FiCalendar, FiUserCheck, FiUserX, FiUsers, FiX } from "react-icons/fi";
import { formatDate } from "../../utils/helpers";
import { getAttendanceBySubjectAndDate } from "../../services/attendanceService";
import { getStudentById } from "../../services/studentService";
import { getStudentsBySubject } from "../../services/subjectService";
import { useLocalStorage } from "../../hooks/useLocalStorage";

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
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [totalEnrolledStudents, setTotalEnrolledStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noAttendanceForDate, setNoAttendanceForDate] = useState(false);
  const [studentsCache, setStudentsCache] = useLocalStorage(
    "students_cache",
    {}
  );

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!open || !classInfo || !classInfo.subjectId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First, fetch total enrolled students for this subject
        let enrolledStudents = [];
        try {
          enrolledStudents = await getStudentsBySubject(classInfo.subjectId);
          setTotalEnrolledStudents(enrolledStudents.length);
          console.log(
            `Total enrolled students for subject ${classInfo.subjectId}:`,
            enrolledStudents.length
          );
        } catch (err) {
          console.error("Failed to fetch enrolled students:", err);
          setTotalEnrolledStudents(0);
        }

        // Then fetch attendance data for the selected date
        const data = await getAttendanceBySubjectAndDate(
          classInfo.subjectId,
          selectedDate
        );

        // Create a map of present students from attendance data
        const presentStudentIds = new Set();

        if (data && data.length > 0) {
          console.log("Raw attendance data received:", data);
          setNoAttendanceForDate(false);

          // Extract unique student IDs from attendance data with multiple field name possibilities
          const studentIds = [
            ...new Set(
              data
                .map((record) => {
                  const studentId =
                    record.StudentID ||
                    record.studentID ||
                    record.studentId ||
                    record.student_id ||
                    record.Id ||
                    record.id;
                  console.log(
                    "Extracted StudentID:",
                    studentId,
                    "from record:",
                    record
                  );
                  return studentId;
                })
                .filter(Boolean)
            ),
          ];

          console.log("Unique student IDs:", studentIds);

          // Store student IDs in local storage for this attendance session
          const attendanceStudentIds = {
            date: selectedDate,
            subjectId: classInfo.subjectId,
            studentIds: studentIds,
            timestamp: new Date().toISOString(),
          };
          localStorage.setItem(
            "attendance_student_ids",
            JSON.stringify(attendanceStudentIds)
          );

          // Fetch student details for each attendance record using getStudentById API
          const updatedCache = { ...studentsCache };
          const studentsWithDetails = await Promise.all(
            data.map(async (record) => {
              // Extract StudentID with multiple possible field names
              const recordStudentId =
                record.StudentID ||
                record.studentID ||
                record.studentId ||
                record.student_id ||
                record.Id ||
                record.id;

              if (!recordStudentId) {
                console.warn("No StudentID found in record:", record);
                return null;
              }

              try {
                let student = null;

                // Check if student data exists in cache
                if (updatedCache[recordStudentId]) {
                  student = updatedCache[recordStudentId];
                  console.log(
                    `Using cached data for student ${recordStudentId}`
                  );
                } else {
                  // Call getStudentById API with the StudentID from attendance record
                  console.log(
                    `Fetching student data for ID: ${recordStudentId}`
                  );
                  student = await getStudentById(recordStudentId);

                  // Save student data to cache
                  if (student) {
                    updatedCache[recordStudentId] = student;
                    console.log(
                      `Cached student data for ${recordStudentId}:`,
                      student
                    );
                  }
                }

                // Extract full name from student data
                const fullName =
                  student?.FirstName && student?.LastName
                    ? `${student.FirstName} ${student.LastName}`.trim()
                    : student?.firstName && student?.lastName
                    ? `${student.firstName} ${student.lastName}`.trim()
                    : student?.name ||
                      student?.Name ||
                      `Student ${recordStudentId}`;

                // Extract email from student data
                const studentEmail = student?.Email || student?.email || "";

                // Extract scan time with multiple possible field names
                const scanTime =
                  record.ScanTime ||
                  record.scanTime ||
                  record.scan_time ||
                  record.AttendanceDate ||
                  record.attendanceDate ||
                  record.Date ||
                  record.date;

                return {
                  id: recordStudentId,
                  name: fullName,
                  email: studentEmail,
                  rollNumber: student?.RollNumber || student?.rollNumber || "",
                  scanTime: scanTime,
                  statusKey: "present",
                  statusLabel: "Present",
                  attendanceDate: scanTime,
                };
              } catch (err) {
                console.error(
                  `Failed to fetch student ${recordStudentId}`,
                  err
                );

                // Try to get from cache even on error
                const cachedStudent = updatedCache[recordStudentId];
                if (cachedStudent) {
                  const fullName =
                    cachedStudent?.FirstName && cachedStudent?.LastName
                      ? `${cachedStudent.FirstName} ${cachedStudent.LastName}`.trim()
                      : cachedStudent?.firstName && cachedStudent?.lastName
                      ? `${cachedStudent.firstName} ${cachedStudent.lastName}`.trim()
                      : `Student ${recordStudentId}`;

                  const scanTime =
                    record.ScanTime ||
                    record.scanTime ||
                    record.scan_time ||
                    record.AttendanceDate ||
                    record.attendanceDate ||
                    record.Date ||
                    record.date;

                  return {
                    id: recordStudentId,
                    name: fullName,
                    email: cachedStudent?.Email || cachedStudent?.email || "",
                    rollNumber:
                      cachedStudent?.RollNumber ||
                      cachedStudent?.rollNumber ||
                      "",
                    scanTime: scanTime,
                    statusKey: "present",
                    statusLabel: "Present",
                    attendanceDate: scanTime,
                  };
                }

                const scanTime =
                  record.ScanTime ||
                  record.scanTime ||
                  record.scan_time ||
                  record.AttendanceDate ||
                  record.attendanceDate ||
                  record.Date ||
                  record.date;

                return {
                  id: recordStudentId,
                  name: `Student ${recordStudentId}`,
                  email: "",
                  rollNumber: "",
                  scanTime: scanTime,
                  statusKey: "present",
                  statusLabel: "Present",
                  attendanceDate: scanTime,
                };
              }
            })
          );

          // Filter out null entries
          const validStudents = studentsWithDetails.filter(Boolean);

          // Add present student IDs to the set
          validStudents.forEach((student) => presentStudentIds.add(student.id));

          // Now merge with all enrolled students to show absent ones too
          const allStudentsWithStatus = await Promise.all(
            enrolledStudents.map(async (enrolledStudent) => {
              const studentId =
                enrolledStudent.StudentID ||
                enrolledStudent.studentID ||
                enrolledStudent.studentId ||
                enrolledStudent.id;

              // Check if this student was present
              const presentStudent = validStudents.find(
                (s) => s.id === studentId
              );

              if (presentStudent) {
                // Student was present, return their data
                return presentStudent;
              } else {
                // Student was absent, get their details
                try {
                  let student = null;

                  if (updatedCache[studentId]) {
                    student = updatedCache[studentId];
                  } else {
                    student = await getStudentById(studentId);
                    if (student) {
                      updatedCache[studentId] = student;
                    }
                  }

                  const fullName =
                    student?.FirstName && student?.LastName
                      ? `${student.FirstName} ${student.LastName}`.trim()
                      : student?.firstName && student?.lastName
                      ? `${student.firstName} ${student.lastName}`.trim()
                      : student?.name ||
                        student?.Name ||
                        `Student ${studentId}`;

                  return {
                    id: studentId,
                    name: fullName,
                    email: student?.Email || student?.email || "",
                    rollNumber:
                      student?.RollNumber || student?.rollNumber || "",
                    scanTime: null,
                    statusKey: "absent",
                    statusLabel: "Absent",
                    attendanceDate: null,
                  };
                } catch (err) {
                  console.error(
                    `Failed to fetch absent student ${studentId}`,
                    err
                  );
                  return {
                    id: studentId,
                    name: `Student ${studentId}`,
                    email: "",
                    rollNumber: "",
                    scanTime: null,
                    statusKey: "absent",
                    statusLabel: "Absent",
                    attendanceDate: null,
                  };
                }
              }
            })
          );

          // Sort: present students first, then absent
          const sortedStudents = allStudentsWithStatus.sort((a, b) => {
            if (a.statusKey === "present" && b.statusKey === "absent")
              return -1;
            if (a.statusKey === "absent" && b.statusKey === "present") return 1;
            return a.name.localeCompare(b.name);
          });

          setStudentsCache(updatedCache);
          setAttendanceData(sortedStudents);
          setNoAttendanceForDate(false);
          console.log("Final student data with status:", sortedStudents);
        } else {
          console.log("No attendance data received for selected date");

          // Even with no attendance, show all enrolled students as absent
          if (enrolledStudents.length > 0) {
            const updatedCache = { ...studentsCache };
            const absentStudents = await Promise.all(
              enrolledStudents.map(async (enrolledStudent) => {
                const studentId =
                  enrolledStudent.StudentID ||
                  enrolledStudent.studentID ||
                  enrolledStudent.studentId ||
                  enrolledStudent.id;

                try {
                  let student = null;

                  if (updatedCache[studentId]) {
                    student = updatedCache[studentId];
                  } else {
                    student = await getStudentById(studentId);
                    if (student) {
                      updatedCache[studentId] = student;
                    }
                  }

                  const fullName =
                    student?.FirstName && student?.LastName
                      ? `${student.FirstName} ${student.LastName}`.trim()
                      : student?.firstName && student?.lastName
                      ? `${student.firstName} ${student.lastName}`.trim()
                      : student?.name ||
                        student?.Name ||
                        `Student ${studentId}`;

                  return {
                    id: studentId,
                    name: fullName,
                    email: student?.Email || student?.email || "",
                    rollNumber:
                      student?.RollNumber || student?.rollNumber || "",
                    scanTime: null,
                    statusKey: "absent",
                    statusLabel: "Absent",
                    attendanceDate: null,
                  };
                } catch (err) {
                  console.error(`Failed to fetch student ${studentId}`, err);
                  return {
                    id: studentId,
                    name: `Student ${studentId}`,
                    email: "",
                    rollNumber: "",
                    scanTime: null,
                    statusKey: "absent",
                    statusLabel: "Absent",
                    attendanceDate: null,
                  };
                }
              })
            );

            setStudentsCache(updatedCache);
            setAttendanceData(absentStudents.filter(Boolean));
            setNoAttendanceForDate(true);
          } else {
            setAttendanceData([]);
            setNoAttendanceForDate(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch attendance data", err);
        setError("Failed to load attendance data");
        setAttendanceData([]);
        setNoAttendanceForDate(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [open, classInfo, selectedDate]);

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
    subjectId,
  } = classInfo;

  const formattedLatest = latestAttendanceDate
    ? formatDate(latestAttendanceDate)
    : "";

  // Use fetched attendance data if available, otherwise fall back to passed data
  const displayStudents = attendanceData.length > 0 ? attendanceData : students;
  const safeStudents = Array.isArray(displayStudents) ? displayStudents : [];
  const safeRecords = Array.isArray(records) ? records : [];
  const hasStudentSummaries = safeStudents.length > 0;
  const hasRecordSummaries = safeRecords.length > 0;

  // Calculate stats from attendance data by counting present and absent separately
  const presentCount = attendanceData.filter(
    (s) => s.statusKey === "present"
  ).length;
  const absentCount = attendanceData.filter(
    (s) => s.statusKey === "absent"
  ).length;
  const displayTotal =
    totalEnrolledStudents > 0
      ? totalEnrolledStudents
      : attendanceData.length > 0
      ? attendanceData.length
      : total;
  const displayPresent = attendanceData.length > 0 ? presentCount : present;
  const displayAbsent = attendanceData.length > 0 ? absentCount : absent;

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

        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
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
              {attendanceData.map((student) => {
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
                    key={student.id || student.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2.5"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {student.name}
                      </p>
                      {student.attendanceDate ? (
                        <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1 font-medium">
                          <FiCalendar className="w-3 h-3" />
                          {formatDateTime(student.attendanceDate)}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`px-2 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap self-start ${getStatusBadgeClasses(
                        student.statusKey
                      )}`}
                    >
                      {student.statusLabel || "No record"}
                    </span>
                  </li>
                );
              })}
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
