import axios from "axios";
import mapStudent, { getAllStudents } from "./studentService";
import { getStudentAttendance } from "./attendanceService";

const normalizeIdValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const str = String(value).trim();
  if (!str) return null;
  if (/^-?\d+$/.test(str) && !/^0\d+/.test(str)) {
    const parsed = Number(str);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return str;
};

const normalizeIdArray = (values) => {
  if (!Array.isArray(values)) return [];
  const map = new Map();
  for (const item of values) {
    const normalized = normalizeIdValue(item);
    if (normalized === null) continue;
    const key =
      typeof normalized === "number" ? String(normalized) : normalized;
    if (!map.has(key)) map.set(key, normalized);
  }
  return Array.from(map.values());
};

const normalizeBooleanLike = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    const truthy = new Set([
      "true",
      "1",
      "yes",
      "y",
      "active",
      "enabled",
      "on",
    ]);
    const falsy = new Set([
      "false",
      "0",
      "no",
      "n",
      "inactive",
      "disabled",
      "off",
    ]);

    if (truthy.has(normalized)) return true;
    if (falsy.has(normalized)) return false;
  }

  return null;
};

const normalizeTimestamp = (value) => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (value > 1e12) return value; // treat as milliseconds
    if (value > 1e9) return value * 1000; // treat as seconds
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return parsed;

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      if (numeric > 1e12) return numeric;
      if (numeric > 1e9) return numeric * 1000;
      return numeric;
    }
  }

  return null;
};

const toIsoDateString = (value) => {
  const timestamp = normalizeTimestamp(value);
  if (timestamp === null) return null;

  try {
    return new Date(timestamp).toISOString();
  } catch (err) {
    return null;
  }
};

const collectTemporalMetadata = (...values) => {
  const flat = values.reduce((acc, entry) => {
    if (Array.isArray(entry)) {
      acc.push(...entry);
    } else {
      acc.push(entry);
    }
    return acc;
  }, []);

  for (const value of flat) {
    const timestamp = normalizeTimestamp(value);
    if (timestamp !== null) {
      return {
        iso: toIsoDateString(timestamp),
        timestamp,
      };
    }
  }

  for (const value of flat) {
    const iso = toIsoDateString(value);
    if (iso) {
      return {
        iso,
        timestamp: normalizeTimestamp(iso),
      };
    }
  }

  return { iso: null, timestamp: null };
};

// Returns true when a course object should be considered active/visible
const courseIsActive = (course) => {
  if (!course || typeof course !== "object") return false;

  const rawStatus =
    course.status ??
    course.Status ??
    course.courseStatus ??
    course.CourseStatus ??
    null;
  const normalizedStatus =
    typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : null;

  const rawIsActive =
    course.isActive ??
    course.IsActive ??
    course.is_active ??
    course.Is_active ??
    course.active ??
    course.Active ??
    (normalizedStatus === "active"
      ? true
      : normalizedStatus === "inactive"
      ? false
      : undefined);

  const normalizedActive = normalizeBooleanLike(rawIsActive);
  if (normalizedActive !== null) return normalizedActive;
  if (normalizedStatus !== null) return normalizedStatus !== "inactive";
  return true; // default visible
};

// Given an array of formatted course objects, fetch authoritative details
// for each course and return only those that are active. If fetching fails
// for a course, fall back to the provided object.
const verifyAndFilterActiveCourses = async (courses) => {
  if (!Array.isArray(courses) || !courses.length) return [];

  const checks = await Promise.all(
    courses.map(async (c) => {
      try {
        const cid = c?.id ?? c?.CourseID ?? c?.courseId ?? c?.CourseId ?? null;
        if (!cid) return c;
        const fresh = await getCourseDetails(String(cid));
        return fresh || c;
      } catch (err) {
        return c;
      }
    })
  );

  return (checks || [])
    .map(formatCourse)
    .filter(Boolean)
    .filter(courseIsActive);
};

const formatSubjectEntry = (entry) => {
  if (!entry) return null;

  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof entry === "object") {
    const name =
      entry.name ??
      entry.Name ??
      entry.subjectName ??
      entry.SubjectName ??
      entry.title ??
      entry.Title ??
      entry.code ??
      entry.Code ??
      null;

    if (typeof name === "string") {
      const trimmed = name.trim();
      return trimmed.length ? trimmed : null;
    }
  }

  return null;
};

const collectSubjects = (course) => {
  if (!course || typeof course !== "object") {
    return [];
  }

  const sources = [
    course.subjects,
    course.Subjects,
    course.courseSubjects,
    course.CourseSubjects,
    course.subjectList,
    course.SubjectList,
    course.subjectNames,
    course.SubjectNames,
  ];

  const collected = [];

  for (const source of sources) {
    if (!source) continue;

    if (Array.isArray(source)) {
      collected.push(...source);
      continue;
    }

    if (typeof source === "string") {
      collected.push(
        ...source
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      );
      continue;
    }

    if (typeof source === "object") {
      collected.push(...Object.values(source));
    }
  }

  const cleanedSubjects = collected
    .map((entry) => formatSubjectEntry(entry))
    .filter(Boolean);

  if (!cleanedSubjects.length) {
    return [];
  }

  const unique = Array.from(new Set(cleanedSubjects));
  return unique;
};

const collectSubjectIds = (course) => {
  if (!course || typeof course !== "object") {
    return [];
  }

  const ids = new Map();

  const pushId = (value) => {
    const normalized = normalizeIdValue(value);
    if (normalized === null) return;
    const key =
      typeof normalized === "number" ? String(normalized) : normalized;
    if (!ids.has(key)) ids.set(key, normalized);
  };

  const directSources = [
    course.SubjectIDs,
    course.subjectIDs,
    course.SubjectIds,
    course.subjectIds,
  ];

  directSources.forEach((source) => {
    if (Array.isArray(source)) {
      source.forEach(pushId);
    }
  });

  const primaryCandidates = [
    course.SubjectID,
    course.subjectID,
    course.SubjectId,
    course.subjectId,
    course?.subject?.id,
    course?.subject?.Id,
    course?.Subject?.id,
    course?.Subject?.Id,
    course?.subject?.SubjectID,
    course?.subject?.subjectId,
  ];

  primaryCandidates.forEach(pushId);

  const nestedSources = [
    course.courseSubjects,
    course.CourseSubjects,
    course.subjects,
    course.Subjects,
    course.subjectList,
    course.SubjectList,
  ];

  const handleNestedEntry = (entry) => {
    if (!entry) return;
    if (Array.isArray(entry)) {
      entry.forEach(handleNestedEntry);
      return;
    }

    if (typeof entry === "object") {
      pushId(
        entry.SubjectID ??
          entry.subjectID ??
          entry.SubjectId ??
          entry.subjectId ??
          entry.subject?.id ??
          entry.subject?.SubjectID ??
          entry.id ??
          entry.Id
      );
      return;
    }

    // ignore primitive strings from nested sources; they typically represent names
  };

  nestedSources.forEach(handleNestedEntry);

  return Array.from(ids.values());
};

export const formatCourse = (course) => {
  if (!course || typeof course !== "object") {
    return course;
  }

  const teacher = course.teacher || course.Teacher || {};
  const teacherUser = teacher.user || teacher.User || {};
  const subjectObj = course.subject || course.Subject || {};

  const subjectName =
    typeof course.subject === "string"
      ? course.subject
      : typeof course.Subject === "string"
      ? course.Subject
      : subjectObj.name ||
        subjectObj.Name ||
        subjectObj.subjectName ||
        subjectObj.SubjectName ||
        course.subjectName ||
        course.SubjectName ||
        subjectObj.title ||
        subjectObj.Title ||
        "";

  const teacherId =
    course.teacherId ??
    course.teacherID ??
    course.TeacherId ??
    course.TeacherID ??
    teacher.id ??
    teacher.Id ??
    teacher.teacherId ??
    teacher.teacherID ??
    teacher.TeacherId ??
    teacher.TeacherID ??
    teacherUser.id ??
    teacherUser.Id ??
    teacherUser.userId ??
    teacherUser.UserId ??
    teacherUser.userID ??
    teacherUser.UserID ??
    null;

  const subjects = collectSubjects(course);
  const subjectIds = collectSubjectIds(course);

  const rawStatus =
    course.status ??
    course.Status ??
    course.courseStatus ??
    course.CourseStatus ??
    null;

  const normalizedStatus =
    typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : null;

  const rawIsActive =
    course.isActive ??
    course.IsActive ??
    course.is_active ??
    course.Is_active ??
    course.active ??
    course.Active ??
    (normalizedStatus === "active"
      ? true
      : normalizedStatus === "inactive"
      ? false
      : undefined);

  const normalizedActive = normalizeBooleanLike(rawIsActive);
  const fallbackActive =
    normalizedStatus === null ? null : normalizedStatus !== "inactive";

  const resolvedIsActive =
    normalizedActive !== null
      ? normalizedActive
      : fallbackActive !== null
      ? fallbackActive
      : true;

  const resolvedStatus =
    normalizedStatus ?? (resolvedIsActive ? "active" : "inactive");

  const teacherDetails =
    teacher && typeof teacher === "object"
      ? {
          id:
            teacherId ??
            teacher.TeacherID ??
            teacher.teacherID ??
            teacher.id ??
            teacher.Id ??
            null,
          teacherId:
            teacherId ??
            teacher.TeacherID ??
            teacher.teacherID ??
            teacher.id ??
            teacher.Id ??
            null,
          userId:
            teacher.UserID ??
            teacher.userID ??
            teacher.userId ??
            teacherUser.UserID ??
            teacherUser.userID ??
            teacherUser.userId ??
            null,
          firstName:
            teacherUser.firstName ??
            teacherUser.FirstName ??
            teacher.firstName ??
            teacher.FirstName ??
            "",
          lastName:
            teacherUser.lastName ??
            teacherUser.LastName ??
            teacher.lastName ??
            teacher.LastName ??
            "",
          username:
            teacherUser.username ??
            teacherUser.Username ??
            teacher.username ??
            teacher.Username ??
            "",
        }
      : null;

  const subjectDetails =
    subjectObj && typeof subjectObj === "object"
      ? {
          id:
            subjectObj.id ??
            subjectObj.Id ??
            subjectObj.subjectId ??
            subjectObj.subjectID ??
            subjectObj.SubjectId ??
            subjectObj.SubjectID ??
            null,
          name:
            subjectName ||
            subjectObj.name ||
            subjectObj.Name ||
            subjectObj.subjectName ||
            subjectObj.SubjectName ||
            "",
          code:
            subjectObj.code ??
            subjectObj.Code ??
            subjectObj.subjectCode ??
            subjectObj.SubjectCode ??
            "",
        }
      : null;

  const { iso: createdAtIso, timestamp: createdTimestamp } =
    collectTemporalMetadata([
      course.createdTimestamp,
      course.createdAt,
      course.CreatedAt,
      course.created_at,
      course.createdOn,
      course.CreatedOn,
      course.creationDate,
      course.CreationDate,
      course.createdDate,
      course.CreatedDate,
      course.dateCreated,
      course.DateCreated,
    ]);

  const { iso: updatedAtIso, timestamp: updatedTimestamp } =
    collectTemporalMetadata([
      course.updatedTimestamp,
      course.updatedAt,
      course.UpdatedAt,
      course.updated_at,
      course.updatedOn,
      course.UpdatedOn,
      course.lastUpdated,
      course.LastUpdated,
      course.modifiedAt,
      course.ModifiedAt,
    ]);

  return {
    id:
      course.id ??
      course.courseId ??
      course.courseID ??
      course.CourseId ??
      course.CourseID ??
      null,
    name: course.name ?? course.courseName ?? course.CourseName ?? "",
    code: course.code ?? course.courseCode ?? course.CourseCode ?? "",
    subject: subjectName,
    subjectId:
      course.subjectId ??
      course.subjectID ??
      course.SubjectId ??
      course.SubjectID ??
      subjectObj.id ??
      subjectObj.Id ??
      subjectObj.subjectId ??
      subjectObj.subjectID ??
      subjectObj.SubjectId ??
      subjectObj.SubjectID ??
      null,
    teacherId,
    teacher: teacherDetails,
    subjectDetails,
    academicYear:
      course.academicYear ?? course.AcademicYear ?? course.academic_year ?? "",
    description:
      course.description ??
      course.Description ??
      course.courseDescription ??
      "",
    subjects: subjects.length
      ? subjects
      : subjectName
      ? [subjectName].filter(Boolean)
      : [],
    subjectIds,
    SubjectIDs: subjectIds,
    isActive: resolvedIsActive,
    IsActive: resolvedIsActive,
    status: resolvedStatus,
    Status: resolvedStatus,
    createdAt: createdAtIso ?? null,
    CreatedAt: createdAtIso ?? null,
    createdTimestamp: createdTimestamp ?? null,
    updatedAt: updatedAtIso ?? null,
    UpdatedAt: updatedAtIso ?? null,
    updatedTimestamp: updatedTimestamp ?? null,
  };
};

const resolveCourseIdentifiers = (course, fallbackId = null) => {
  const source = course || {};
  const courseId =
    source.CourseID ??
    source.courseID ??
    source.CourseId ??
    source.courseId ??
    source.id ??
    fallbackId ??
    null;

  const courseName =
    source.CourseName ??
    source.courseName ??
    source.name ??
    source.CourseTitle ??
    source.courseTitle ??
    "";

  const courseCode =
    source.CourseCode ?? source.courseCode ?? source.code ?? source.Code ?? "";

  return {
    CourseID: courseId,
    CourseName: courseName,
    CourseCode: courseCode,
  };
};

const transformEnrollmentToStudent = (enrollment, course) => {
  if (!enrollment || typeof enrollment !== "object") {
    return null;
  }

  const studentPayload =
    enrollment.Student ??
    enrollment.student ??
    enrollment.StudentDetails ??
    enrollment.studentDetails ??
    null;

  if (!studentPayload || typeof studentPayload !== "object") {
    return null;
  }

  const mergedStudent = {
    ...studentPayload,
    EnrollmentID:
      enrollment.EnrollmentID ??
      enrollment.enrollmentID ??
      enrollment.id ??
      studentPayload.EnrollmentID,
    EnrollmentDate:
      enrollment.EnrollmentDate ??
      enrollment.enrollmentDate ??
      studentPayload.EnrollmentDate,
  };

  if (!mergedStudent.User && studentPayload.User) {
    mergedStudent.User = studentPayload.User;
  }

  const studentDetails = mapStudent(mergedStudent);
  if (!studentDetails) {
    return null;
  }

  const enrollmentId =
    enrollment.EnrollmentID ??
    enrollment.enrollmentID ??
    enrollment.id ??
    studentDetails.EnrollmentID ??
    null;

  if (enrollmentId !== null && enrollmentId !== undefined) {
    studentDetails.EnrollmentID = enrollmentId;
    studentDetails.enrollmentId = enrollmentId;
  }

  const enrollmentDate =
    enrollment.EnrollmentDate ??
    enrollment.enrollmentDate ??
    studentDetails.EnrollmentDate ??
    null;
  studentDetails.EnrollmentDate = enrollmentDate;

  const rawEnrollmentActive =
    enrollment.IsActive ??
    enrollment.isActive ??
    enrollment.Active ??
    enrollment.active ??
    studentDetails.EnrollmentIsActive ??
    studentDetails.enrollmentIsActive ??
    null;

  if (rawEnrollmentActive !== null && rawEnrollmentActive !== undefined) {
    const resolved = Boolean(rawEnrollmentActive);
    studentDetails.EnrollmentIsActive = resolved;
    studentDetails.enrollmentIsActive = resolved;
    studentDetails.EnrollmentStatus = resolved ? "active" : "inactive";
    studentDetails.enrollmentStatus = studentDetails.EnrollmentStatus;
  } else {
    studentDetails.EnrollmentIsActive = true;
    studentDetails.enrollmentIsActive = true;
    studentDetails.EnrollmentStatus = "active";
    studentDetails.enrollmentStatus = "active";
  }

  const meta = resolveCourseIdentifiers(course, studentDetails.CourseID);
  if (meta.CourseID !== null && meta.CourseID !== undefined) {
    studentDetails.CourseID = meta.CourseID;
    studentDetails.courseId = meta.CourseID;
  }
  if (meta.CourseName) {
    studentDetails.CourseName = meta.CourseName;
    studentDetails.courseName = meta.CourseName;
  }
  if (meta.CourseCode) {
    studentDetails.CourseCode = meta.CourseCode;
    studentDetails.courseCode = meta.CourseCode;
  }

  return studentDetails;
};

const flattenCoursesStudentResponse = (courses) => {
  if (!Array.isArray(courses)) {
    return [];
  }

  const collected = [];
  const seen = new Set();

  for (const course of courses) {
    const entries =
      course?.Students ??
      course?.students ??
      course?.Enrollments ??
      course?.enrollments ??
      [];

    const meta = resolveCourseIdentifiers(course);

    for (const entry of entries) {
      let studentEntry = null;

      if (
        entry &&
        typeof entry === "object" &&
        (entry.Student || entry.student)
      ) {
        studentEntry = transformEnrollmentToStudent(entry, meta);
      } else {
        studentEntry = mapStudent(entry);
        if (studentEntry) {
          if (!studentEntry.CourseID && meta.CourseID !== null) {
            studentEntry.CourseID = meta.CourseID;
            studentEntry.courseId = meta.CourseID;
          }
          if (!studentEntry.CourseName && meta.CourseName) {
            studentEntry.CourseName = meta.CourseName;
            studentEntry.courseName = meta.CourseName;
          }
          if (!studentEntry.CourseCode && meta.CourseCode) {
            studentEntry.CourseCode = meta.CourseCode;
            studentEntry.courseCode = meta.CourseCode;
          }
        }
      }

      if (!studentEntry) {
        continue;
      }

      const keySource =
        studentEntry.StudentID ??
        studentEntry.studentId ??
        studentEntry.UserID ??
        studentEntry.userId ??
        studentEntry.id ??
        null;

      const key = keySource !== null ? String(keySource) : null;
      if (key && seen.has(key)) {
        continue;
      }
      if (key) {
        seen.add(key);
      }

      if (
        studentEntry.EnrollmentIsActive === undefined ||
        studentEntry.EnrollmentIsActive === null
      ) {
        const defaultActive = Boolean(
          studentEntry.enrollmentIsActive ??
            studentEntry.IsActive ??
            studentEntry.isActive ??
            true
        );
        studentEntry.EnrollmentIsActive = defaultActive;
        studentEntry.enrollmentIsActive = defaultActive;
        studentEntry.EnrollmentStatus = defaultActive ? "active" : "inactive";
        studentEntry.enrollmentStatus = studentEntry.EnrollmentStatus;
      }

      collected.push(studentEntry);
    }
  }

  return collected;
};

const dedupeStudents = (students) => {
  if (!Array.isArray(students)) {
    return [];
  }

  const result = [];
  const seen = new Set();

  for (const student of students) {
    if (!student) {
      continue;
    }

    const keySource =
      student.StudentID ??
      student.studentId ??
      student.UserID ??
      student.userId ??
      student.id ??
      null;

    const key = keySource !== null ? String(keySource) : null;
    if (key && seen.has(key)) {
      continue;
    }
    if (key) {
      seen.add(key);
    }

    result.push(student);
  }

  return result;
};

const fetchCourseStudentsLegacy = async (courseId) => {
  if (courseId === undefined || courseId === null) {
    return [];
  }

  const courseIdStr = String(courseId).trim();
  if (!courseIdStr) {
    return [];
  }

  try {
    const response = await axios.get(`/Courses/${courseIdStr}/students`);
    const raw = Array.isArray(response.data)
      ? response.data
      : response.data?.students ||
        response.data?.Students ||
        response.data?.data ||
        [];

    const studentList = raw
      .map((entry) => {
        if (
          entry &&
          typeof entry === "object" &&
          (entry.Student || entry.student)
        ) {
          return transformEnrollmentToStudent(entry, {
            CourseID: courseIdStr,
          });
        }

        const resolved = mapStudent(entry);
        if (resolved) {
          if (!resolved.CourseID) {
            resolved.CourseID = courseIdStr;
            resolved.courseId = courseIdStr;
          }
          if (!resolved.CourseName) {
            resolved.CourseName = entry?.CourseName ?? entry?.courseName ?? "";
            resolved.courseName = resolved.CourseName;
          }
          if (!resolved.CourseCode) {
            resolved.CourseCode = entry?.CourseCode ?? entry?.courseCode ?? "";
            resolved.courseCode = resolved.CourseCode;
          }
        }
        return resolved;
      })
      .filter(Boolean);

    return dedupeStudents(studentList);
  } catch (error) {
    return [];
  }
};

const mapCourseToApiPayload = (courseData) => {
  const payload = {
    CourseID:
      courseData.courseID ??
      courseData.courseId ??
      courseData.CourseId ??
      courseData.CourseID ??
      courseData.id ??
      undefined,
    CourseName:
      courseData.name ?? courseData.courseName ?? courseData.CourseName ?? "",
    CourseCode:
      courseData.code ?? courseData.courseCode ?? courseData.CourseCode ?? "",
    Description:
      courseData.description ??
      courseData.Description ??
      courseData.courseDescription ??
      "",
    AcademicYear:
      courseData.academicYear ??
      courseData.AcademicYear ??
      courseData.academic_year ??
      "",
    TeacherID:
      courseData.teacherId ??
      courseData.teacherID ??
      courseData.TeacherId ??
      courseData.TeacherID ??
      courseData.teacher?.id ??
      courseData.teacher?.Id ??
      courseData.teacher?.teacherId ??
      courseData.teacher?.TeacherId ??
      null,
    SubjectID:
      courseData.subjectId ??
      courseData.subjectID ??
      courseData.SubjectId ??
      courseData.SubjectID ??
      courseData.subject?.id ??
      courseData.subject?.Id ??
      null,
    // new backend expects an array of subject IDs
    SubjectIDs: Array.isArray(courseData.SubjectIDs)
      ? courseData.SubjectIDs
      : Array.isArray(courseData.subjects)
      ? courseData.subjects
          .map((s) => s?.id ?? s?.SubjectID ?? s?.subjectId ?? null)
          .filter((v) => v !== null && v !== undefined)
      : Array.isArray(courseData.subjectList)
      ? courseData.subjectList
          .map((s) => s?.id ?? s?.SubjectID ?? s?.subjectId ?? null)
          .filter((v) => v !== null && v !== undefined)
      : undefined,
    SubjectName:
      courseData.subjectName ??
      courseData.subject?.name ??
      courseData.subject?.Name ??
      (typeof courseData.subject === "string" ? courseData.subject : undefined),
    IsActive:
      courseData.isActive ??
      courseData.IsActive ??
      courseData.is_active ??
      courseData.isActive ??
      true,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      // keep SubjectIDs even when it's an empty array so backend can clear links
      if (key === "SubjectIDs") return value !== undefined;
      return value !== undefined && value !== null;
    })
  );
};

// API-backed course service functions
export const getTeacherCourses = async (teacherId) => {
  const hasTeacherId = teacherId !== undefined && teacherId !== null;

  try {
    const response = await axios.get("/Courses");
    const courses = Array.isArray(response.data)
      ? response.data.map(formatCourse).filter(Boolean)
      : [];

    // Only return active/visible courses for non-admin consumers
    const visibleCourses = courses.filter(courseIsActive);

    if (!hasTeacherId) {
      return visibleCourses;
    }

    return visibleCourses.filter(
      (course) => String(course.teacherId) === String(teacherId)
    );
  } catch (error) {
    console.error("Failed to load teacher courses from API", error);
    throw error;
  }
};

export const getTeacherCourseStudents = async (teacherId, courseId) => {
  if (
    teacherId === undefined ||
    teacherId === null ||
    courseId === undefined ||
    courseId === null
  ) {
    return { course: null, students: [] };
  }

  const teacherStr = String(teacherId).trim();
  const courseStr = String(courseId).trim();

  if (!teacherStr || !courseStr) {
    return { course: null, students: [] };
  }

  try {
    const response = await axios.get(
      `/Teachers/${teacherStr}/Courses/${courseStr}/Students`
    );
    const payload =
      response.data && typeof response.data === "object" ? response.data : {};

    const identifiers = resolveCourseIdentifiers(payload, courseStr);
    const students = flattenCoursesStudentResponse([
      {
        ...payload,
        CourseID: identifiers.CourseID ?? payload.CourseID ?? courseStr,
        CourseName: identifiers.CourseName ?? payload.CourseName,
        CourseCode: identifiers.CourseCode ?? payload.CourseCode,
      },
    ]);

    const courseDetails = formatCourse({
      ...payload,
      CourseID: identifiers.CourseID ?? payload.CourseID ?? courseStr,
      CourseName: identifiers.CourseName ?? payload.CourseName,
      CourseCode: identifiers.CourseCode ?? payload.CourseCode,
    });

    const courseInfo = courseDetails
      ? {
          ...courseDetails,
          CourseID: identifiers.CourseID ?? courseDetails.CourseID ?? courseStr,
          CourseName:
            identifiers.CourseName ??
            courseDetails.CourseName ??
            courseDetails.name ??
            "",
          CourseCode:
            identifiers.CourseCode ??
            courseDetails.CourseCode ??
            courseDetails.code ??
            "",
        }
      : {
          id: identifiers.CourseID ?? courseStr,
          CourseID: identifiers.CourseID ?? courseStr,
          name: identifiers.CourseName ?? "",
          CourseName: identifiers.CourseName ?? "",
          code: identifiers.CourseCode ?? "",
          CourseCode: identifiers.CourseCode ?? "",
        };

    return {
      course: courseInfo,
      students,
    };
  } catch (error) {
    console.error(
      "Failed to load teacher course students via teacher route",
      error
    );
    throw error;
  }
};

export const getTeacherCoursesWithStudents = async (teacherId) => {
  if (teacherId === undefined || teacherId === null) {
    return [];
  }

  const teacherStr = String(teacherId).trim();
  if (!teacherStr) {
    return [];
  }

  try {
    const response = await axios.get(
      `/Teachers/${teacherStr}/Courses/Students`
    );
    const rawCourses = Array.isArray(response.data)
      ? response.data
      : response.data?.courses ||
        response.data?.Courses ||
        response.data?.data ||
        [];

    return rawCourses
      .map((coursePayload) => ({
        raw: coursePayload,
        formatted: formatCourse(coursePayload),
      }))
      .filter(({ formatted }) => courseIsActive(formatted))
      .map(({ raw: coursePayload, formatted: courseDetails }) => {
        const identifiers = resolveCourseIdentifiers(coursePayload);
        const students = flattenCoursesStudentResponse([
          {
            ...coursePayload,
            CourseID: identifiers.CourseID ?? coursePayload.CourseID,
            CourseName: identifiers.CourseName ?? coursePayload.CourseName,
            CourseCode: identifiers.CourseCode ?? coursePayload.CourseCode,
          },
        ]);

        const courseInfo = courseDetails
          ? {
              ...courseDetails,
              CourseID: identifiers.CourseID ?? courseDetails.CourseID ?? null,
              CourseName:
                identifiers.CourseName ??
                courseDetails.CourseName ??
                courseDetails.name ??
                "",
              CourseCode:
                identifiers.CourseCode ??
                courseDetails.CourseCode ??
                courseDetails.code ??
                "",
            }
          : {
              id: identifiers.CourseID ?? null,
              CourseID: identifiers.CourseID ?? null,
              name: identifiers.CourseName ?? "",
              CourseName: identifiers.CourseName ?? "",
              code: identifiers.CourseCode ?? "",
              CourseCode: identifiers.CourseCode ?? "",
            };

        return {
          course: courseInfo,
          students,
        };
      });
  } catch (error) {
    console.error(
      "Failed to load teacher courses with students via teacher route",
      error
    );
    throw error;
  }
};

export const getTeacherStudents = async (teacherOrCourseId, options = {}) => {
  const scope = options.scope ?? "auto";
  const explicitTeacherId =
    options.teacherId !== undefined ? options.teacherId : null;
  const explicitCourseId =
    options.courseId !== undefined ? options.courseId : null;
  const explicitStudentId =
    options.studentId !== undefined ? options.studentId : null;

  const hasIdentifier =
    teacherOrCourseId !== undefined && teacherOrCourseId !== null;
  const identifierStr = hasIdentifier ? String(teacherOrCourseId).trim() : null;

  const teacherCandidate =
    explicitTeacherId !== null && explicitTeacherId !== undefined
      ? explicitTeacherId
      : scope !== "course"
      ? teacherOrCourseId
      : null;

  const courseCandidate =
    explicitCourseId !== null && explicitCourseId !== undefined
      ? explicitCourseId
      : scope === "course"
      ? teacherOrCourseId
      : null;

  const teacherIdStr =
    teacherCandidate !== null && teacherCandidate !== undefined
      ? String(teacherCandidate).trim()
      : null;
  const courseIdStr =
    courseCandidate !== null && courseCandidate !== undefined
      ? String(courseCandidate).trim()
      : null;

  if (scope === "course" && courseIdStr) {
    const legacy = await fetchCourseStudentsLegacy(courseIdStr);
    if (legacy.length) {
      return legacy;
    }
  }

  if (teacherIdStr && courseIdStr) {
    try {
      const { students } = await getTeacherCourseStudents(
        teacherIdStr,
        courseIdStr
      );
      if (students.length) {
        return students;
      }
    } catch (error) {
      // continue to other strategies
    }
  }

  if (teacherIdStr) {
    try {
      const grouped = await getTeacherCoursesWithStudents(teacherIdStr);
      const flattened = dedupeStudents(
        grouped.flatMap(({ course, students }) => {
          if (!Array.isArray(students)) {
            return [];
          }
          const meta = resolveCourseIdentifiers(course);
          return students.map((student) => {
            if (!student) {
              return null;
            }
            const enriched = { ...student };
            if (meta.CourseID !== null && meta.CourseID !== undefined) {
              enriched.CourseID = meta.CourseID;
              enriched.courseId = meta.CourseID;
            }
            if (meta.CourseName) {
              enriched.CourseName = meta.CourseName;
              enriched.courseName = meta.CourseName;
            }
            if (meta.CourseCode) {
              enriched.CourseCode = meta.CourseCode;
              enriched.courseCode = meta.CourseCode;
            }
            return enriched;
          });
        })
      ).filter(Boolean);

      if (flattened.length) {
        return flattened;
      }
    } catch (error) {
      // continue to legacy approaches
    }
  }

  if (courseIdStr || (scope !== "course" && identifierStr && !teacherIdStr)) {
    const fallbackCourseId = courseIdStr || identifierStr;
    const legacy = await fetchCourseStudentsLegacy(fallbackCourseId);
    if (legacy.length) {
      return legacy;
    }
  }

  if (teacherIdStr) {
    try {
      const courses = await getTeacherCourses(teacherIdStr);
      if (Array.isArray(courses) && courses.length) {
        const aggregated = [];
        for (const course of courses) {
          const cid =
            course?.id ??
            course?.CourseID ??
            course?.courseID ??
            course?.CourseId ??
            course?.courseId;
          if (!cid) {
            continue;
          }
          const students = await fetchCourseStudentsLegacy(cid);
          if (students.length) {
            aggregated.push(...students);
          }
        }
        if (aggregated.length) {
          return dedupeStudents(aggregated);
        }
      }
    } catch (_) {
      // ignore and continue to last-resort fallback
    }
  }

  try {
    const students = await getAllStudents();
    if (!teacherIdStr && !courseIdStr) {
      return students;
    }

    if (teacherIdStr) {
      try {
        const courses = await getTeacherCourses(teacherIdStr);
        if (Array.isArray(courses) && courses.length) {
          const courseIdSet = new Set(
            courses
              .map(
                (course) =>
                  course?.id ??
                  course?.CourseID ??
                  course?.courseID ??
                  course?.CourseId ??
                  course?.courseId
              )
              .filter((value) => value !== undefined && value !== null)
              .map((value) => String(value))
          );

          const filtered = students.filter((student) => {
            const associatedCourses =
              student.Courses ??
              student.courses ??
              student.CourseAssignments ??
              student.courseAssignments ??
              [];

            if (
              !Array.isArray(associatedCourses) ||
              !associatedCourses.length
            ) {
              return false;
            }

            return associatedCourses.some((course) =>
              courseIdSet.has(
                String(
                  course?.CourseID ??
                    course?.courseID ??
                    course?.courseId ??
                    course?.id
                )
              )
            );
          });

          return filtered;
        }
      } catch (_) {
        return [];
      }

      return [];
    }

    return [];
  } catch (error) {
    if (error?.response?.status === 404) {
      return [];
    }
    console.error("Failed to load students", error);
    throw error;
  }
};

// export const getCourseDetails = async (courseId) => {
//   try {
//     const response = await axios.get(`/Courses/${courseId}`);

//     const subjects = response.data.subjects || [];
//     const monthlyFee = subjects.length > 0 ? subjects[0].monthlyFee : '';

//     localStorage.setItem('selectedMonthlyFee', monthlyFee);

//     return formatCourse(response.data);
//   } catch (error) {
//     console.error("Failed to load course details from API", error);
//     throw error;
//   }
// };
export const getCourseDetails = async (courseId) => {
  try {
    const response = await axios.get(`/Courses/${courseId}`);

    const subjects = response.data.subjects || [];
    const firstSubject = subjects.length > 0 ? subjects[0] : null;

    const monthlyFee = firstSubject ? firstSubject.monthlyFee : '';
    const totalFee = firstSubject ? firstSubject.totalFee : '';

    localStorage.setItem('selectedMonthlyFee', monthlyFee);
    localStorage.setItem('selectedTotalFee', totalFee);

    return formatCourse(response.data);
  } catch (error) {
    console.error("Failed to load course details from API", error);
    throw error;
  }
};



// Public wrapper to fetch students from the course-specific endpoint.
export const getCourseStudents = async (courseId) => {
  return await fetchCourseStudentsLegacy(courseId);
};

export const getAllCourses = async () => {
  try {
    const response = await axios.get("/Courses");
    const courses = Array.isArray(response.data)
      ? response.data.map(formatCourse).filter(Boolean)
      : [];
    return courses;
  } catch (error) {
    console.error("Failed to load courses from API", error);
    throw error;
  }
};

// Fetch courses for a specific student. Tries dedicated endpoints first, then
// falls back to deriving enrollment from attendance records and full course list.
export const getStudentCourses = async (studentId) => {
  const hasId = studentId !== undefined && studentId !== null;
  const idStr = hasId ? String(studentId).trim() : null;

  if (!hasId || !idStr) {
    return [];
  }

  // 0) Prefer backend enrollments endpoint that returns courses for a student
  try {
    const response = await axios.get(`/Enrollments/Student/${idStr}`);
    const raw = Array.isArray(response.data) ? response.data : [];
    const courses = raw
      .map((enrollment) => enrollment.Course || enrollment.course)
      .filter(Boolean)
      .map(formatCourse)
      .filter(Boolean);
    if (courses.length) {
      // Verify authoritative status to avoid stale embedded Course objects
      try {
        const verified = await verifyAndFilterActiveCourses(courses);
        if (verified.length) return verified;
        // if verification removed everything, fall back to server-provided visible ones
        return courses.filter(courseIsActive);
      } catch (err) {
        return courses.filter(courseIsActive);
      }
    }
  } catch (_) {
    // continue to fallback candidates
  }

  // 1) Try dedicated endpoints
  const candidateEndpoints = [
    `/Courses/student/${idStr}`,
    `/Courses/Student/${idStr}`,
    `/Courses/by-student/${idStr}`,
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await axios.get(endpoint);
      const raw = Array.isArray(response.data)
        ? response.data
        : response.data?.courses || response.data?.Courses || [];
      const formattedCourses = raw.map(formatCourse).filter(Boolean);
      if (formattedCourses.length) {
        try {
          const verified = await verifyAndFilterActiveCourses(formattedCourses);
          if (verified.length) return verified;
          return formattedCourses.filter(courseIsActive);
        } catch (err) {
          return formattedCourses.filter(courseIsActive);
        }
      }
    } catch (_) {
      // try next endpoint
    }
  }

  // 2) Derive from attendance records combined with full course list
  try {
    const [attendance, allCourses] = await Promise.all([
      getStudentAttendance(idStr),
      getAllCourses(),
    ]);

    const courseIdSet = new Set(
      attendance
        .map((a) => a.courseId ?? a.CourseID)
        .filter((v) => v !== undefined && v !== null)
        .map((v) => String(v))
    );

    const scoped = allCourses.filter((c) => courseIdSet.has(String(c.id)));
    if (scoped.length) {
      try {
        const verified = await verifyAndFilterActiveCourses(scoped);
        if (verified.length) return verified;
        return scoped.filter(courseIsActive);
      } catch (err) {
        return scoped.filter(courseIsActive);
      }
    }
  } catch (_) {
    // ignore and continue to last resort
  }

  // 3) Last resort: return empty to avoid leaking unrelated courses
  return [];
};

export const createCourse = async (courseData) => {
  try {
    const payload = mapCourseToApiPayload(courseData);
    const response = await axios.post("/Courses", payload);
    // Clean API response first
    let created = formatCourse(response.data);

    // If API didn't return an identifier, generate one based on existing courses.
    const hasId =
      created &&
      ((created.id !== null &&
        created.id !== undefined &&
        String(created.id).trim() !== "") ||
        (created.CourseID !== null &&
          created.CourseID !== undefined &&
          String(created.CourseID).trim() !== ""));

    if (!hasId) {
      try {
        // Prefer fetching the authoritative list to compute next id
        const all = await getAllCourses();
        const maxId = Math.max(
          0,
          ...(all || []).map(
            (c) => Number(c.id ?? c.CourseID ?? c.courseId ?? 0) || 0
          )
        );
        const nextId = maxId + 1;
        if (!created) created = {};
        created.id = nextId;
        created.CourseID = nextId;
        created.courseId = nextId;
      } catch (e) {
        // If fetching fails, fallback to a timestamp-based identifier so the UI has a stable key
        const nextId = Date.now();
        if (!created) created = {};
        created.id = nextId;
        created.CourseID = nextId;
        created.courseId = nextId;
      }
    }

    if (created) {
      const { iso: resolvedCreatedAt, timestamp: resolvedCreatedTimestamp } =
        collectTemporalMetadata([
          created.createdTimestamp,
          created.createdAt,
          created.CreatedAt,
          created.created_at,
        ]);

      if (resolvedCreatedAt) {
        created.createdAt = resolvedCreatedAt;
        created.CreatedAt = resolvedCreatedAt;
        const finalTimestamp =
          resolvedCreatedTimestamp ?? normalizeTimestamp(resolvedCreatedAt);
        created.createdTimestamp =
          finalTimestamp !== null && finalTimestamp !== undefined
            ? finalTimestamp
            : Date.now();
      } else {
        const now = Date.now();
        const isoNow = new Date(now).toISOString();
        created.createdAt = isoNow;
        created.CreatedAt = isoNow;
        created.createdTimestamp = now;
      }
    }

    return created;
  } catch (error) {
    console.error("Failed to create course via API", error);
    throw error;
  }
};

// Update an existing course by id. Sends only provided fields mapped to the API shape.
export const updateCourse = async (courseId, updates = {}) => {
  const idCandidate =
    courseId ??
    updates?.CourseID ??
    updates?.courseID ??
    updates?.courseId ??
    updates?.id ??
    updates?.Id;

  const idStr = String(idCandidate ?? "").trim();
  if (!idStr) {
    throw new Error("updateCourse requires a valid courseId");
  }

  let existing = null;
  try {
    existing = await getCourseDetails(idStr);
  } catch (err) {
    console.warn("Unable to load existing course before update", err);
  }

  if (!existing) {
    throw new Error(`Course ${idStr} not found for update`);
  }

  const existingCourse = formatCourse(existing) || {};
  const formattedUpdates = formatCourse({ id: idStr, ...updates }) || {};

  // When callers only send association fields (e.g., SubjectIDs) we do not
  // want to overwrite descriptive fields like name/code with empty strings
  // produced by formatCourse. Remove empty string fields unless the caller
  // explicitly provided a new value.
  const providedKeys = new Set(
    Object.keys(updates || {}).map((key) => key.toLowerCase())
  );

  const sanitizeField = (candidateKey, aliases = []) => {
    const normalizedAliases = [candidateKey, ...aliases].map((alias) =>
      alias.toLowerCase()
    );
    const callerProvided = normalizedAliases.some((alias) =>
      providedKeys.has(alias)
    );
    if (!callerProvided && formattedUpdates.hasOwnProperty(candidateKey)) {
      const value = formattedUpdates[candidateKey];
      if (typeof value === "string" && value.trim() === "") {
        delete formattedUpdates[candidateKey];
      }
    }
  };

  sanitizeField("name", ["CourseName", "courseName"]);
  sanitizeField("code", ["CourseCode", "courseCode"]);
  sanitizeField("description", ["Description", "courseDescription"]);
  sanitizeField("academicYear", ["AcademicYear", "academic_year"]);
  sanitizeField("subject", ["Subject", "subjectName", "SubjectName"]);

  const merged = {
    ...existingCourse,
    ...formattedUpdates,
  };

  const subjectId =
    updates?.SubjectID ??
    updates?.subjectID ??
    updates?.subjectId ??
    updateCourse.subjectId ??
    existingCourse.subjectId ??
    null;

  const teacherId =
    updates?.TeacherID ??
    updates?.teacherID ??
    updates?.teacherId ??
    updateCourse.teacherId ??
    existingCourse.teacherId ??
    existingCourse.teacher?.teacherId ??
    existingCourse.teacher?.id ??
    null;

  const resolvedCourseId =
    merged.CourseID ??
    merged.courseID ??
    merged.courseId ??
    merged.id ??
    Number(idStr);

  const payload = {
    CourseID:
      resolvedCourseId !== undefined && resolvedCourseId !== null
        ? resolvedCourseId
        : idStr,
    CourseName:
      updates?.CourseName ??
      updates?.courseName ??
      updates?.name ??
      merged.name ??
      merged.CourseName ??
      merged.courseName ??
      "",
    CourseCode:
      updates?.CourseCode ??
      updates?.courseCode ??
      updates?.code ??
      merged.code ??
      merged.CourseCode ??
      merged.courseCode ??
      "",
    Description:
      updates?.Description ??
      updates?.description ??
      merged.description ??
      merged.Description ??
      "",
    AcademicYear:
      updates?.AcademicYear ??
      updates?.academicYear ??
      merged.academicYear ??
      merged.AcademicYear ??
      "",
    TeacherID: teacherId,
    SubjectID: subjectId,
    // include SubjectIDs when present in updates (array) so backend can sync associations
    SubjectIDs: Array.isArray(updates?.SubjectIDs)
      ? updates.SubjectIDs
      : Array.isArray(updates?.subjects)
      ? updates.subjects
          .map((s) => s?.id ?? s?.SubjectID ?? s?.subjectId ?? null)
          .filter((v) => v !== null && v !== undefined)
      : undefined,
    SubjectName:
      updates?.SubjectName ??
      updates?.subjectName ??
      merged.subject ??
      merged.subjectName ??
      undefined,
    IsActive:
      updates?.IsActive ??
      updates?.isActive ??
      merged.isActive ??
      merged.IsActive ??
      true,
  };

  // Remove undefined/null fields except SubjectID which backend needs even if null
  const cleanedPayload = Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      // Keep SubjectID and SubjectIDs keys even if null/empty so backend can clear associations
      if (key === "SubjectID" || key === "SubjectIDs") return true;
      return value !== undefined && value !== null;
    })
  );

  try {
    await axios.put(`/Courses/${idStr}`, cleanedPayload);
    const refreshed = await getCourseDetails(idStr);
    return refreshed ?? merged;
  } catch (error) {
    console.error("Failed to update course via API", error);
    // Fallback to merged state so caller at least has local update
    return { ...merged, subjectId };
  }
};

// Soft-delete a course by marking it inactive. Returns updated course payload.
export const deactivateCourse = async (courseId) => {
  const idStr = String(
    courseId ??
      (courseId && courseId.id) ??
      (courseId && courseId.CourseID) ??
      (courseId && courseId.courseId) ??
      (courseId && courseId.courseID) ??
      ""
  ).trim();

  if (!idStr) {
    throw new Error("deactivateCourse requires a valid courseId");
  }
  try {
    // Load current course details so we can provide a full PUT payload
    const current = await getCourseDetails(idStr);

    // Ensure we have values in the shape the backend expects. Use safe fallbacks.
    const existingSubjectIds = collectSubjectIds(current || {});
    const payload = {
      CourseID: current?.id ?? current?.CourseID ?? current?.courseId ?? idStr,
      CourseName: current?.name ?? current?.CourseName ?? "",
      CourseCode: current?.code ?? current?.CourseCode ?? "",
      TeacherID:
        current?.teacherId ??
        current?.TeacherID ??
        current?.teacher?.teacherId ??
        current?.teacher?.id ??
        null,
      AcademicYear: current?.academicYear ?? current?.AcademicYear ?? "",
      Description: current?.description ?? current?.Description ?? "",
      // Preserve existing subject associations so subjects aren't removed by backend
      SubjectIDs:
        current?.SubjectIDs ??
        current?.subjectIds ??
        current?.subjectIDs ??
        (Array.isArray(existingSubjectIds) && existingSubjectIds.length
          ? existingSubjectIds
          : undefined),
      SubjectID:
        current?.SubjectID ??
        current?.subjectId ??
        current?.subjectID ??
        (Array.isArray(existingSubjectIds) && existingSubjectIds.length
          ? existingSubjectIds[0]
          : null),
      IsActive: false,
    };

    await axios.put(`/Courses/${idStr}`, payload);

    // Return refreshed course details (formatted)
    const refreshed = await getCourseDetails(idStr);
    return refreshed;
  } catch (error) {
    console.error(`Failed to deactivate course ${idStr}`, error);
    throw error;
  }
};

// Reactivate a soft-deleted course by marking it active. Returns updated course payload.
export const reactivateCourse = async (courseId) => {
  const idStr = String(
    courseId ??
      (courseId && courseId.id) ??
      (courseId && courseId.CourseID) ??
      (courseId && courseId.courseId) ??
      (courseId && courseId.courseID) ??
      ""
  ).trim();

  if (!idStr) {
    throw new Error("reactivateCourse requires a valid courseId");
  }

  try {
    // Load current course details so we can provide a full PUT payload
    const current = await getCourseDetails(idStr);

    const existingSubjectIds = collectSubjectIds(current || {});
    const payload = {
      CourseID: current?.id ?? current?.CourseID ?? current?.courseId ?? idStr,
      CourseName: current?.name ?? current?.CourseName ?? "",
      CourseCode: current?.code ?? current?.CourseCode ?? "",
      TeacherID:
        current?.teacherId ??
        current?.TeacherID ??
        current?.teacher?.teacherId ??
        current?.teacher?.id ??
        null,
      AcademicYear: current?.academicYear ?? current?.AcademicYear ?? "",
      Description: current?.description ?? current?.Description ?? "",
      SubjectIDs:
        current?.SubjectIDs ??
        current?.subjectIds ??
        current?.subjectIDs ??
        (Array.isArray(existingSubjectIds) && existingSubjectIds.length
          ? existingSubjectIds
          : undefined),
      SubjectID:
        current?.SubjectID ??
        current?.subjectId ??
        current?.subjectID ??
        (Array.isArray(existingSubjectIds) && existingSubjectIds.length
          ? existingSubjectIds[0]
          : null),
      IsActive: true,
    };

    await axios.put(`/Courses/${idStr}`, payload);

    const refreshed = await getCourseDetails(idStr);
    return refreshed;
  } catch (error) {
    console.error(`Failed to reactivate course ${idStr}`, error);
    throw error;
  }
};

// Delete an existing course by id. Returns true if successful, false otherwise.
export const deleteCourse = async (courseId) => {
  const idStr = String(
    courseId ??
      (courseId && courseId.id) ??
      (courseId && courseId.CourseID) ??
      (courseId && courseId.courseId) ??
      (courseId && courseId.courseID) ??
      ""
  ).trim();
  if (!idStr) return false;

  try {
    await axios.delete(`/Courses/${idStr}`);
    return true;
  } catch (err) {
    console.error("Failed to delete course via API", err);
    throw err;
  }
};

// Delete a course scoped to a teacher. Calls DELETE /Teachers/{teacherId}/Courses/{courseId}
export const deleteTeacherCourse = async (teacherId, courseId) => {
  if (
    teacherId === undefined ||
    teacherId === null ||
    courseId === undefined ||
    courseId === null
  ) {
    return false;
  }

  const teacherStr = String(teacherId).trim();
  const courseStr = String(
    (courseId && (courseId.id || courseId.CourseID)) || courseId
  ).trim();

  if (!teacherStr || !courseStr) return false;

  try {
    await axios.delete(`/Teachers/${teacherStr}/Courses/${courseStr}`);
    return true;
  } catch (err) {
    console.error("Failed to delete teacher-scoped course via API", err);
    throw err;
  }
};

// Real service functions (reference) removed
