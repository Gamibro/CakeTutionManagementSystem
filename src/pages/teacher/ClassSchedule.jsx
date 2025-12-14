import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import Card from "../../components/common/Card";
import { getTeacherCourses } from "../../services/courseService";
import { getAllClassSchedules } from "../../services/classScheduleService";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatTime = (t) => {
  if (!t) return "";
  const [hh, mm] = String(t).split(":");
  const hour = Number(hh);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${mm} ${suffix}`;
};

const colors = [
  "indigo",
  "violet",
  "emerald",
  "rose",
  "amber",
  "cyan",
  "fuchsia",
  "orange",
  "blue",
  "teal",
];

const pickColorForCourse = (courseId) => {
  if (courseId == null) return "gray";
  const idx = Math.abs(Number(courseId)) % colors.length;
  return colors[idx];
};

const TeacherClassSchedule = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [view, setView] = useState("week");
  const [showDetails, setShowDetails] = useState(false);
  const [detailSchedule, setDetailSchedule] = useState(null);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({ course: "", subject: "", room: "" });
  const [loadError, setLoadError] = useState(null);

  const sortSchedules = (items) => {
    if (!Array.isArray(items)) return [];
    const clone = [...items];
    clone.sort((a, b) => {
      const dayA = Number.isFinite(a?.dayOfWeek) ? a.dayOfWeek : 0;
      const dayB = Number.isFinite(b?.dayOfWeek) ? b.dayOfWeek : 0;
      if (dayA !== dayB) return dayA - dayB;
      const startA = a?.startTime ?? "";
      const startB = b?.startTime ?? "";
      return String(startA).localeCompare(String(startB));
    });
    return clone;
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const teacherId =
          user?.TeacherID ??
          user?.teacherID ??
          user?.teacherId ??
          user?.userID ??
          user?.userId ??
          user?.id;
        const [scheds, teacherCourses] = await Promise.all([
          getAllClassSchedules(),
          getTeacherCourses(teacherId),
        ]);
        if (!mounted) return;
        setSchedules(sortSchedules(Array.isArray(scheds) ? scheds : []));
        setCourses(Array.isArray(teacherCourses) ? teacherCourses : []);
      } catch (err) {
        if (!mounted) return;
        console.error("Failed to load teacher schedules", err);
        setLoadError("Unable to load schedules. Please try again.");
        setSchedules([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const teacherCourseIds = useMemo(() => {
    return (courses || []).map((c) => String(c.id ?? c.CourseID ?? c.courseId));
  }, [courses]);

  const filtered = useMemo(() => {
    // while we're loading courses/schedules, avoid showing anything
    if (loading) return [];

    return (schedules || []).filter((s) => {
      // if the teacher has no courses, show no schedules
      if (!teacherCourseIds.length) return false;

      if (
        teacherCourseIds.length &&
        !teacherCourseIds.includes(String(s.courseId))
      ) {
        return false;
      }

      if (
        filters.course &&
        !String(s.courseName || s.courseId)
          .toLowerCase()
          .includes(filters.course.toLowerCase())
      )
        return false;
      if (
        filters.subject &&
        !String(s.subjectName || s.subjectId)
          .toLowerCase()
          .includes(filters.subject.toLowerCase())
      )
        return false;
      if (
        filters.room &&
        !String(s.roomNumber || "")
          .toLowerCase()
          .includes(filters.room.toLowerCase())
      )
        return false;
      return true;
    });
  }, [schedules, teacherCourseIds, filters, loading]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const groupedByDay = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const day = item.dayOfWeek;
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(item);
    }
    for (const arr of map.values())
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [filtered]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Class Schedule
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View your weekly class schedule.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === "week" ? "list" : "week")}
            className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
          >
            {view === "week" ? "List View" : "Week View"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
            Course
          </label>
          <input
            name="course"
            value={filters.course}
            onChange={handleInput}
            placeholder="Search course"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
            Class
          </label>
          <input
            name="subject"
            value={filters.subject}
            onChange={handleInput}
            placeholder="Search Class"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {/* <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
            Room
          </label>
          <input
            name="room"
            value={filters.room}
            onChange={handleInput}
            placeholder="Search room"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div> */}
      </div>

      {!loading && loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {loading ? (
        <Loader label="Loading schedules" />
      ) : !filtered.length ? (
        <EmptyState
          title="No schedules"
          description="No classes found for your courses."
        />
      ) : view === "list" ? (
        <div className="space-y-4">
          {filtered.map((s) => {
            const color = pickColorForCourse(s.courseId);
            return (
              <Card
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full bg-${color}-500`}
                    />
                    <h2 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {s.courseName || `Course ${s.courseId}`} /{" "}
                      {s.subjectName || `Subject ${s.subjectId}`}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {dayNames[s.dayOfWeek]} • {formatTime(s.startTime)} –{" "}
                    {formatTime(s.endTime)} • Room {s.roomNumber}
                    {s.isRecurring && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        Recurring
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDetailSchedule(s);
                      setShowDetails(true);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition"
                  >
                    Details
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="overflow-auto border rounded-md bg-white dark:bg-gray-800 p-4">
          <div className="flex gap-4">
            {/* Time axis */}
            <div className="w-20 flex-shrink-0">
              <div className="h-8" />
              {(() => {
                const startHour = 7;
                const endHour = 19;
                const hours = [];
                for (let h = startHour; h <= endHour; h++) hours.push(h);
                return (
                  <div className="relative">
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="h-12 text-xs text-gray-500 dark:text-gray-400 flex items-center"
                        style={{ height: `${60}px` }}
                      >
                        {h % 12 === 0 ? 12 : h % 12}:00
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Days columns */}
            <div className="flex-1 min-w-[1050px]">
              <div className="grid grid-cols-7 gap-4">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                  const dayName = dayNames[dayIndex];
                  const dayItems = groupedByDay.get(dayIndex) || [];

                  const parseMinutes = (t) => {
                    if (!t) return 0;
                    const parts = String(t).split(":");
                    const hh = Number(parts[0] || 0);
                    const mm = Number(parts[1] || 0);
                    return hh * 60 + mm;
                  };

                  const startHour = 7;
                  const endHour = 19;
                  const totalMinutes = (endHour - startHour) * 60;
                  const minuteHeight = 1; // px per minute
                  const containerHeight = totalMinutes * minuteHeight;

                  const items = dayItems.map((it) => {
                    const s = parseMinutes(it.startTime);
                    const e = parseMinutes(it.endTime);
                    return { ...it, startMin: s, endMin: e };
                  });

                  const columns = [];
                  const placed = items.map((ev) => ({ ...ev, col: 0 }));
                  placed.sort((a, b) => a.startMin - b.startMin);
                  for (const ev of placed) {
                    let placedCol = -1;
                    for (let c = 0; c < columns.length; c++) {
                      if (columns[c] <= ev.startMin) {
                        placedCol = c;
                        columns[c] = ev.endMin;
                        break;
                      }
                    }
                    if (placedCol === -1) {
                      columns.push(ev.endMin);
                      placedCol = columns.length - 1;
                    }
                    ev.col = placedCol;
                  }

                  const colCount = Math.max(1, columns.length);

                  const colorMap = {
                    indigo: "#6366f1",
                    violet: "#7c3aed",
                    emerald: "#10b981",
                    rose: "#f43f5e",
                    amber: "#f59e0b",
                    cyan: "#06b6d4",
                    fuchsia: "#d946ef",
                    orange: "#f97316",
                    blue: "#3b82f6",
                    teal: "#14b8a6",
                    gray: "#9ca3af",
                  };

                  const getColor = (courseId) => {
                    const name = pickColorForCourse(courseId);
                    return colorMap[name] || colorMap.gray;
                  };

                  return (
                    <div key={dayName} className="flex flex-col">
                      <div className="mb-2 font-medium text-sm text-gray-700 dark:text-gray-200">
                        {dayName}
                      </div>
                      <div
                        className="relative rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
                        style={{ height: containerHeight }}
                      >
                        {/* hour separators */}
                        {Array.from({ length: endHour - startHour }).map(
                          (_, i) => (
                            <div
                              key={i}
                              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-700"
                              style={{ top: `${i * 60 * minuteHeight}px` }}
                            />
                          )
                        )}

                        {placed.map((s) => {
                          const top = Math.max(
                            0,
                            (s.startMin - startHour * 60) * minuteHeight
                          );
                          const height = Math.max(
                            28,
                            Math.max(15, s.endMin - s.startMin) * minuteHeight
                          );
                          const widthPercent = 100 / colCount;
                          const leftPercent = s.col * widthPercent;
                          const primary = getColor(s.courseId);
                          const gradient = `linear-gradient(135deg, ${primary}20, ${primary}10)`;
                          return (
                            <div
                              key={s.id}
                              className="absolute rounded-lg p-2 shadow-md cursor-pointer overflow-hidden"
                              onClick={() => {
                                setDetailSchedule(s);
                                setShowDetails(true);
                              }}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                left: `${leftPercent}%`,
                                width: `calc(${widthPercent}% - 6px)`,
                                marginLeft: "3px",
                                marginRight: "3px",
                                background: gradient,
                                borderLeft: `4px solid ${primary}`,
                              }}
                              title={`${s.courseName} • ${
                                s.subjectName
                              } • ${formatTime(s.startTime)} - ${formatTime(
                                s.endTime
                              )}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    {s.courseName || `Course ${s.courseId}`}
                                  </div>
                                  <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
                                    {s.subjectName || `Subject ${s.subjectId}`}
                                  </div>
                                </div>
                                <div className="text-[11px] text-gray-700 dark:text-gray-200 ml-2">
                                  {formatTime(s.startTime)}
                                </div>
                              </div>
                              {/* <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">
                                Room {s.roomNumber}
                              </div> */}
                            </div>
                          );
                        })}

                        {placed.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                            No classes
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Schedule Details"
      >
        <div className="space-y-3">
          {detailSchedule ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Course</div>
                <div className="font-medium">{detailSchedule.courseName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Class</div>
                <div className="font-medium">{detailSchedule.subjectName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Day</div>
                <div className="font-medium">
                  {dayNames[detailSchedule.dayOfWeek]}
                </div>
              </div>
              {/* <div>
                <div className="text-xs text-gray-500">Room</div>
                <div className="font-medium">{detailSchedule.roomNumber}</div>
              </div> */}
              <div>
                <div className="text-xs text-gray-500">Start</div>
                <div className="font-medium">
                  {formatTime(detailSchedule.startTime)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">End</div>
                <div className="font-medium">
                  {formatTime(detailSchedule.endTime)}
                </div>
              </div>
              <div className="col-span-1">
                <div className="text-xs text-gray-500">Recurring</div>
                <div className="font-medium">
                  {detailSchedule.isRecurring ? "Yes" : "No"}
                </div>
              </div>
            </div>
          ) : (
            <div>No details available</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TeacherClassSchedule;
