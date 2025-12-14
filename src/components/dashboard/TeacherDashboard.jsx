import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTeacherCourses,
  getTeacherStudents,
} from "../../services/courseService";
import { getAllClassSchedules } from "../../services/classScheduleService";
import { getRecentMaterials } from "../../services/materialService";
import CourseCard from "../courses/CourseCard";
import StudentCard from "../users/UserCard";
import MaterialCard from "../materials/MaterialCard";
import Card from "../common/Card";
import Loader from "../common/Loader";
import AnnouncementList from "../announcements/AnnouncementList";
import { getAnnouncementsByTeacher } from "../../services/announcementService";
import { useTheme } from "../../contexts/ThemeContext";
import {
  FaUserGraduate,
  FaBookOpen,
  FaBell,
  FaCalendarAlt,
  FaBan,
} from "react-icons/fa";

const resolveTeacherId = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  return (
    user.TeacherID ??
    user.teacherID ??
    user.teacherId ??
    user.UserID ??
    user.userID ??
    user.userId ??
    user.id ??
    null
  );
};

const resolveStudentUserId = (student) => {
  if (!student || typeof student !== "object") {
    return null;
  }

  const nestedUser =
    student.UserDetails ||
    student.userDetails ||
    student.User ||
    student.user ||
    {};

  return (
    student.UserID ??
    student.userID ??
    student.userId ??
    student.UserId ??
    nestedUser.UserID ??
    nestedUser.userID ??
    nestedUser.userId ??
    null
  );
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  // UI state for header actions (search/filters)
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc"); // newest first
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const optionsRef = useRef(null);
  const [activeTab, setActiveTab] = useState("notices");
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const teacherId = resolveTeacherId(user);

    if (!teacherId) {
      setCourses([]);
      setStudents([]);
      setMaterials([]);
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      try {
        const [coursesData, studentsData, materialsData, schedulesData] =
          await Promise.all([
            getTeacherCourses(teacherId),
            getTeacherStudents(teacherId),
            getRecentMaterials(teacherId),
            getAllClassSchedules(),
          ]);
        if (!isMounted) {
          return;
        }

        setCourses(coursesData || []);
        setStudents(studentsData || []);
        setMaterials(materialsData || []);
        // filter schedules to only those that belong to the teacher's courses
        try {
          const courseIdSet = new Set(
            (coursesData || [])
              .map((c) => String(c?.id ?? c?.CourseID ?? c?.courseId ?? ""))
              .filter(Boolean)
          );
          const filteredSchedules = (schedulesData || []).filter((s) =>
            courseIdSet.has(
              String(s?.courseId ?? s?.CourseID ?? s?.courseId ?? "")
            )
          );
          setSchedules(filteredSchedules);
        } catch (e) {
          setSchedules([]);
        }
        // load announcements authored by this teacher
        const anns = await getAnnouncementsByTeacher(teacherId);
        if (isMounted) {
          setAnnouncements(anns || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (isMounted) {
          setCourses([]);
          setStudents([]);
          setMaterials([]);
          setAnnouncements([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close overlays when clicking/touching outside
  useEffect(() => {
    const handlePointerDown = (e) => {
      const t = e.target;
      if (
        showSearch &&
        searchBoxRef.current &&
        !searchBoxRef.current.contains(t)
      ) {
        setShowSearch(false);
      }
      if (
        showOptions &&
        optionsRef.current &&
        !optionsRef.current.contains(t)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showSearch, showOptions]);

  if (loading) {
    return <Loader className="py-12" />;
  }

  // Derived stats (safe access in case fields are missing)
  const totalLessons = courses.reduce(
    (sum, c) => sum + (c.lessonsCount || c.lessons?.length || 0),
    0
  );
  const totalTests = courses.reduce((sum, c) => sum + (c.testsCount || 0), 0);
  const totalHours = courses.reduce((sum, c) => sum + (c.totalHours || 0), 0);
  const scheduleCount = schedules.length;

  const getTeacherIcon = (type, value) => {
    const v = Number(value) || 0;
    const size = 28;
    switch (type) {
      case "students":
        if (v === 0) return <FaBan size={size} className="text-gray-400" />;
        if (v < 10)
          return <FaUserGraduate size={size} className="text-yellow-500" />;
        return <FaUserGraduate size={size} className="text-green-500" />;
      case "courses":
        if (v === 0) return <FaBan size={size} className="text-gray-400" />;
        if (v < 5)
          return <FaBookOpen size={size} className="text-indigo-500" />;
        return <FaBookOpen size={size} className="text-blue-600" />;
      case "announcements":
        if (v === 0) return <FaBell size={size} className="text-gray-400" />;
        return <FaBell size={size} className="text-orange-500" />;
      case "schedules":
        if (v === 0) return <FaBan size={size} className="text-gray-400" />;
        return <FaCalendarAlt size={size} className="text-purple-500" />;
      default:
        return <FaBookOpen size={size} className="text-gray-600" />;
    }
  };

  // Prepare announcements list based on search + sort
  const filteredAnnouncements = (announcements || [])
    .filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q)
      );
    })
    .slice()
    .sort((a, b) => {
      const da = new Date(a.postDate || 0).getTime();
      const db = new Date(b.postDate || 0).getTime();
      return sortOrder === "desc" ? db - da : da - db;
    });

  return (
    <div className="space-y-6">
      {/* Top stat cards - styled like the provided design */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="p-6 flex flex-col items-start transition-base hover-lift soft-shadow">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/60 dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                {getTeacherIcon("students", students.length)}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Class Students
                </div>
                <div className="text-3xl font-bold text-green-500 mt-2">
                  {students.length}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col items-start transition-base hover-lift soft-shadow">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/60 dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                {getTeacherIcon("courses", courses.length)}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Courses
                </div>
                <div className="text-3xl font-bold text-green-500 mt-2">
                  {courses.length}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col items-start transition-base hover-lift soft-shadow">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/60 dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                {getTeacherIcon("announcements", announcements.length)}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Announcements
                </div>
                <div className="text-3xl font-bold text-green-500 mt-2">
                  {announcements.length}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col items-start transition-base hover-lift soft-shadow">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/60 dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                {getTeacherIcon("schedules", scheduleCount)}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Scheduled Classes
                </div>
                <div className="text-3xl font-bold text-green-500 mt-2">
                  {scheduleCount}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Big Notices & Announcements style panel */}
      <Card className="p-0">
        <div
          className={`relative flex flex-col gap-4 rounded-t-lg p-5 text-white sm:p-6 lg:flex-row lg:items-center lg:justify-between ${
            theme === "dark"
              ? "bg-gradient-to-r from-blue-700 to-indigo-800"
              : "bg-gradient-to-r from-blue-400 to-indigo-500"
          }`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <span className="text-2xl">🔔</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">
                Notices & Announcements
              </h2>
              <div className="text-sm opacity-90">
                (Stay updated with the latest information)
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              className="relative"
              onClick={() => {
                setActiveTab("notices");
                setShowSearch(false);
                setShowOptions(false);
              }}
              title="View notices"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"
                />
              </svg>
              {announcements.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">
                  {announcements.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setShowSearch((v) => !v);
                setShowOptions(false);
              }}
              title="Search notices"
            >
              <svg
                className="w-6 h-6 text-white/90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                />
              </svg>
            </button>
            <button
              onClick={() => {
                setShowOptions((v) => !v);
                setShowSearch(false);
              }}
              title="Options"
            >
              <svg
                className="w-6 h-6 text-white/90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Search input overlay */}
          {showSearch && (
            <div
              ref={searchBoxRef}
              className="absolute right-4 top-4 w-[min(18rem,calc(100vw-3rem))] sm:w-72"
            >
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices..."
                className="w-full rounded-md bg-white/90 px-3 py-1.5 text-gray-800 placeholder-gray-500 shadow focus:outline-none"
              />
            </div>
          )}

          {/* Options dropdown */}
          {showOptions && (
            <div
              ref={optionsRef}
              className="absolute right-4 top-14 bg-white text-gray-700 rounded-md shadow w-52 ring-1 ring-black/5"
            >
              <div className="py-1 text-sm">
                <div className="px-3 py-1.5 text-xs uppercase tracking-wide text-gray-500">
                  Sort
                </div>
                <button
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                    sortOrder === "desc" ? "font-semibold text-gray-900" : ""
                  }`}
                  onClick={() => {
                    setSortOrder("desc");
                    setShowOptions(false);
                  }}
                >
                  Newest first
                </button>
                <button
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                    sortOrder === "asc" ? "font-semibold text-gray-900" : ""
                  }`}
                  onClick={() => {
                    setSortOrder("asc");
                    setShowOptions(false);
                  }}
                >
                  Oldest first
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="mb-4 flex flex-col gap-3 border-b border-gray-200 pb-4 text-sm text-gray-500 dark:border-gray-700 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setActiveTab("notices")}
                className={`border-b-2 pb-3 transition-colors ${
                  activeTab === "notices"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                }`}
              >
                Notices ({announcements.length})
              </button>
              {/* Attachments tab removed: teacher dashboard shows only notices */}
            </div>

            {/* <div className="text-xs text-gray-500 dark:text-gray-300 sm:text-sm sm:text-right">
              {announcements[0]
                ? new Date(announcements[0].postDate).toLocaleString()
                : ""}
            </div> */}
          </div>

          <div className="min-h-[200px]">
            <AnnouncementList announcements={filteredAnnouncements} />
          </div>
        </div>
      </Card>

      {/* Existing recent lists (restyled slightly) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Courses
          </h3>
          <div className="space-y-4">
            {courses.slice(0, 3).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Students
          </h3>
          <div className="space-y-4">
            {students.slice(0, 5).map((student, index) => {
              const studentUserId = resolveStudentUserId(student);
              const key =
                studentUserId ??
                student.id ??
                student.StudentID ??
                student.studentId ??
                student.userId ??
                index;
              const card = <StudentCard user={student} />;

              if (!studentUserId) {
                return (
                  <div key={String(key)} className="block">
                    {card}
                  </div>
                );
              }

              return (
                <Link
                  key={String(key)}
                  to={`/teacher/students/${studentUserId}`}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 rounded-lg"
                >
                  {card}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Recent Materials
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.slice(0, 3).map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
