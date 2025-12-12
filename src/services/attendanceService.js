import axios from "axios";
import { ATTENDANCE_STATUS } from "../utils/constants";

const sanitizeRecordPayload = (source) => {
  if (!source || typeof source !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
};

const normalizeIdentifier = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
};

const toNumericId = (value) => {
  const normalized = normalizeIdentifier(value);
  if (normalized === null) {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const toIsoOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const mapAttendanceStatus = (value) => {
  if (value === undefined || value === null) {
    return ATTENDANCE_STATUS.PRESENT;
  }

  const text = String(value).toLowerCase();

  if (text === "present" || text === "p") {
    return ATTENDANCE_STATUS.PRESENT;
  }

  if (text === "absent" || text === "a" || text === "0") {
    return ATTENDANCE_STATUS.ABSENT;
  }

  if (text === "late" || text === "l") {
    return ATTENDANCE_STATUS.LATE;
  }

  return String(value);
};

const toIsoDate = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
};

/**
 * Get attendance by student ID and subject ID
 */
export const getAttendanceByStudentAndSubject = async (studentId, subjectId) => {
  const API_BASE = "http://localhost:50447/api";
  
  try {
    const response = await axios.get(
      `${API_BASE}/GetAtendByStudentAndSubject`,
      {
        params: { studentId, subjectId },
      }
    );
    return response.data || [];
  } catch (error) {
    console.error("Error fetching attendance by student and subject:", error);
    throw error;
  }
};

const buildAttendanceRecord = (record) => {
  if (!record || typeof record !== "object") {
    return null;
  }

  const student =
    record.Student ||
    record.student ||
    record.StudentDetails ||
    record.studentDetails ||
    {};

  const course =
    record.Course ||
    record.course ||
    record.CourseDetails ||
    record.courseDetails ||
    {};

  const resolvedId =
    record.AttendanceID ??
    record.attendanceID ??
    record.AttendanceId ??
    record.attendanceId ??
    record.AttendanceRecordID ??
    record.attendanceRecordId ??
    record.id ??
    null;

  const courseId =
    record.CourseID ??
    record.courseID ??
    record.courseId ??
    record.CourseId ??
    course.CourseID ??
    course.courseID ??
    course.courseId ??
    course.id ??
    null;

  const studentId =
    record.StudentID ??
    record.studentID ??
    record.studentId ??
    record.StudentId ??
    student.StudentID ??
    student.studentID ??
    student.studentId ??
    student.id ??
    null;

  const status = mapAttendanceStatus(
    record.Status ??
      record.status ??
      record.AttendanceStatus ??
      record.attendanceStatus ??
      (record.isPresent === false
        ? "Absent"
        : record.isPresent === true
        ? "Present"
        : undefined)
  );

  const date = toIsoDate(
    record.Date ??
      record.date ??
      record.AttendanceDate ??
      record.attendanceDate ??
      record.SessionDate ??
      record.sessionDate ??
      record.RecordedAt ??
      record.recordedAt ??
      record.CreatedAt ??
      record.createdAt ??
      record.timestamp
  );

  const sessionId =
    record.SessionID ??
    record.sessionID ??
    record.SessionId ??
    record.sessionId ??
    record.Session?.SessionID ??
    record.session?.sessionId ??
    null;

  const recordData = {
    id:
      resolvedId ??
      `${courseId ?? "course"}-${studentId ?? "student"}-${date ?? Date.now()}`,
    attendanceId: resolvedId ?? null,
    AttendanceID: resolvedId ?? null,
    courseId,
    CourseID: courseId,
    studentId,
    StudentID: studentId,
    status,
    Status: status,
    date,
    Date: date,
    sessionId,
    SessionID: sessionId,
    raw: record,
  };

  return recordData;
};

const extractAttendance = (payload) => {
  const list = (() => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object") {
      if (Array.isArray(payload.data)) {
        return payload.data;
      }
      if (Array.isArray(payload.records)) {
        return payload.records;
      }
      if (Array.isArray(payload.attendance)) {
        return payload.attendance;
      }
      if (Array.isArray(payload.Attendance)) {
        return payload.Attendance;
      }
      if (Array.isArray(payload.items)) {
        return payload.items;
      }
      if (Array.isArray(payload.results)) {
        return payload.results;
      }
    }

    return [];
  })();

  return list.map(buildAttendanceRecord).filter(Boolean);
};

const fetchAttendance = async (url, config) => {
  const response = await axios.get(url, config);
  return extractAttendance(response.data);
};

const buildQrSession = (session) => {
  if (!session || typeof session !== "object") {
    return null;
  }

  const course = session.Course ?? session.course ?? {};
  const teacher = session.Teacher ?? session.teacher ?? {};

  const sessionId =
    session.SessionID ??
    session.sessionID ??
    session.sessionId ??
    session.id ??
    null;

  const courseId =
    session.CourseID ??
    session.courseID ??
    session.courseId ??
    session.CourseId ??
    course.CourseID ??
    course.courseID ??
    course.courseId ??
    course.id ??
    null;

  const teacherId =
    session.TeacherID ??
    session.teacherID ??
    session.teacherId ??
    session.TeacherId ??
    teacher.TeacherID ??
    teacher.teacherID ??
    teacher.teacherId ??
    teacher.id ??
    null;

  const startTime =
    toIsoOrNull(session.StartTime ?? session.startTime) ??
    toIsoOrNull(session.SessionStart);
  const endTime =
    toIsoOrNull(session.EndTime ?? session.endTime) ??
    toIsoOrNull(session.SessionEnd);
  const expiryTime =
    toIsoOrNull(session.ExpiryTime ?? session.expiryTime) ??
    toIsoOrNull(session.SessionExpiry ?? session.expiry);
  const sessionDate =
    toIsoOrNull(session.SessionDate ?? session.sessionDate) ?? startTime;

  const qrCodeData =
    session.QRCodeData ??
    session.qrCodeData ??
    session.QRCode ??
    session.qrCode ??
    null;

  return {
    id:
      sessionId ??
      qrCodeData ??
      `${normalizeIdentifier(courseId) ?? "course"}-${Date.now()}`,
    sessionId: sessionId ?? null,
    SessionID: sessionId ?? null,
    courseId: normalizeIdentifier(courseId),
    CourseID: normalizeIdentifier(courseId),
    teacherId: normalizeIdentifier(teacherId),
    TeacherID: normalizeIdentifier(teacherId),
    qrCodeData,
    QRCodeData: qrCodeData,
    sessionDate,
    SessionDate: sessionDate,
    startTime,
    StartTime: startTime,
    endTime,
    EndTime: endTime,
    expiryTime,
    ExpiryTime: expiryTime,
    isActive:
      session.IsActive ??
      session.isActive ??
      session.Active ??
      session.active ??
      (expiryTime ? new Date(expiryTime).getTime() >= Date.now() : true),
    IsActive:
      session.IsActive ??
      session.isActive ??
      session.Active ??
      session.active ??
      (expiryTime ? new Date(expiryTime).getTime() >= Date.now() : true),
    createdAt: toIsoOrNull(session.CreatedAt ?? session.createdAt),
    CreatedAt: toIsoOrNull(session.CreatedAt ?? session.createdAt),
    course,
    teacher,
    raw: session,
  };
};

const extractSessions = (payload) => {
  const list = (() => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object") {
      if (Array.isArray(payload.sessions)) {
        return payload.sessions;
      }
      if (Array.isArray(payload.Sessions)) {
        return payload.Sessions;
      }
      if (Array.isArray(payload.data)) {
        return payload.data;
      }
      if (Array.isArray(payload.items)) {
        return payload.items;
      }
      if (Array.isArray(payload.results)) {
        return payload.results;
      }
    }

    return [];
  })();

  return list.map(buildQrSession).filter(Boolean);
};

const fetchSessions = async (url, config) => {
  const response = await axios.get(url, config);
  return extractSessions(response.data);
};

const resolveCourseId = (courseId) => {
  return normalizeIdentifier(courseId);
};

const resolveStudentId = (studentId) => {
  return normalizeIdentifier(studentId);
};

const resolveTeacherId = (teacherId) => normalizeIdentifier(teacherId);

const getSessionCourseId = (session) =>
  resolveCourseId(
    session?.courseId ??
      session?.CourseID ??
      session?.CourseId ??
      session?.Course?.CourseID ??
      session?.Course?.courseID ??
      session?.Course?.courseId ??
      session?.Course?.CourseId ??
      null
  );

const getSessionTeacherId = (session) =>
  resolveTeacherId(
    session?.teacherId ??
      session?.TeacherID ??
      session?.TeacherId ??
      session?.Teacher?.TeacherID ??
      session?.Teacher?.teacherID ??
      session?.Teacher?.teacherId ??
      session?.Teacher?.TeacherId ??
      null
  );

const getSessionQrCode = (session) =>
  normalizeIdentifier(
    session?.QRCodeData ??
      session?.qrCodeData ??
      session?.QRCode ??
      session?.qrCode ??
      null
  );

const isNotFound = (error) => error?.response?.status === 404;

const isSessionActive = (session) => {
  if (!session || typeof session !== "object") {
    return false;
  }

  const activeFlag =
    session.IsActive ?? session.isActive ?? session.Active ?? session.active;

  if (activeFlag === false) {
    return false;
  }

  const now = Date.now();

  const start = toIsoOrNull(session.StartTime ?? session.startTime);
  if (start) {
    const startTime = new Date(start).getTime();
    if (Number.isFinite(startTime) && startTime > now) {
      return false;
    }
  }

  const expiry = toIsoOrNull(session.ExpiryTime ?? session.expiryTime);
  if (expiry) {
    const expiryTime = new Date(expiry).getTime();
    if (Number.isFinite(expiryTime) && expiryTime < now) {
      return false;
    }
    return true;
  }

  const end = toIsoOrNull(session.EndTime ?? session.endTime);
  if (end) {
    const endTime = new Date(end).getTime();
    if (Number.isFinite(endTime) && endTime < now) {
      return false;
    }
  }

  return activeFlag !== false;
};

const findActiveSession = async ({ courseId, teacherId, qrCodeData } = {}) => {
  const normalizedCourse = resolveCourseId(courseId);
  const normalizedTeacher = resolveTeacherId(teacherId);
  const normalizedCode = normalizeIdentifier(qrCodeData);

  const matchesCriteria = (session) => {
    if (!session || typeof session !== "object") {
      return false;
    }

    if (!isSessionActive(session)) {
      return false;
    }

    if (normalizedCourse) {
      const sessionCourse = getSessionCourseId(session);
      if (sessionCourse !== normalizedCourse) {
        return false;
      }
    }

    if (normalizedTeacher) {
      const sessionTeacher = getSessionTeacherId(session);
      if (sessionTeacher !== normalizedTeacher) {
        return false;
      }
    }

    if (normalizedCode) {
      const sessionCode = getSessionQrCode(session);
      if (normalizeIdentifier(sessionCode) !== normalizedCode) {
        return false;
      }
    }

    return true;
  };

  try {
    const sessions = await getActiveQRSessions();
    return sessions.find(matchesCriteria) ?? null;
  } catch (error) {
    console.error("Failed to find active QR session", error);
    return null;
  }
};

export const recordAttendance = async (arg1, arg2) => {
  const rawPayload =
    arg1 && typeof arg1 === "object" && !Array.isArray(arg1)
      ? arg1
      : { sessionId: arg1, studentId: arg2 };

  const payload = sanitizeRecordPayload(rawPayload);

  const resolvedStudentId =
    payload.studentId ?? payload.StudentID ?? payload.studentID ?? null;

  if (resolvedStudentId === null || resolvedStudentId === undefined) {
    throw new Error("Student ID is required to record attendance.");
  }

  const studentIdNumeric = toNumericId(resolvedStudentId);
  if (studentIdNumeric === null) {
    throw new Error("Student ID must be numeric to record attendance.");
  }

  const initialSessionId =
    payload.sessionId ??
    payload.SessionID ??
    payload.sessionID ??
    payload.SessionId ??
    payload.id ??
    payload.Id ??
    null;

  let sessionIdNumeric = toNumericId(initialSessionId);

  let normalizedCourseId = resolveCourseId(
    payload.courseId ??
      payload.CourseID ??
      payload.courseID ??
      payload.CourseId ??
      payload.Course?.CourseID ??
      payload.Course?.courseId ??
      null
  );

  let normalizedTeacherId = resolveTeacherId(
    payload.teacherId ??
      payload.TeacherID ??
      payload.teacherID ??
      payload.TeacherId ??
      payload.Teacher?.TeacherID ??
      payload.Teacher?.teacherId ??
      null
  );

  let normalizedSubjectId = normalizeIdentifier(
    payload.subjectId ??
      payload.SubjectID ??
      payload.subjectID ??
      payload.SubjectId ??
      payload.Subject?.SubjectID ??
      payload.Subject?.subjectId ??
      null
  );

  const qrCodeData =
    payload.QRCodeData ?? payload.qrCodeData ?? payload.code ?? payload.QRCode;
  const normalizedQrCode = normalizeIdentifier(qrCodeData);

  if (sessionIdNumeric === null) {
    const activeSession = await findActiveSession({
      courseId: normalizedCourseId,
      teacherId: normalizedTeacherId,
      qrCodeData: normalizedQrCode,
    });

    if (activeSession) {
      sessionIdNumeric = toNumericId(
        activeSession.SessionID ??
          activeSession.sessionId ??
          activeSession.sessionID ??
          activeSession.id ??
          null
      );

      if (!normalizedCourseId) {
        normalizedCourseId = getSessionCourseId(activeSession);
      }

      if (!normalizedTeacherId) {
        normalizedTeacherId = getSessionTeacherId(activeSession);
      }

      if (!normalizedSubjectId) {
        normalizedSubjectId = normalizeIdentifier(
          activeSession?.SubjectID ??
            activeSession?.subjectID ??
            activeSession?.SubjectId ??
            activeSession?.subjectId ??
            activeSession?.Subject?.SubjectID ??
            activeSession?.Subject?.subjectId ??
            null
        );
      }
    }
  }

  if (sessionIdNumeric === null) {
    throw new Error("A valid session ID is required to record attendance.");
  }

  const statusValue = mapAttendanceStatus(
    payload.status ?? payload.Status ?? payload.attendanceStatus
  );

  const scanTimeIso =
    toIsoOrNull(payload.scanTime ?? payload.ScanTime ?? payload.timestamp) ??
    new Date().toISOString();

  const deviceInfo = normalizeIdentifier(
    payload.DeviceInfo ?? payload.deviceInfo ?? null
  );
  const ipAddress = normalizeIdentifier(
    payload.IPAddress ?? payload.ipAddress ?? payload.ip ?? null
  );

  const courseIdNumeric = toNumericId(normalizedCourseId);
  const teacherIdNumeric = toNumericId(normalizedTeacherId);
  const subjectIdNumeric = toNumericId(normalizedSubjectId);

  const sessionStartIso =
    toIsoOrNull(
      payload.sessionStartTime ??
        payload.SessionStartTime ??
        payload.sessionStart ??
        payload.SessionStart ??
        payload.StartTime ??
        payload.startTime ??
        null
    ) ?? null;

  const sessionEndIso =
    toIsoOrNull(
      payload.sessionEndTime ??
        payload.SessionEndTime ??
        payload.sessionEnd ??
        payload.SessionEnd ??
        payload.EndTime ??
        payload.endTime ??
        null
    ) ?? null;

  const sessionDateIso =
    toIsoOrNull(
      payload.sessionDate ??
        payload.SessionDate ??
        payload.session_date ??
        payload.sessiondate ??
        null
    ) ??
    sessionStartIso ??
    scanTimeIso;

  const attendanceDateIso =
    toIsoOrNull(
      payload.attendanceDate ??
        payload.AttendanceDate ??
        payload.date ??
        payload.Date ??
        null
    ) ??
    sessionDateIso ??
    scanTimeIso;

  const requestBody = {
    SessionID: sessionIdNumeric,
    StudentID: studentIdNumeric,
    Status: statusValue,
    ScanTime: scanTimeIso,
  };

  if (courseIdNumeric !== null) {
    requestBody.CourseID = courseIdNumeric;
  } else if (normalizedCourseId) {
    requestBody.CourseID = normalizedCourseId;
  }

  if (teacherIdNumeric !== null) {
    requestBody.TeacherID = teacherIdNumeric;
  } else if (normalizedTeacherId) {
    requestBody.TeacherID = normalizedTeacherId;
  }

  if (subjectIdNumeric !== null) {
    requestBody.SubjectID = subjectIdNumeric;
  } else if (normalizedSubjectId) {
    requestBody.SubjectID = normalizedSubjectId;
  }

  if (deviceInfo) {
    requestBody.DeviceInfo = deviceInfo;
  }
  if (ipAddress) {
    requestBody.IPAddress = ipAddress;
  }

  const rawLocation = payload.Location ?? payload.location ?? null;
  if (rawLocation && typeof rawLocation === "string" && rawLocation.trim()) {
    requestBody.Location = rawLocation.trim();
  }

  if (sessionStartIso) {
    requestBody.SessionStartTime = sessionStartIso;
    requestBody.StartTime = sessionStartIso;
  }

  if (sessionEndIso) {
    requestBody.SessionEndTime = sessionEndIso;
    requestBody.EndTime = sessionEndIso;
  }

  if (sessionDateIso) {
    requestBody.SessionDate = sessionDateIso;
  }

  if (attendanceDateIso) {
    requestBody.AttendanceDate = attendanceDateIso;
  }

  try {
    const response = await axios.post(`/Attendances`, requestBody);
    const responseData = response?.data ?? {};

    const enriched = {
      ...responseData,
      AttendanceID:
        responseData.AttendanceID ??
        responseData.attendanceID ??
        responseData.AttendanceId ??
        responseData.attendanceId ??
        null,
      SessionID:
        responseData.SessionID ??
        responseData.sessionID ??
        responseData.SessionId ??
        responseData.sessionId ??
        sessionIdNumeric,
      StudentID:
        responseData.StudentID ??
        responseData.studentID ??
        responseData.StudentId ??
        responseData.studentId ??
        studentIdNumeric,
      CourseID:
        responseData.CourseID ??
        responseData.courseID ??
        responseData.CourseId ??
        responseData.courseId ??
        (courseIdNumeric !== null ? courseIdNumeric : normalizedCourseId) ??
        null,
      SubjectID:
        responseData.SubjectID ??
        responseData.subjectID ??
        responseData.SubjectId ??
        responseData.subjectId ??
        (subjectIdNumeric !== null ? subjectIdNumeric : normalizedSubjectId) ??
        null,
      TeacherID:
        responseData.TeacherID ??
        responseData.teacherID ??
        responseData.TeacherId ??
        responseData.teacherId ??
        (teacherIdNumeric !== null ? teacherIdNumeric : normalizedTeacherId) ??
        null,
      ScanTime: responseData.ScanTime ?? responseData.scanTime ?? scanTimeIso,
      Status: responseData.Status ?? responseData.status ?? statusValue,
      SessionStartTime:
        responseData.SessionStartTime ??
        responseData.sessionStartTime ??
        responseData.SessionStart ??
        sessionStartIso ??
        null,
      SessionEndTime:
        responseData.SessionEndTime ??
        responseData.sessionEndTime ??
        responseData.SessionEnd ??
        sessionEndIso ??
        null,
      SessionDate:
        responseData.SessionDate ??
        responseData.sessionDate ??
        sessionDateIso ??
        null,
      AttendanceDate:
        responseData.AttendanceDate ??
        responseData.attendanceDate ??
        attendanceDateIso ??
        null,
    };

    const record = buildAttendanceRecord({
      ...enriched,
      CourseID: enriched.CourseID,
      courseId: enriched.CourseID,
      SessionID: enriched.SessionID,
      sessionId: enriched.SessionID,
      StudentID: enriched.StudentID,
      studentId: enriched.StudentID,
      SubjectID: enriched.SubjectID,
      subjectId: enriched.SubjectID,
      TeacherID: enriched.TeacherID,
      teacherId: enriched.TeacherID,
    });

    if (record) {
      return record;
    }

    return {
      attendanceId: enriched.AttendanceID,
      sessionId: enriched.SessionID,
      studentId: enriched.StudentID,
      status: enriched.Status,
      ScanTime: enriched.ScanTime,
      courseId: enriched.CourseID,
      CourseID: enriched.CourseID,
      subjectId: enriched.SubjectID,
      SubjectID: enriched.SubjectID,
      teacherId: enriched.TeacherID,
      TeacherID: enriched.TeacherID,
      sessionStartTime: enriched.SessionStartTime,
      sessionEndTime: enriched.SessionEndTime,
      sessionDate: enriched.SessionDate,
      SessionDate: enriched.SessionDate,
      attendanceDate: enriched.AttendanceDate,
      AttendanceDate: enriched.AttendanceDate,
      raw: responseData,
    };
  } catch (error) {
    const message =
      error?.response?.data?.message ??
      error?.response?.data?.Message ??
      error?.response?.data?.error ??
      error?.response?.data?.Error ??
      error?.message ??
      "Failed to record attendance";
    console.error("Failed to record attendance via API", error);
    const wrapped = new Error(String(message));
    wrapped.cause = error;
    throw wrapped;
  }
};

export const getQRSessions = async () => {
  try {
    return await fetchSessions(`/QRSessions`);
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to load QR sessions from API", error);
    }
  }

  return [];
};

export const getQRSessionsByCourse = async (courseId, teacherId) => {
  const resolvedCourseId = resolveCourseId(courseId);
  if (!resolvedCourseId) {
    return [];
  }

  try {
    const sessions = await fetchSessions(
      `/QRSessions/Course/${resolvedCourseId}`
    );
    if (!teacherId) {
      return sessions;
    }

    const resolvedTeacherId = resolveTeacherId(teacherId);
    if (!resolvedTeacherId) {
      return sessions;
    }

    return sessions.filter(
      (session) => getSessionTeacherId(session) === resolvedTeacherId
    );
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to load QR sessions for course", error);
    }
  }

  return [];
};

export const getActiveQRSessions = async () => {
  try {
    return await fetchSessions(`/QRSessions/Active`);
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to load active QR sessions", error);
    }
  }

  return [];
};

export const getQRSession = async (sessionId) => {
  const resolvedSessionId = normalizeIdentifier(sessionId);
  if (!resolvedSessionId) {
    return null;
  }

  try {
    const response = await axios.get(`/QRSessions/${resolvedSessionId}`);
    return buildQrSession(response.data);
  } catch (error) {
    if (!isNotFound(error)) {
      console.error(`Failed to load QR session ${resolvedSessionId}`, error);
    }
  }

  return null;
};

export const generateQRSession = async (body) => {
  try {
    // Try dedicated generate endpoint first, fall back to creating a session
    try {
      const response = await axios.post(`/QRSessions/Generate`, body ?? {});
      return buildQrSession(response.data);
    } catch (err) {
      const response = await axios.post(`/QRSessions`, body ?? {});
      return buildQrSession(response.data);
    }
  } catch (error) {
    console.error("Failed to generate QR session", error);
    throw error;
  }
};

export const getStudentAttendance = async (studentId) => {
  const resolved = resolveStudentId(studentId);
  if (!resolved) {
    return [];
  }

  try {
    // Try a resource-style endpoint, fall back to query param
    try {
      return await fetchAttendance(`/Attendances/Student/${resolved}`);
    } catch (err) {
      return await fetchAttendance(`/Attendances`, {
        params: { studentId: resolved },
      });
    }
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to fetch student attendance", error);
    }
  }

  return [];
};

export const getCourseAttendance = async (courseId) => {
  const resolved = resolveCourseId(courseId);
  if (!resolved) {
    return [];
  }

  try {
    try {
      return await fetchAttendance(`/Attendances/Course/${resolved}`);
    } catch (err) {
      return await fetchAttendance(`/Attendances`, {
        params: { courseId: resolved },
      });
    }
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to fetch course attendance", error);
    }
  }

  return [];
};

export const getAttendanceBySubjectAndDate = async (subjectId, date) => {
  if (!subjectId || !date) {
    return [];
  }

  try {
    const formattedDate = new Date(date).toISOString().split("T")[0];
    console.log("Fetching attendance for:", { subjectId, date: formattedDate });

    const response = await axios.get("/GetAtendBySubject", {
      params: {
        subjectId: subjectId,
        date: formattedDate,
      },
    });

    console.log("Attendance API response:", response.data);

    // Handle different response structures
    const rawData = response.data;
    const dataArray = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.data)
      ? rawData.data
      : rawData
      ? [rawData]
      : [];

    console.log("Parsed attendance data:", dataArray);
    return dataArray;
  } catch (error) {
    console.error("Failed to fetch attendance by subject and date", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    return [];
  }
};

export const getAttendanceByScheduleId = async (scheduleId, date) => {
  if (!scheduleId || !date) {
    return [];
  }

  try {
    const formattedDate = new Date(date).toISOString().split("T")[0];
    console.log("Fetching attendance for schedule:", {
      scheduleId,
      date: formattedDate,
    });

    const response = await axios.get("/GetAtendBySheduleId", {
      params: {
        sheduleid: scheduleId,
        date: formattedDate,
      },
    });

    console.log("Schedule attendance API response:", response.data);

    // Handle different response structures
    const rawData = response.data;
    const dataArray = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.data)
      ? rawData.data
      : rawData
      ? [rawData]
      : [];

    console.log("Parsed schedule attendance data:", dataArray);
    return dataArray;
  } catch (error) {
    console.error("Failed to fetch attendance by schedule and date", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    return [];
  }
};

// Get attendance by student ID and schedule ID
export const getAttendanceByStudentAndSchedule = async (
  scheduleId,
  studentId
) => {
  if (!scheduleId || !studentId) {
    console.warn("Schedule ID and Student ID are required");
    return [];
  }

  try {
    const response = await axios.get("/GetAtendByStudentId", {
      params: {
        sheduleid: scheduleId,
        studentid: studentId,
      },
    });

    const rawData = response.data;
    const dataArray = Array.isArray(rawData)
      ? rawData
      : rawData?.data
      ? Array.isArray(rawData.data)
        ? rawData.data
        : [rawData.data]
      : [rawData];

    // Transform the API response to match the expected format
    return dataArray.map((record) => {
      const scanDate = record.ScanDate ?? record.scanDate;
      const firstScanTime = record.FirstScanTime ?? record.firstScanTime;

      // Determine status based on scan time (if needed, adjust logic)
      let status = "Present";
      if (firstScanTime) {
        const scanTime = new Date(firstScanTime);
        const hours = scanTime.getHours();
        const minutes = scanTime.getMinutes();

        // Example logic: if scanned after 8:15 AM, mark as Late
        if (hours > 8 || (hours === 8 && minutes > 15)) {
          status = "Late";
        }
      }

      return {
        id: `${studentId}-${scheduleId}-${scanDate}`,
        attendanceId: `${studentId}-${scheduleId}-${scanDate}`,
        studentId,
        StudentID: studentId,
        scheduleId,
        ScheduleID: scheduleId,
        SessionID: scheduleId,
        date: firstScanTime || scanDate,
        Date: firstScanTime || scanDate,
        scanDate,
        scanTime: firstScanTime,
        status,
        Status: status,
        raw: record,
      };
    });
  } catch (error) {
    console.error("Failed to fetch attendance by student and schedule", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    return [];
  }
};
