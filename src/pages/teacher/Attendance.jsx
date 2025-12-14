import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCourseDetails } from "../../services/courseService";
import { getAttendanceByScheduleId } from "../../services/attendanceService";
import { getAllClassSchedules } from "../../services/classScheduleService";
import { getTeacherCourses } from "../../services/courseService";
import AttendanceList from "../../components/attendance/AttendanceList";
import Loader from "../../components/common/Loader";
import QRScanner from "../../components/attendance/QRScanner";

const TeacherAttendance = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Get teacher ID from user context
  const teacherId =
    user?.teacherId ??
    user?.TeacherId ??
    user?.teacherID ??
    user?.TeacherID ??
    user?.id ??
    user?.Id ??
    user?.userId ??
    user?.userID ??
    user?.UserId ??
    user?.UserID ??
    null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load all schedules using getAllClassSchedules API
        const [courseData, allSchedules, teacherCourses] = await Promise.all([
          id ? getCourseDetails(id) : Promise.resolve(null),
          getAllClassSchedules(),
          teacherId ? getTeacherCourses(teacherId) : Promise.resolve([]),
        ]);

        setCourse(courseData);

        // Extract course IDs that belong to the logged-in teacher
        const teacherCourseIds = Array.isArray(teacherCourses)
          ? teacherCourses.map((course) =>
              String(
                course?.id ??
                  course?.Id ??
                  course?.courseId ??
                  course?.CourseId ??
                  course?.courseID ??
                  course?.CourseID ??
                  ""
              )
            )
          : [];

        // Filter all schedules to show only those belonging to the logged-in teacher
        const teacherSchedules = Array.isArray(allSchedules)
          ? allSchedules.filter((schedule) => {
              const scheduleCourseId = String(
                schedule?.courseId ??
                  schedule?.CourseID ??
                  schedule?.courseID ??
                  schedule?.CourseId ??
                  schedule?.raw?.CourseID ??
                  schedule?.raw?.courseID ??
                  schedule?.raw?.CourseId ??
                  schedule?.raw?.courseId ??
                  ""
              );
              // Show only schedules for courses taught by this teacher
              return teacherCourseIds.includes(scheduleCourseId);
            })
          : [];

        setSchedules(teacherSchedules);
      } catch (error) {
        console.error("Error fetching data:", error);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, teacherId]);

  // Load attendance when schedule changes
  useEffect(() => {
    const loadAttendance = async () => {
      if (!selectedScheduleId) {
        setAttendance([]);
        return;
      }

      // Find the selected schedule to get its date
      const selectedSchedule = schedules.find((schedule) => {
        const sessionId = resolveScheduleSessionId(schedule);
        return String(sessionId) === String(selectedScheduleId);
      });

      if (!selectedSchedule) {
        setAttendance([]);
        return;
      }

      // Get the date from the selected schedule
      const scheduleDate =
        selectedSchedule?.classDate ??
        selectedSchedule?.ClassDate ??
        selectedSchedule?.raw?.ClassDate ??
        selectedSchedule?.raw?.classDate ??
        new Date().toISOString().split("T")[0];

      setLoadingAttendance(true);
      try {
        const data = await getAttendanceByScheduleId(
          selectedScheduleId,
          scheduleDate
        );
        setAttendance(data || []);
      } catch (error) {
        console.error("Error loading attendance:", error);
        setAttendance([]);
      } finally {
        setLoadingAttendance(false);
      }
    };

    loadAttendance();
  }, [selectedScheduleId, schedules]);

  const resolveScheduleSessionId = (schedule) => {
    if (!schedule || typeof schedule !== "object") return null;
    return (
      schedule?.sessionId ??
      schedule?.SessionID ??
      schedule?.sessionID ??
      schedule?.scheduleId ??
      schedule?.ScheduleID ??
      schedule?.scheduleID ??
      schedule?.raw?.SessionID ??
      schedule?.raw?.sessionID ??
      schedule?.raw?.sessionId ??
      schedule?.raw?.ScheduleID ??
      schedule?.raw?.scheduleID ??
      schedule?.raw?.scheduleId ??
      schedule?.id ??
      schedule?.Id ??
      schedule?.ID ??
      null
    );
  };

  const resolveScheduleDay = (schedule) => {
    if (!schedule || typeof schedule !== "object") return "";
    return (
      schedule?.day ??
      schedule?.Day ??
      schedule?.DAY ??
      schedule?.dayOfWeek ??
      schedule?.DayOfWeek ??
      schedule?.raw?.Day ??
      schedule?.raw?.day ??
      schedule?.raw?.DAY ??
      schedule?.raw?.DayOfWeek ??
      schedule?.raw?.dayOfWeek ??
      ""
    );
  };

  const resolveScheduleTime = (schedule) => {
    if (!schedule || typeof schedule !== "object") return "";
    const startTime =
      schedule?.startTime ??
      schedule?.StartTime ??
      schedule?.raw?.StartTime ??
      "";
    const endTime =
      schedule?.endTime ?? schedule?.EndTime ?? schedule?.raw?.EndTime ?? "";
    return startTime && endTime ? `${startTime} - ${endTime}` : "";
  };

  if (loading) {
    return <Loader className="py-12" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl sm:text-2xl font-bold  text-gray-900 dark:text-white">
          Course Attendance
        </h1>
      </div>

      <QRScanner />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Attendance Records
        </h2>

        {/* Schedule Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Schedule
          </label>
          <select
            value={selectedScheduleId}
            onChange={(e) => setSelectedScheduleId(e.target.value)}
            className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">-- Select Schedule --</option>
            {schedules.map((schedule) => {
              const sessionId = resolveScheduleSessionId(schedule);
              const courseName =
                schedule?.courseName ?? schedule?.raw?.CourseName ?? "";
              const subjectName =
                schedule?.subjectName ?? schedule?.raw?.SubjectName ?? "";
              const time = resolveScheduleTime(schedule);
              const classDate =
                schedule?.classDate ??
                schedule?.ClassDate ??
                schedule?.raw?.ClassDate ??
                "";

              return (
                <option key={sessionId} value={sessionId} className="text-sm">
                  {courseName} | {subjectName} | {time} | {classDate}
                </option>
              );
            })}
          </select>
        </div>

        <AttendanceList attendance={attendance} loading={loadingAttendance} />
      </div>
    </div>
  );
};

export default TeacherAttendance;
