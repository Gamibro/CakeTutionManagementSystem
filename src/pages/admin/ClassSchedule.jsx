import React, { useEffect, useMemo, useState } from "react";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import Card from "../../components/common/Card";
import { getAllCourses } from "../../services/courseService";
import { getAllSubjects } from "../../services/subjectService";
import {
  createClassSchedule,
  deleteClassSchedule,
  getAllClassSchedules,
  updateClassSchedule,
} from "../../services/classScheduleService";

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
  const [hh, mm] = t.split(":");
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

const AdminClassSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [view, setView] = useState("week");
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ course: "", subject: "", room: "" });
  const [coursesList, setCoursesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [formCourseId, setFormCourseId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formDayOfWeek, setFormDayOfWeek] = useState(0);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formRoomNumber, setFormRoomNumber] = useState("");
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [formSubmitError, setFormSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailSchedule, setDetailSchedule] = useState(null);

  const padTime = (value) => {
    const num = Number(value);
    const finite = Number.isFinite(num) ? Math.max(0, Math.trunc(num)) : 0;
    return String(finite).padStart(2, "0");
  };

  const toTimeInputValue = (value, fallback = "09:00") => {
    if (!value && value !== 0) return fallback;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return fallback;
      if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
        const [h, m] = trimmed.split(":");
        return `${padTime(h)}:${padTime(m)}`;
      }
      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) {
        const date = new Date(parsed);
        return `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
      }
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const totalMinutes = Math.max(0, Math.trunc(value));
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${padTime(hours)}:${padTime(minutes)}`;
    }
    return fallback;
  };

  const sortSchedules = (items) => {
    if (!Array.isArray(items)) return [];
    const cloned = [...items];
    cloned.sort((a, b) => {
      const dayA = Number.isFinite(a?.dayOfWeek) ? a.dayOfWeek : 0;
      const dayB = Number.isFinite(b?.dayOfWeek) ? b.dayOfWeek : 0;
      if (dayA !== dayB) return dayA - dayB;
      const startA = a?.startTime ?? "";
      const startB = b?.startTime ?? "";
      return String(startA).localeCompare(String(startB));
    });
    return cloned;
  };

  const upsertScheduleRecord = (record) => {
    if (!record || typeof record !== "object") return;
    const idValue =
      record.id ?? record.scheduleId ?? record.ScheduleID ?? record.ScheduleId;
    const idString = idValue != null ? String(idValue) : null;
    setSchedules((list) => {
      if (!idString) {
        return sortSchedules([...list, record]);
      }
      const exists = list.some(
        (item) => String(item.id ?? item.scheduleId ?? "") === idString
      );
      if (exists) {
        const updated = list.map((item) =>
          String(item.id ?? item.scheduleId ?? "") === idString ? record : item
        );
        return sortSchedules(updated);
      }
      return sortSchedules([...list, record]);
    });
  };

  const removeScheduleById = (identifier) => {
    const idString = identifier != null ? String(identifier) : null;
    if (!idString) return;
    setSchedules((list) =>
      sortSchedules(
        list.filter(
          (item) => String(item.id ?? item.scheduleId ?? "") !== idString
        )
      )
    );
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [scheduleData, courses, subjects] = await Promise.all([
          getAllClassSchedules(),
          getAllCourses(),
          getAllSubjects(),
        ]);
        if (!mounted) return;
        setSchedules(
          sortSchedules(Array.isArray(scheduleData) ? scheduleData : [])
        );
        setCoursesList(courses || []);
        setSubjectsList(subjects || []);
      } catch (err) {
        if (!mounted) return;
        console.error("Failed to load schedules, courses, or subjects", err);
        setLoadError("Unable to load schedules. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // validate live and set validity flag
  useEffect(() => {
    const ok = validateForm();
    setIsFormValid(ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCourseId, formSubjectId, formStartTime, formEndTime, formRoomNumber]);

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
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
        !String(s.roomNumber).toLowerCase().includes(filters.room.toLowerCase())
      )
        return false;
      return true;
    });
  }, [schedules, filters]);

  const groupedByDay = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const day = item.dayOfWeek;
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(item);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [filtered]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  useEffect(() => {
    // reset form fields when opening modal
    if (!showCreate) return;
    if (editingSchedule) {
      setFormCourseId(
        editingSchedule.courseId != null ? String(editingSchedule.courseId) : ""
      );
      setFormSubjectId(
        editingSchedule.subjectId != null
          ? String(editingSchedule.subjectId)
          : ""
      );
      setFormDayOfWeek(
        Number.isFinite(editingSchedule.dayOfWeek)
          ? editingSchedule.dayOfWeek
          : 0
      );
      setFormStartTime(toTimeInputValue(editingSchedule.startTime));
      setFormEndTime(toTimeInputValue(editingSchedule.endTime, "10:00"));
      setFormRoomNumber(editingSchedule.roomNumber || "");
      setFormIsRecurring(Boolean(editingSchedule.isRecurring));
      setFormErrors({});
      setFormSubmitError(null);
      return;
    }
    setFormCourseId("");
    setFormSubjectId("");
    setFormDayOfWeek(0);
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormRoomNumber("");
    setFormIsRecurring(false);
    setFormErrors({});
    setFormSubmitError(null);
  }, [showCreate, editingSchedule]);

  const validateForm = () => {
    const errors = {};
    if (!formCourseId) errors.courseId = "Please select a course.";
    if (!formSubjectId) errors.subjectId = "Please select a class.";
    if (!formStartTime) errors.startTime = "Start time is required.";
    if (!formEndTime) errors.endTime = "End time is required.";
    if (formStartTime && formEndTime) {
      const [sh, sm] = String(formStartTime).split(":").map(Number);
      const [eh, em] = String(formEndTime).split(":").map(Number);
      const startMin = sh * 60 + (sm || 0);
      const endMin = eh * 60 + (em || 0);
      if (endMin <= startMin)
        errors.timeOrder = "End time must be after start time.";
    }
    // if (!formRoomNumber || !String(formRoomNumber).trim())
    //   errors.roomNumber = "Room is required.";
    // setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    // when course changes, if there's exactly one matching subject, preselect it
    if (!formCourseId) return;
    const cid = String(formCourseId);
    const filtered = (subjectsList || []).filter((s) => {
      const ids = (s.courseIds || s.CourseIDs || s.courseIds || []).map((x) =>
        String(x)
      );
      return ids.length ? ids.includes(cid) : true;
    });
    if (filtered.length === 1 && !formSubjectId) {
      setFormSubjectId(String(filtered[0].id));
    }
  }, [formCourseId, subjectsList, formSubjectId]);

  const resolveScheduleId = (schedule) => {
    if (!schedule) return null;
    if (typeof schedule === "number" || typeof schedule === "string") {
      return schedule;
    }
    return (
      schedule.scheduleId ??
      schedule.ScheduleID ??
      schedule.ScheduleId ??
      schedule.id ??
      schedule.Id ??
      null
    );
  };

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setFormSubmitError(null);
    setShowCreate(true);
  };

  const handleModalClose = () => {
    setShowCreate(false);
    setEditingSchedule(null);
    setFormSubmitError(null);
  };

  const handleEditSchedule = (schedule) => {
    if (!schedule) return;
    setEditingSchedule(schedule);
    setFormSubmitError(null);
    setShowCreate(true);
  };

  const openDetails = (schedule) => {
    setDetailSchedule(schedule);
    setShowDetails(true);
  };

  const handleDeleteSchedule = async (schedule) => {
    const identifier = resolveScheduleId(schedule);
    if (identifier === null || identifier === undefined) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Are you sure you want to delete this schedule?"
      );
      if (!confirmed) return;
    }
    const idString = String(identifier);
    try {
      setDeletingId(idString);
      await deleteClassSchedule(identifier);
      removeScheduleById(identifier);
    } catch (err) {
      console.error("Failed to delete class schedule", err);
      if (typeof window !== "undefined") {
        window.alert("Failed to delete the schedule. Please try again.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = {
      courseId: formCourseId ? Number(formCourseId) : null,
      subjectId: formSubjectId ? Number(formSubjectId) : null,
      dayOfWeek: Number.isFinite(formDayOfWeek) ? formDayOfWeek : 0,
      startTime: formStartTime,
      endTime: formEndTime,
      roomNumber: formRoomNumber,
      isRecurring: formIsRecurring,
    };

    setSaving(true);
    setFormSubmitError(null);

    try {
      if (editingSchedule) {
        const identifier = resolveScheduleId(editingSchedule);
        if (identifier === null || identifier === undefined) {
          throw new Error("Missing schedule identifier");
        }
        const updated = await updateClassSchedule(identifier, payload);
        upsertScheduleRecord(updated ?? { ...payload, id: identifier });
      } else {
        const created = await createClassSchedule(payload);
        upsertScheduleRecord(created ?? payload);
      }
      handleModalClose();
    } catch (err) {
      console.error("Failed to save class schedule", err);
      setFormSubmitError("Failed to save schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Class Schedule
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage weekly class times.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === "week" ? "list" : "week")}
            className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
          >
            {view === "week" ? "List View" : "Week View"}
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors"
          >
            Add Schedule
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
          description="Try adjusting filters or add a new schedule."
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
                    ></span>
                    <h2 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {s.courseName || `Course ${s.courseId}`} /{" "}
                      {s.subjectName || `Subject ${s.subjectId}`}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {dayNames[s.dayOfWeek]} • {formatTime(s.startTime)} –{" "}
                    {formatTime(s.endTime)}
                    {/* Room display intentionally commented out
                    • Room {s.roomNumber}
                    */}
                    {s.isRecurring && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        Recurring
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSchedule(s);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={Boolean(deletingId)}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSchedule(s);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={deletingId === String(s.id ?? s.scheduleId ?? "")}
                  >
                    {deletingId === String(s.id ?? s.scheduleId ?? "")
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        // Enhanced week view with time axis and positioned blocks
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
                {/* iterate Monday -> Sunday using index order [1..6,0] */}
                {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                  const dayName = dayNames[dayIndex];
                  const dayItems = groupedByDay.get(dayIndex) || [];

                  // layout computation: convert times to minutes and assign columns for overlaps
                  const parseMinutes = (t) => {
                    if (!t) return 0;
                    const [hh, mm] = t.split(":");
                    return Number(hh) * 60 + Number(mm);
                  };

                  const startHour = 7;
                  const endHour = 19;
                  const totalMinutes = (endHour - startHour) * 60;
                  const minuteHeight = 1; // px per minute
                  const containerHeight = totalMinutes * minuteHeight; // px

                  // prepare events with minutes
                  const items = dayItems.map((it) => {
                    const s = parseMinutes(it.startTime);
                    const e = parseMinutes(it.endTime);
                    return { ...it, startMin: s, endMin: e };
                  });

                  // assign columns greedily
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
                          const gradient = `linear-gradient(135deg, ${primary}20, ${primary}10)`; // translucent gradient
                          return (
                            <div
                              key={s.id}
                              className="absolute rounded-lg p-2 shadow-md cursor-pointer overflow-hidden"
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
                              onClick={() => openDetails(s)}
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
        isOpen={showCreate}
        onClose={handleModalClose}
        title={editingSchedule ? "Edit Schedule" : "Add Schedule"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Course
                </label>
                <select
                  name="courseId"
                  value={formCourseId}
                  onChange={(e) => {
                    setFormCourseId(e.target.value);
                    setFormSubjectId("");
                  }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">-- Select course --</option>
                  {coursesList.map((c) => (
                    <option
                      key={String(
                        c.id || c.CourseID || c.CourseId || c.courseId
                      )}
                      value={String(
                        c.id ?? c.CourseID ?? c.CourseId ?? c.courseId
                      )}
                    >
                      {c.name || c.CourseName || c.title || c.courseName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Class
                </label>
                <select
                  name="subjectId"
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">-- Select class --</option>
                  {(subjectsList || [])
                    .filter((s) => {
                      if (!formCourseId) return true;
                      const cid = String(formCourseId);
                      const ids = (
                        s.courseIds ||
                        s.CourseIDs ||
                        s.courseIds ||
                        []
                      ).map((x) => String(x));
                      // allow subjects that list the selected course or those that have no course restriction
                      return ids.length ? ids.includes(cid) : true;
                    })
                    .map((s) => (
                      <option key={String(s.id)} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Day Of Week
                </label>
                <select
                  name="dayOfWeek"
                  value={formDayOfWeek}
                  onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  {dayNames.map((d, i) => (
                    <option value={i} key={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              {/* <div className="flex flex-col">
              <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
                Room
              </label>
              <input
                name="roomNumber"
                value={formRoomNumber}
                onChange={(e) => setFormRoomNumber(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm"
              />
              {formErrors.roomNumber && (
                <div className="text-xs text-red-500 mt-1">
                  {formErrors.roomNumber}
                </div>
              )}
            </div> */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Start Time
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                {formErrors.startTime && (
                  <div className="text-xs text-red-500 mt-1">
                    {formErrors.startTime}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  End Time
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                {formErrors.endTime && (
                  <div className="text-xs text-red-500 mt-1">
                    {formErrors.endTime}
                  </div>
                )}
                {formErrors.timeOrder && (
                  <div className="text-xs text-red-500 mt-1">
                    {formErrors.timeOrder}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/60 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      name="isRecurring"
                      checked={formIsRecurring}
                      onChange={(e) => setFormIsRecurring(!!e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="isRecurring"
                      className="text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                      Recurring weekly
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
                    Enable this option to automatically repeat the class every
                    week.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {formSubmitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formSubmitError}
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={handleModalClose}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || saving}
              className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto ${
                isFormValid && !saving
                  ? "bg-indigo-600 hover:bg-indigo-500"
                  : "bg-indigo-300 cursor-not-allowed"
              }`}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

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

export default AdminClassSchedule;
