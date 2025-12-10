import axios from "axios";

const pad2 = (value) => {
  const num = Number(value);
  const finite = Number.isFinite(num) ? Math.trunc(Math.abs(num)) : 0;
  return String(finite).padStart(2, "0");
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const parseTimeValue = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
      const parts = trimmed.split(":").map((part) => part.trim());
      while (parts.length < 3) parts.push("00");
      return {
        h: toFiniteNumber(parts[0]) ?? 0,
        m: toFiniteNumber(parts[1]) ?? 0,
        s: toFiniteNumber(parts[2]) ?? 0,
      };
    }

    const parsedDate = Date.parse(trimmed);
    if (!Number.isNaN(parsedDate)) {
      const date = new Date(parsedDate);
      return {
        h: date.getHours(),
        m: date.getMinutes(),
        s: date.getSeconds(),
      };
    }

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const totalSeconds = Math.max(0, Math.trunc(numeric));
      return {
        h: Math.floor(totalSeconds / 3600) % 24,
        m: Math.floor((totalSeconds % 3600) / 60),
        s: totalSeconds % 60,
      };
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const totalSeconds = Math.max(0, Math.trunc(value));
    return {
      h: Math.floor(totalSeconds / 3600) % 24,
      m: Math.floor((totalSeconds % 3600) / 60),
      s: totalSeconds % 60,
    };
  }

  if (typeof value === "object") {
    const hours =
      toFiniteNumber(value.Hours) ??
      toFiniteNumber(value.hours) ??
      toFiniteNumber(value.hour) ??
      toFiniteNumber(value.Hour);
    const minutes =
      toFiniteNumber(value.Minutes) ??
      toFiniteNumber(value.minutes) ??
      toFiniteNumber(value.minute) ??
      toFiniteNumber(value.Minute);
    const seconds =
      toFiniteNumber(value.Seconds) ??
      toFiniteNumber(value.seconds) ??
      toFiniteNumber(value.second) ??
      toFiniteNumber(value.Second) ??
      (value.Milliseconds ? Math.floor(Number(value.Milliseconds) / 1000) : 0);

    if (hours !== null && minutes !== null) {
      return {
        h: hours,
        m: minutes,
        s: seconds ?? 0,
      };
    }

    if (typeof value.toString === "function") {
      const asString = value.toString();
      if (asString && asString !== "[object Object]") {
        return parseTimeValue(asString);
      }
    }
  }

  return null;
};

const normalizeTimeValue = (value) => {
  const parts = parseTimeValue(value);
  if (!parts) return "";

  const hours = Number.isFinite(parts.h) ? parts.h : 0;
  const minutes = Number.isFinite(parts.m) ? parts.m : 0;
  const seconds = Number.isFinite(parts.s) ? parts.s : 0;

  return `${pad2(hours % 24)}:${pad2(minutes % 60)}:${pad2(seconds % 60)}`;
};

const toApiTime = (value) => {
  const normalized = normalizeTimeValue(value);
  return normalized || null;
};

const toBoolean = (value) => {
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(lowered)) return true;
    if (["false", "0", "no", "n"].includes(lowered)) return false;
  }
  return Boolean(value);
};

const toNumberOrNull = (value) => {
  const num = toFiniteNumber(value);
  return num === null ? null : num;
};

const normalizeDayForUi = (value) => {
  const num = toFiniteNumber(value);
  if (num === null) return 0;
  if (num >= 0 && num <= 6) return Math.trunc(num);
  if (num >= 1 && num <= 7) return Math.trunc(num) - 1;
  const normalized = ((Math.trunc(num) % 7) + 7) % 7;
  return normalized;
};

const normalizeDayForApi = (value) => {
  // Normalize incoming day values into 0..6 (Sunday=0..Saturday=6)
  // Previously this function returned 1..7 which caused an off-by-one
  // shift when the UI provided 0..6. Keep API payload consistent
  // by sending 0..6 so the selected weekday is preserved.
  const num = toFiniteNumber(value);
  if (num === null) return null;
  if (num >= 0 && num <= 6) return Math.trunc(num);
  if (num >= 1 && num <= 7) return Math.trunc(num) - 1;
  const normalized = ((Math.trunc(num) % 7) + 7) % 7;
  return normalized;
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.classSchedules)) return payload.classSchedules;
    if (Array.isArray(payload.ClassSchedules)) return payload.ClassSchedules;
  }
  return [];
};

const resolveScheduleId = (raw) => {
  const idCandidates = [
    raw?.ScheduleID,
    raw?.scheduleID,
    raw?.ScheduleId,
    raw?.scheduleId,
    raw?.ScheduleID,
    raw?.id,
    raw?.Id,
  ];
  for (const candidate of idCandidates) {
    const num = toNumberOrNull(candidate);
    if (num !== null) return num;
  }
  return null;
};

const mapSchedule = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const scheduleId = resolveScheduleId(raw);

  const course =
    raw.Course || raw.course || raw.CourseDetails || raw.courseDetails || {};
  const subject =
    raw.Subject ||
    raw.subject ||
    raw.SubjectDetails ||
    raw.subjectDetails ||
    {};

  const courseId =
    toNumberOrNull(raw.CourseID) ??
    toNumberOrNull(raw.courseID) ??
    toNumberOrNull(raw.CourseId) ??
    toNumberOrNull(raw.courseId) ??
    toNumberOrNull(course.CourseID) ??
    toNumberOrNull(course.CourseId) ??
    toNumberOrNull(course.courseID) ??
    toNumberOrNull(course.courseId) ??
    toNumberOrNull(course.id) ??
    null;

  const subjectId =
    toNumberOrNull(raw.SubjectID) ??
    toNumberOrNull(raw.subjectID) ??
    toNumberOrNull(raw.SubjectId) ??
    toNumberOrNull(raw.subjectId) ??
    toNumberOrNull(subject.SubjectID) ??
    toNumberOrNull(subject.SubjectId) ??
    toNumberOrNull(subject.subjectID) ??
    toNumberOrNull(subject.subjectId) ??
    toNumberOrNull(subject.id) ??
    null;

  const courseName =
    course.name ??
    course.Name ??
    course.courseName ??
    course.CourseName ??
    raw.CourseName ??
    raw.courseName ??
    "";

  const subjectName =
    subject.name ??
    subject.Name ??
    subject.subjectName ??
    subject.SubjectName ??
    raw.SubjectName ??
    raw.subjectName ??
    "";

  const dayOfWeek = normalizeDayForUi(
    raw.DayOfWeek ??
      raw.dayOfWeek ??
      raw.day ??
      raw.day_index ??
      raw.dayIndex ??
      course.DayOfWeek ??
      course.dayOfWeek
  );

  const startTime = normalizeTimeValue(
    raw.StartTime ?? raw.startTime ?? raw.start_time
  );
  const endTime = normalizeTimeValue(
    raw.EndTime ?? raw.endTime ?? raw.end_time
  );
  const roomNumber = raw.RoomNumber ?? raw.roomNumber ?? raw.Room ?? "";
  const isRecurring = toBoolean(
    raw.IsRecurring ?? raw.isRecurring ?? raw.recurring
  );
  const isActive = toBoolean(
    raw.IsActive ?? raw.isActive ?? raw.active ?? true
  );
  const classDate = raw.ClassDate ?? raw.classDate ?? raw.class_date ?? null;
  const normalizedClassDate = classDate ? 
    (classDate.includes('T') ? classDate.split('T')[0] : classDate) : null;

  const fallbackId = `${
    courseId ?? "course"
  }-${dayOfWeek}-${startTime}-${endTime}-${roomNumber}`;

  return {
    id: scheduleId ?? fallbackId,
    scheduleId: scheduleId ?? null,
    courseId,
    subjectId,
    dayOfWeek,
    startTime,
    endTime,
    roomNumber: roomNumber ?? "",
    isRecurring,
    isActive,
    classDate: normalizedClassDate,
    courseName,
    subjectName,
    raw,
  };
};

const serializeSchedule = (input) => {
  const classDate = input?.classDate ?? input?.ClassDate ?? null;
  const payload = {
    CourseID: toNumberOrNull(input?.courseId ?? input?.CourseID),
    SubjectID: toNumberOrNull(input?.subjectId ?? input?.SubjectID),
    DayOfWeek: normalizeDayForApi(input?.dayOfWeek ?? input?.DayOfWeek),
    StartTime: toApiTime(input?.startTime ?? input?.StartTime),
    EndTime: toApiTime(input?.endTime ?? input?.EndTime),
    RoomNumber: input?.roomNumber ?? input?.RoomNumber ?? "",
    IsRecurring: toBoolean(input?.isRecurring ?? input?.IsRecurring),
    IsActive: toBoolean(input?.isActive ?? input?.IsActive ?? true),
    ClassDate: classDate || null,
  };

  if (payload.SubjectID === null) delete payload.SubjectID;
  if (payload.StartTime === null) delete payload.StartTime;
  if (payload.EndTime === null) delete payload.EndTime;
  if (payload.ClassDate === null) delete payload.ClassDate;

  return payload;
};

export const getAllClassSchedules = async () => {
  try {
    const response = await axios.get("/ClassSchedules");
    const list = extractList(response.data);
    return list.map(mapSchedule).filter(Boolean);
  } catch (error) {
    console.error("Failed to load class schedules via API", error);
    throw error;
  }
};

export const getClassScheduleById = async (scheduleId) => {
  const resolvedId = toNumberOrNull(scheduleId);
  if (resolvedId === null) return null;
  try {
    const response = await axios.get(`/ClassSchedules/${resolvedId}`);
    return mapSchedule(response.data);
  } catch (error) {
    console.error(`Failed to load class schedule ${resolvedId} via API`, error);
    throw error;
  }
};

export const createClassSchedule = async (schedule) => {
  try {
    const payload = serializeSchedule(schedule);
    const response = await axios.post("/ClassSchedules", payload);
    const created = mapSchedule(response.data);
    const newId =
      resolveScheduleId(response.data) ?? created?.scheduleId ?? created?.id;
    if (newId !== null && newId !== undefined) {
      try {
        const refreshed = await getClassScheduleById(newId);
        if (refreshed) return refreshed;
      } catch (_) {
        // ignore refresh errors, fall back to created mapping
      }
    }
    return created;
  } catch (error) {
    console.error("Failed to create class schedule via API", error);
    throw error;
  }
};

export const updateClassSchedule = async (scheduleId, schedule) => {
  const resolvedId = toNumberOrNull(scheduleId);
  if (resolvedId === null) {
    throw new Error(
      "A valid schedule id is required to update a class schedule."
    );
  }
  try {
    const payload = serializeSchedule(schedule);
    // Ensure backend-required ScheduleID present in body for PUT
    if (!payload.ScheduleID) payload.ScheduleID = resolvedId;
    await axios.put(`/ClassSchedules/${resolvedId}`, payload);
    try {
      return await getClassScheduleById(resolvedId);
    } catch (_) {
      // if follow-up fetch fails, attempt to build a minimal record
      return mapSchedule({
        ...schedule,
        ScheduleID: resolvedId,
        CourseID: payload.CourseID,
        SubjectID: payload.SubjectID,
        DayOfWeek: payload.DayOfWeek,
        StartTime: payload.StartTime,
        EndTime: payload.EndTime,
        RoomNumber: payload.RoomNumber,
        IsRecurring: payload.IsRecurring,
      });
    }
  } catch (error) {
    console.error(
      `Failed to update class schedule ${resolvedId} via API`,
      error
    );
    throw error;
  }
};

export const deleteClassSchedule = async (scheduleId) => {
  const resolvedId = toNumberOrNull(scheduleId);
  if (resolvedId === null) {
    throw new Error(
      "A valid schedule id is required to delete a class schedule."
    );
  }
  try {
    await axios.delete(`/ClassSchedules/${resolvedId}`);
    return true;
  } catch (error) {
    console.error(
      `Failed to delete class schedule ${resolvedId} via API`,
      error
    );
    throw error;
  }
};

export default {
  getAllClassSchedules,
  getClassScheduleById,
  createClassSchedule,
  updateClassSchedule,
  deleteClassSchedule,
};
