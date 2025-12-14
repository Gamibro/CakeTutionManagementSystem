import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCourseDetails } from "../../services/courseService";
import { getAttendanceByStudentAndSchedule } from "../../services/attendanceService";
import { getAllClassSchedules } from "../../services/classScheduleService";
import { getEnrollmentsByStudent } from "../../services/enrollmentService";
import AttendanceList from "../../components/attendance/AttendanceList";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import StudentQRPass from "../../components/attendance/StudentQRPass";

const StudentAttendance = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Get student ID from user context
  const getStudentId = () => {
    return (
      user?.StudentID ??
      user?.studentID ??
      user?.studentId ??
      user?.UserID ??
      user?.userID ??
      user?.userId ??
      user?.id
    );
  };

  // Fetch schedules for enrolled courses
  useEffect(() => {
    const fetchEnrolledSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const studentId = getStudentId();
        if (!studentId) {
          console.warn("No student ID found");
          setLoadingSchedules(false);
          return;
        }

        // Get student's enrollments
        const enrollments = await getEnrollmentsByStudent(studentId);

        if (!enrollments || enrollments.length === 0) {
          console.warn("No enrollments found for student");
          setSchedules([]);
          setLoadingSchedules(false);
          return;
        }

        // Get all schedules
        const allSchedules = await getAllClassSchedules();

        // Filter schedules that belong to enrolled courses/subjects
        const enrolledCourseIds = enrollments
          .map((e) => e.CourseID ?? e.courseID ?? e.courseId)
          .filter(Boolean);

        const enrolledSubjectIds = enrollments
          .map((e) => e.SubjectID ?? e.subjectID ?? e.subjectId)
          .filter(Boolean);

        const filteredSchedules = allSchedules.filter((schedule) => {
          const scheduleCourseId =
            schedule.CourseID ?? schedule.courseID ?? schedule.courseId;
          const scheduleSubjectId =
            schedule.SubjectID ?? schedule.subjectID ?? schedule.subjectId;

          return (
            enrolledCourseIds.includes(scheduleCourseId) ||
            enrolledSubjectIds.includes(scheduleSubjectId)
          );
        });

        setSchedules(filteredSchedules);

        // Auto-select first schedule if available
        if (filteredSchedules.length > 0 && !selectedScheduleId) {
          const firstScheduleId =
            filteredSchedules[0].ScheduleID ??
            filteredSchedules[0].scheduleID ??
            filteredSchedules[0].scheduleId ??
            filteredSchedules[0].id;
          setSelectedScheduleId(firstScheduleId);
        }
      } catch (error) {
        console.error("Error fetching enrolled schedules:", error);
        setSchedules([]);
      } finally {
        setLoadingSchedules(false);
      }
    };

    fetchEnrolledSchedules();
  }, [user]);

  // Fetch attendance when schedule is selected
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!selectedScheduleId) {
        setAttendance([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const studentId = getStudentId();
        if (!studentId) {
          console.warn("No student ID found");
          setAttendance([]);
          setLoading(false);
          return;
        }

        // Fetch attendance using the new API
        const attendanceData = await getAttendanceByStudentAndSchedule(
          selectedScheduleId,
          studentId
        );

        setAttendance(attendanceData || []);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [selectedScheduleId, user]);

  // Fetch course details if id is provided (legacy support)
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        if (id) {
          const courseData = await getCourseDetails(id);
          setCourse(courseData);
        }
      } catch (error) {
        console.error("Error fetching course details:", error);
      }
    };

    fetchCourseData();
  }, [id]);

  if (loadingSchedules) {
    return <Loader className="py-12" />;
  }

  // Helper function to format schedule display text
  const formatScheduleOption = (schedule) => {
    const courseName =
      schedule.CourseName ??
      schedule.courseName ??
      schedule.Course?.CourseName ??
      "Unknown Course";
    const className =
      schedule.ClassName ??
      schedule.className ??
      schedule.Class?.ClassName ??
      schedule.RoomNumber ??
      schedule.roomNumber ??
      "";
    const classDate =
      schedule.ClassDate ??
      schedule.classDate ??
      schedule.Date ??
      schedule.date ??
      "";
    const startTime = schedule.StartTime ?? schedule.startTime ?? "";
    const endTime = schedule.EndTime ?? schedule.endTime ?? "";

    let displayText = courseName;

    // Add class name if available
    if (className) {
      displayText += ` | ${className}`;
    }

    // Add date if available
    if (classDate) {
      const formattedDate = new Date(classDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      displayText += ` | ${formattedDate}`;
    }

    // Add time if available
    if (startTime && endTime) {
      const formatTime = (time) => {
        if (!time) return "";
        const timeStr = String(time);
        if (timeStr.includes(":")) return timeStr.substring(0, 5);
        return timeStr;
      };
      displayText += ` | ${formatTime(startTime)}-${formatTime(endTime)}`;
    }

    return displayText;
  };

  return (
    <div className="space-y-6 sm:space-y-8 px-2 sm:px-0">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white border-l-4 border-indigo-500/60 dark:border-indigo-400/60 pl-2 sm:pl-3">
          My Attendance
        </h1>
      </div>

      {/* QR Pass Section */}
      <div className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6">
        <StudentQRPass courseId={id} />
      </div>

      {/* Attendance Records */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white border-l-4 border-violet-500/60 dark:border-violet-400/60 pl-2 sm:pl-3">
            Your Attendance Records
          </h2>
        </div>

        {/* Schedule Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <label
            htmlFor="schedule-select"
            className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Select Schedule
          </label>
          {schedules.length === 0 ? (
            <div className="py-4">
              <EmptyState
                title="No Schedules Found"
                description="You don't have any enrolled courses with schedules yet."
              />
            </div>
          ) : (
            <select
              id="schedule-select"
              value={selectedScheduleId || ""}
              onChange={(e) =>
                setSelectedScheduleId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              aria-label="Select schedule"
              className="w-full px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors leading-tight"
            >
              <option value="">-- Select a Schedule --</option>
              {schedules.map((schedule) => {
                const scheduleId =
                  schedule.ScheduleID ??
                  schedule.scheduleID ??
                  schedule.scheduleId ??
                  schedule.id;
                return (
                  <option
                    key={scheduleId}
                    value={scheduleId}
                    className="text-xs sm:text-sm"
                  >
                    {formatScheduleOption(schedule)}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div className="min-h-[200px]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            </div>
          ) : !selectedScheduleId ? (
            <div className="py-8">
              <EmptyState
                title="Select a Schedule"
                description="Please select a schedule above to view your attendance records."
              />
            </div>
          ) : attendance.length === 0 ? (
            <div className="py-8">
              <EmptyState
                title="No Attendance Records"
                description="No attendance records found for the selected schedule."
              />
            </div>
          ) : (
            <AttendanceList attendance={attendance} simpleView={true} />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
