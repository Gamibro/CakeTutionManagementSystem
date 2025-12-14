import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getStudentAttendance } from "../../services/attendanceService";
import { getStudentMaterials } from "../../services/materialService";
import { getStudentCourses } from "../../services/courseService";
import AnnouncementList from "../announcements/AnnouncementList";
import { getAnnouncementsForStudent } from "../../services/announcementService";
import { useTheme } from "../../contexts/ThemeContext";
import Card from "../common/Card";
import Loader from "../common/Loader";
import StatsCard from "../common/StatsCard";
import EmptyState from "../common/EmptyState";
import { formatDate, getFileType } from "../../utils/helpers";
import { getAllClassSchedules } from "../../services/classScheduleService";
import { FaBookOpen, FaCalendarAlt, FaBan, FaBell } from "react-icons/fa";

const resolveStudentIdentifiers = (user) => {
  if (!user || typeof user !== "object") {
    return { studentId: null, userId: null };
  }

  const studentId =
    user.StudentID ??
    user.studentID ??
    user.studentId ??
    user.Student?.StudentID ??
    user.student?.StudentID ??
    user.Student?.id ??
    user.student?.id ??
    null;

  const userId =
    user.UserID ??
    user.userID ??
    user.userId ??
    user.id ??
    user.User?.UserID ??
    user.User?.id ??
    null;

  return {
    studentId: studentId ?? userId,
    userId,
  };
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [attendance, setAttendance] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  // UI state for header actions (search & sort)
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc");
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const optionsRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { studentId, userId } = resolveStudentIdentifiers(user);

    if (!studentId && !userId) {
      setAttendance([]);
      setMaterials([]);
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    let isActive = true;

    const fetchData = async () => {
      try {
        const resolvedStudentId = studentId ?? userId;
        const [
          attendanceData,
          materialsData,
          announcementsData,
          coursesData,
          schedulesData,
        ] = await Promise.all([
          getStudentAttendance(resolvedStudentId),
          getStudentMaterials(resolvedStudentId),
          getAnnouncementsForStudent(resolvedStudentId),
          getStudentCourses(resolvedStudentId),
          getAllClassSchedules(),
        ]);

        if (!isActive) {
          return;
        }

        const filteredAttendance = attendanceData.filter((record) => {
          const recordStudentId =
            record.StudentID ??
            record.studentID ??
            record.studentId ??
            record.userId ??
            record.UserID ??
            null;

          if (recordStudentId === null) {
            return true;
          }

          const candidate = String(recordStudentId);
          return (
            candidate === String(resolvedStudentId) ||
            (userId !== null && candidate === String(userId))
          );
        });

        setAttendance(filteredAttendance);
        setMaterials(materialsData || []);
        setAnnouncements(announcementsData || []);
        setCourses(coursesData || []);
        setSchedules(schedulesData || []);
      } catch (error) {
        console.error("Error fetching student dashboard data:", error);
        if (isActive) {
          setAttendance([]);
          setMaterials([]);
          setAnnouncements([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, [user]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

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

  const {
    summary: announcementSummary,
    total: totalAnnouncementsForEnrolledCourses,
  } = useMemo(() => {
    // Group announcements by course to highlight counts for the student's classes.
    const normalizeId = (value) => {
      if (value === undefined || value === null) {
        return null;
      }
      const str = String(value).trim();
      return str.length ? str : null;
    };

    const courseNameById = new Map();
    (Array.isArray(courses) ? courses : []).forEach((course) => {
      const idCandidates = [
        course?.id,
        course?.ID,
        course?.courseId,
        course?.courseID,
        course?.CourseID,
        course?.CourseId,
      ];
      const normalizedId = idCandidates
        .map((candidate) => normalizeId(candidate))
        .find(Boolean);

      if (!normalizedId) {
        return;
      }

      const labelCandidates = [
        course?.name,
        course?.Name,
        course?.courseName,
        course?.CourseName,
        course?.title,
        course?.Title,
        course?.code ? `${course.code}` : null,
      ];

      const label =
        labelCandidates.find(
          (candidate) => typeof candidate === "string" && candidate.trim()
        ) || `Course ${normalizedId}`;

      courseNameById.set(normalizedId, label.trim());
    });

    const announcementCourseMap = new Map();
    (Array.isArray(announcements) ? announcements : []).forEach(
      (announcement) => {
        const idCandidates = [
          announcement?.courseId,
          announcement?.CourseID,
          announcement?.courseID,
          announcement?.CourseId,
          announcement?.course?.id,
          announcement?.course?.courseId,
          announcement?.Course?.ID,
        ];

        const courseId = idCandidates
          .map((candidate) => normalizeId(candidate))
          .find(Boolean);

        if (!courseId) {
          return;
        }

        if (!announcementCourseMap.has(courseId)) {
          const labelFallback =
            courseNameById.get(courseId) ||
            [
              announcement?.courseName,
              announcement?.CourseName,
              announcement?.course?.name,
              announcement?.Course?.Name,
              announcement?.title,
            ].find(
              (candidate) =>
                typeof candidate === "string" && candidate.trim().length
            ) ||
            `Course ${courseId}`;

          announcementCourseMap.set(courseId, {
            count: 0,
            label: labelFallback.trim(),
          });
        }

        const entry = announcementCourseMap.get(courseId);
        entry.count += 1;
      }
    );

    const summary = [];

    courseNameById.forEach((label, id) => {
      const entry = announcementCourseMap.get(id);
      summary.push({
        key: id,
        label,
        count: entry ? entry.count : 0,
      });
      if (entry) {
        announcementCourseMap.delete(id);
      }
    });

    announcementCourseMap.forEach(({ count, label }, id) => {
      summary.push({
        key: id,
        label,
        count,
      });
    });

    summary.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });

    const total = summary.reduce((acc, entry) => acc + entry.count, 0);

    return { summary, total };
  }, [courses, announcements]);

  if (loading) return <Loader className="py-12" />;

  const totalCourses = Array.isArray(courses) ? courses.length : 0;
  // Determine scheduled classes (courses that have a schedule and belong to the student)
  const studentCourseIds = new Set(
    (courses || [])
      .map((c) => c?.id ?? c?.CourseID ?? c?.courseId ?? c?.CourseId)
      .filter((v) => v !== undefined && v !== null)
      .map(String)
  );

  const scheduledCourseIds = new Set(
    (schedules || [])
      .map((s) => s?.courseId ?? s?.CourseID ?? s?.courseId ?? s?.courseID)
      .filter((v) => v !== undefined && v !== null)
      .map(String)
      .filter((id) => studentCourseIds.has(id))
  );

  const scheduledClassesCount = scheduledCourseIds.size;

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
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatsCard
          icon={<FaBookOpen size={28} className="text-green-500" />}
          title="Courses"
          value={totalCourses}
        />

        <StatsCard
          icon={
            scheduledClassesCount === 0 ? (
              <FaBan size={28} className="text-gray-400" />
            ) : (
              <FaCalendarAlt size={28} className="text-purple-500" />
            )
          }
          title="Scheduled classes"
          value={scheduledClassesCount}
        />

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover-lift soft-shadow animated-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-300">
              Class announcements
            </div>
            <div className="text-2xl">
              <FaBell size={28} className="text-blue-500" />
            </div>
          </div>
          <div className="mt-6">
            <div className="text-3xl font-semibold text-indigo-600 dark:text-indigo-400">
              {totalAnnouncementsForEnrolledCourses}
            </div>
          </div>
        </div>
      </div>

      {/* Announcements panel */}
      <Card className="p-0 ">
        <div
          className={`p-6 rounded-t-lg text-white flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative ${
            theme === "dark"
              ? "bg-gradient-to-r from-blue-700 to-indigo-800"
              : "bg-gradient-to-r from-blue-400 to-indigo-500"
          }`}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              🔔
            </div>
            <div>
              <h3 className="text-xl font-semibold">Notices & Announcements</h3>
              <p className="text-sm opacity-80">
                (Stay updated with the latest information)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              className="relative p-2 rounded-full bg-white/20"
              onClick={() => {
                // keep behavior consistent with other dashboards
                setShowSearch(false);
                setShowOptions(false);
              }}
              title="View notices"
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
              className="p-2 rounded-full bg-white/20"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setShowSearch((v) => !v);
                setShowOptions(false);
              }}
              title="Search notices"
            >
              🔍
            </button>
            <button
              className="p-2 rounded-full bg-white/20"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setShowOptions((v) => !v);
                setShowSearch(false);
              }}
              title="Options"
            >
              ⚙️
            </button>
          </div>

          {/* Search input overlay */}
          {showSearch && (
            <div ref={searchBoxRef} className="absolute right-4 top-4">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices..."
                className="w-56 sm:w-72 rounded-md bg-white/90 text-gray-800 placeholder-gray-500 px-3 py-1.5 focus:outline-none shadow"
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

        <div className="p-6">
          <div className="border-b mb-6">
            <nav className="flex space-x-6 text-sm text-gray-500">
              <div className={`pb-3 border-b-2 border-blue-500 text-blue-600`}>
                Notices ({announcements.length})
              </div>
            </nav>
          </div>

          <div className="min-h-[200px]">
            {announcements.length ? (
              <AnnouncementList announcements={filteredAnnouncements} />
            ) : (
              <AnnouncementList announcements={[]} />
            )}
          </div>
        </div>
      </Card>

      {/* Recent materials & attendance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Recent Materials</h3>
            <p className="text-sm text-gray-500">
              Latest uploads for your courses
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            {materials && materials.length ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {materials
                  .slice()
                  .sort((a, b) => {
                    const da = new Date(
                      a.uploadDate || a.postDate || a.createdAt || a.date || 0
                    ).getTime();
                    const db = new Date(
                      b.uploadDate || b.postDate || b.createdAt || b.date || 0
                    ).getTime();
                    return db - da;
                  })
                  .slice(0, 5)
                  .map((m) => (
                    <li key={m.id ?? m.materialId ?? m.MaterialID ?? m.title}>
                      <div className="px-4 py-4 flex items-center sm:px-6 transition-base hover-lift">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                            {m.title}
                          </p>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 truncate">
                            {m.description || formatDate(m.uploadDate)}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 text-right">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {getFileType(m.filePath || m.path || m.url || "")}
                          </span>
                          <div className="mt-2 text-sm text-gray-500 dark:text-gray-300">
                            {formatDate(m.uploadDate)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="p-6">
                <EmptyState
                  title="No materials yet"
                  description="Your instructor hasn't uploaded any materials."
                />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Recent Attendance</h3>
            <p className="text-sm text-gray-500">
              Your latest attendance records
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            {attendance && attendance.length ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {attendance
                  .slice()
                  .sort((a, b) => {
                    const da = new Date(
                      a.date || a.attendanceDate || a.AttendedDate || 0
                    ).getTime();
                    const db = new Date(
                      b.date || b.attendanceDate || b.AttendedDate || 0
                    ).getTime();
                    return db - da;
                  })
                  .slice(0, 5)
                  .map((r) => (
                    <li key={r.id ?? r.AttendanceID ?? r.date}>
                      <div className="px-4 py-4 flex items-center sm:px-6 transition-base hover-lift">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                            {formatDate(
                              r.date || r.attendanceDate || r.AttendedDate
                            )}
                          </p>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 truncate">
                            {r.courseName ||
                              r.course?.name ||
                              r.CourseName ||
                              r.Course?.name ||
                              ""}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 text-right">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              (r.status || r.Status || "")
                                .toString()
                                .toLowerCase() === "present"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : (r.status || r.Status || "")
                                    .toString()
                                    .toLowerCase() === "late"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {r.status || r.Status || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="p-6">
                <EmptyState
                  title="No attendance records"
                  description="No attendance data available yet."
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
