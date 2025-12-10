import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getCourseDetails } from "../../services/courseService";
import { getCourseAttendance } from "../../services/attendanceService";
import { getAllClassSchedules } from "../../services/classScheduleService";
import AttendanceList from "../../components/attendance/AttendanceList";
import Loader from "../../components/common/Loader";
import QRScanner from "../../components/attendance/QRScanner";

const TeacherAttendance = () => {
  const { id } = useParams();
  const [attendance, setAttendance] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const [attendanceData, courseData, scheduleData] = await Promise.all([
            getCourseAttendance(id),
            getCourseDetails(id),
            getAllClassSchedules(),
          ]);
          setAttendance(attendanceData);
          setCourse(courseData);
          const filteredSchedules = Array.isArray(scheduleData)
            ? scheduleData.filter((schedule) => {
                const scheduleCourseId =
                  schedule?.courseId ??
                  schedule?.CourseID ??
                  schedule?.courseID ??
                  schedule?.CourseId ??
                  schedule?.raw?.CourseID ??
                  schedule?.raw?.courseID ??
                  schedule?.raw?.CourseId ??
                  schedule?.raw?.courseId ??
                  null;
                if (scheduleCourseId === null || scheduleCourseId === undefined)
                  return false;
                return String(scheduleCourseId) === String(id);
              })
            : [];
          setSchedules(filteredSchedules);
        } else {
          setSchedules([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <Loader className="py-12" />;
  }

  // if (!id) {
  //   return (
  //     <div className="space-y-6">
  //       <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  //         Attendance
  //       </h1>
  //       <EmptyState
  //         title="Select a course"
  //         description="Please select a course to view or take attendance."
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl sm:text-2xl font-bold  text-gray-900 dark:text-white">
          Course Attendance
        </h1>
      </div>

      <QRScanner />

      {/* <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Attendance Records
      </h2>
      <AttendanceList attendance={attendance} schedules={schedules} /> */}
    </div>
  );
};

export default TeacherAttendance;
