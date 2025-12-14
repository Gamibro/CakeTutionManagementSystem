import axios from "axios";
import { formatCourse } from "./courseService";

const normalizeEnrollmentRecord = (raw = {}, fallbackStudentId = null) => {
  if (!raw || typeof raw !== "object") {
    return {
      enrollmentId: null,
      studentId: fallbackStudentId,
      courseId: null,
      subjectId: null,
      classId: null,
      enrollmentDate: null,
      isActive: true,
      raw: {},
    };
  }

  const enrollmentId =
    raw.EnrollmentID ?? raw.enrollmentID ?? raw.id ?? raw.Id ?? null;
  const studentId =
    raw.StudentID ??
    raw.studentID ??
    raw.studentId ??
    raw.UserID ??
    raw.userID ??
    raw.userId ??
    fallbackStudentId ??
    null;
  const courseId =
    raw.CourseID ?? raw.courseID ?? raw.courseId ?? raw.CourseId ?? null;
  const subjectId =
    raw.SubjectID ?? raw.subjectID ?? raw.subjectId ?? raw.SubjectId ?? null;
  const classId =
    raw.ClassID ?? raw.classID ?? raw.classId ?? raw.ClassId ?? null;
  const enrollmentDate =
    raw.EnrollmentDate ?? raw.enrollmentDate ?? raw.Date ?? raw.date ?? null;
  const isActive =
    raw.IsActive ?? raw.isActive ?? raw.Active ?? raw.active ?? true;



  // 🔹 NEW: try to resolve course name/code/description
  const courseName =
    raw.CourseName ??
    raw.courseName ??
    raw.Course?.CourseName ??
    raw.Course?.Name ??
    null;

  const courseCode =
    raw.CourseCode ??
    raw.courseCode ??
    raw.Course?.CourseCode ??
    raw.Course?.Code ??
    null;

  const courseDescription =
    raw.CourseDescription ??
    raw.courseDescription ??
    raw.Description ??
    raw.description ??
    raw.Course?.Description ??
    null;

  return {
    enrollmentId,
    studentId,
    courseId,
    subjectId,
    classId,
    enrollmentDate,
    isActive,
    raw,
  };
};

// Create a single enrollment record
export const createEnrollment = async (enrollmentPayload) => {
  // Deduplicate concurrent identical create requests to avoid duplicate rows
  // Build a stable key for the enrollment intent
  const key = (() => {
    try {
      const sid = enrollmentPayload?.StudentID ?? "";
      const cid = enrollmentPayload?.CourseID ?? enrollmentPayload?.CourseId ?? "";
      const sub = enrollmentPayload?.SubjectID ?? enrollmentPayload?.SubjectId ?? "";
      const csid = enrollmentPayload?.CourseSubjectID ?? "";
      return `${String(sid)}::${String(cid)}::${String(sub)}::${String(csid)}`;
    } catch (e) {
      return JSON.stringify(enrollmentPayload || {});
    }
  })();

  if (!createEnrollment._inFlight) createEnrollment._inFlight = new Map();
  const inFlight = createEnrollment._inFlight;

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    try {
      // If caller provided an enrollment id, try updating (PUT) first.
      const providedId =
        enrollmentPayload?.EnrollmentID ??
        enrollmentPayload?.enrollmentID ??
        enrollmentPayload?.enrollmentId ??
        enrollmentPayload?.EnrollmentId ??
        enrollmentPayload?.id ??
        null;

      if (providedId !== null && providedId !== undefined && String(providedId).trim()) {
        try {
          const idStr = String(providedId).trim();
          console.debug("[enrollmentService] createEnrollment: attempting PUT /Enrollments/" + idStr, enrollmentPayload);
          const response = await axios.put(`/Enrollments/${idStr}`, enrollmentPayload);
          return normalizeEnrollmentRecord(response.data, enrollmentPayload?.StudentID);
        } catch (putErr) {
          // If PUT fails, fall through to POST as a last resort
          console.warn('PUT /Enrollments/{id} failed, falling back to lookup', putErr);
        }
      }

      // No id provided. Try to find an existing enrollment for this student+course
      // and update it via PUT instead of creating a new record via POST.
      try {
        const studentIdCandidate =
          enrollmentPayload?.StudentID ?? enrollmentPayload?.studentID ?? null;
        const courseCandidate =
          enrollmentPayload?.CourseID ?? enrollmentPayload?.CourseId ?? enrollmentPayload?.courseID ?? enrollmentPayload?.courseId ?? null;

        if (studentIdCandidate && courseCandidate !== null && courseCandidate !== undefined) {
          try {
            const existing = await getEnrollmentsByStudent(studentIdCandidate);
            const match = (existing || []).find((e) => {
              const eid = String(
                e?.courseId ?? e?.CourseID ?? e?.CourseId ?? e?.raw?.CourseID ?? ""
              ).trim();
              const cid = String(courseCandidate).trim();
              return eid && cid && eid === cid;
            });

            if (match && match.enrollmentId) {
              try {
                const idStr = String(match.enrollmentId).trim();
                console.debug("[enrollmentService] createEnrollment: matched existing enrollment, attempting PUT /Enrollments/" + idStr, enrollmentPayload);
                const response = await axios.put(`/Enrollments/${idStr}`, enrollmentPayload);
                return normalizeEnrollmentRecord(response.data, enrollmentPayload?.StudentID);
              } catch (putMatchErr) {
                console.warn('PUT to matched enrollment failed', putMatchErr);
              }
            }
          } catch (lookupErr) {
            console.warn('Failed to lookup existing enrollments for student', lookupErr);
          }
        }
      } catch (e) {
        // ignore and fall through to not creating
      }

      // Creation via POST is intentionally disabled per requested behavior.
      console.warn('createEnrollment: POST /Enrollments is disabled; no existing enrollment found to update.');
      return null;
    } catch (error) {
      console.error('Failed to create/update enrollment via API', error);
      return null;
    }
  })();

  inFlight.set(key, promise);
  // ensure cleanup when done
  promise.finally(() => inFlight.delete(key)).catch(() => {});
  return promise;
};

// Create multiple enrollments for a student (one per course id).
// courseIds can be array of strings or numbers.
export const createEnrollmentsForStudent = async (
  studentId,
  courseIds = [],
  options = {}
) => {
  if (!studentId) return [];
  const created = [];

  const defaultDate = options.EnrollmentDate || new Date().toISOString();

  // Fetch existing enrollments to prevent creating duplicates
  let existing = [];
  try {
    existing = await getEnrollmentsByStudent(studentId);
  } catch (e) {
    existing = [];
  }

  const existingSet = new Set(
    (existing || [])
      .map((e) => String(e?.courseId ?? e?.CourseID ?? e?.raw?.CourseID ?? e?.CourseId ?? "").trim())
      .filter(Boolean)
  );

  // Normalize incoming courseIds and create only those not present already
  for (const rawId of Array.isArray(courseIds) ? courseIds : []) {
    const rawStr = String(rawId ?? "").trim();
    if (!rawStr) continue;

    if (existingSet.has(rawStr)) {
      // skip already-enrolled course
      continue;
    }

    // determine numeric representation if possible
    const numeric = Number(rawStr);
    const courseForApi = Number.isNaN(numeric) ? rawStr : numeric;

    const payload = {
      StudentID: studentId,
      CourseID: courseForApi,
      EnrollmentDate: defaultDate,
      IsActive: options.IsActive !== undefined ? !!options.IsActive : true,
    };

    const res = await createEnrollment(payload);
    if (res) {
      created.push(res);
      existingSet.add(String(res.courseId ?? res.CourseID ?? res.CourseId ?? res.raw?.CourseID ?? courseForApi));
    }
  }

  return created;
};


// 🔹 NEW: direct POST helper for creating a single enrollment
export const createEnrollmentPost = async (payload = {}) => {
  const studentId = payload.StudentID;
  const courseId =
    payload.CourseID ?? payload.CourseId ?? payload.courseID ?? payload.courseId;

  if (!studentId || !courseId) {
    console.warn("createEnrollmentPost: missing StudentID or CourseID", payload);
    return null;
  }

  const numericStudent = Number(studentId);
  const numericCourse = Number(courseId);

  const body = {
    StudentID: Number.isNaN(numericStudent) ? studentId : numericStudent,
    CourseID: Number.isNaN(numericCourse) ? courseId : numericCourse,
    // For now, SubjectID is defaulted (0) until subject selection UI exists
    SubjectID: payload.SubjectID ?? 0,
    EnrollmentDate: payload.EnrollmentDate || new Date().toISOString(),
    IsActive: payload.IsActive !== undefined ? !!payload.IsActive : true,
  };

  const response = await axios.post("/Enrollments", body);
  return normalizeEnrollmentRecord(response.data, body.StudentID);
};



// 🔹 NEW: POST-based bulk create for a student's enrollments
export const createEnrollmentsForStudentPost = async (
  studentId,
  courseIds = [],
  options = {}
) => {
  if (!studentId) return [];

  const created = [];
  const defaultDate = options.EnrollmentDate || new Date().toISOString();
  const subjectDefault = options.SubjectID ?? 0;
  const isActive = options.IsActive !== undefined ? !!options.IsActive : true;

  for (const rawId of Array.isArray(courseIds) ? courseIds : []) {
    const str = String(rawId ?? "").trim();
    if (!str) continue;

    const num = Number(str);
    const courseForApi = Number.isNaN(num) ? str : num;

    try {
      const res = await createEnrollmentPost({
        StudentID: studentId,
        CourseID: courseForApi,
        SubjectID: subjectDefault,
        EnrollmentDate: defaultDate,
        IsActive: isActive,
      });

      if (res) {
        created.push(res);
      }
    } catch (err) {
      console.error("Failed to POST enrollment for course", courseForApi, err);
    }
  }

  return created;
};


// List enrollments for a given student. Returns an array of
// { EnrollmentID, StudentID, CourseID, EnrollmentDate, ... }
// export const getEnrollmentsByStudent = async (studentId) => {
//   if (studentId === undefined || studentId === null) return [];
//   const idStr = String(studentId).trim();
//   if (!idStr) return [];

//   try {
//     const response = await axios.get(`/Enrollments/Student/${idStr}`);
//     const raw = Array.isArray(response.data)
//       ? response.data
//       : response.data?.enrollments || response.data?.Enrollments || [];
//     return raw.map((entry) => normalizeEnrollmentRecord(entry, studentId));
//   } catch (error) {
//     console.error("Failed to fetch enrollments for student", error);
//     return [];
//   }
// };

export const getEnrollmentsByStudent = async (studentId) => {
  if (studentId === undefined || studentId === null) return [];

  const idStr = String(studentId).trim();
  if (!idStr) return [];

  try {
    const response = await axios.get(`/Enrollments/Student/${idStr}`);

    const raw = Array.isArray(response.data)
      ? response.data
      : response.data?.enrollments ||
        response.data?.Enrollments ||
        response.data?.data ||
        [];

    return raw
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;

        // Normalize EnrollmentID
        const enrollmentId =
          entry.EnrollmentID ??
          entry.enrollmentID ??
          entry.enrollmentId ??
          entry.id ??
          entry.Id ??
          null;

        // Get raw course from backend
        const courseRaw =
          entry.Course ??
          entry.course ??
          entry.CourseDetails ??
          entry.courseDetails ??
          null;

        // Format course if we have it
        const courseFormatted = courseRaw ? formatCourse(courseRaw) : null;

        // Normalize CourseID, preferring formatted course
        const courseId =
          courseFormatted?.id ??
          courseFormatted?.CourseID ??
          courseFormatted?.courseId ??
          entry.CourseID ??
          entry.courseID ??
          entry.CourseId ??
          entry.courseId ??
          null;

        return {
          ...entry,
          // normalized enrollment id
          EnrollmentID: enrollmentId,
          enrollmentID: enrollmentId,
          enrollmentId: enrollmentId,

          // normalized course id fields
          CourseID: courseId,
          courseID: courseId,
          courseId: courseId,

          // attach formatted course object (if any)
          Course: courseFormatted ?? courseRaw ?? null,
          course: courseFormatted ?? courseRaw ?? null,
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.error("Failed to load enrollments for student", err);
    throw err;
  }
};

// Delete an enrollment by its id
// The original implementation performed an HTTP DELETE request.
// It was intentionally commented out earlier; restore a safe stub so
// callers don't fail during compilation. This stub is a no-op and
// intentionally does NOT send any network request. Change this
// behavior back to performing a real DELETE if you want to re-enable removal.
export const deleteEnrollment = async (enrollmentId) => {
  if (enrollmentId === undefined || enrollmentId === null) return false;
  const idStr = String(enrollmentId).trim();
  if (!idStr) return false;

  console.warn(
    "deleteEnrollment is disabled in the client (no HTTP request sent)",
    idStr
  );
  // Return false to indicate nothing was deleted. Callers that expect a
  // boolean will receive false. If you want callers to treat this as success,
  // return true instead.
  return false;
};

// Delete an enrolled course for a specific user (admin-scoped).
// Calls DELETE /User/{userId}/Courses/{courseId} on the backend.
export const deleteUserCourse = async (userId, courseId) => {
  if (userId === undefined || userId === null) return false;
  if (courseId === undefined || courseId === null) return false;

  const uid = String(userId).trim();
  const cid = String(
    (courseId && (courseId.id || courseId.CourseID)) || courseId
  ).trim();
  if (!uid || !cid) return false;

  try {
    // Admin-scoped route: delete a student's course from the admin area
    await axios.delete(`/Admin/Students/${uid}/Courses/${cid}`);
    return true;
  } catch (err) {
    console.error(
      `Failed to delete admin-scoped student course ${cid} for student ${uid}`,
      err
    );
    return false;
  }
};

export const updateEnrollment = async (enrollmentId, updates = {}) => {
  if (enrollmentId === undefined || enrollmentId === null) return null;
  const idStr = String(enrollmentId).trim();
  if (!idStr) return null;
  try {
    // Prefer PUT for updates (some backends expect full-resource updates)
    const response = await axios.put(`/Enrollments/${idStr}`, updates);
    return normalizeEnrollmentRecord(response.data, updates?.StudentID ?? null);
  } catch (putError) {
    // If PUT fails, try PATCH as a fallback
    try {
      const response = await axios.patch(`/Enrollments/${idStr}`, updates);
      return normalizeEnrollmentRecord(response.data, updates?.StudentID ?? null);
    } catch (patchError) {
      console.error("Failed to update enrollment (PUT and PATCH attempted)", patchError);
      throw patchError;
    }
  }
};

export const getEnrollmentById = async (enrollmentId) => {
  if (enrollmentId === undefined || enrollmentId === null) return null;
  const idStr = String(enrollmentId).trim();
  if (!idStr) return null;

  try {
    const response = await axios.get(`/Enrollments/${idStr}`);
    return normalizeEnrollmentRecord(response.data);
  } catch (error) {
    console.error("Failed to fetch enrollment", error);
    throw error;
  }
};

export const updateEnrollmentClass = async (
  enrollmentId,
  nextClassId,
  overrides = {}
) => {
  const existing = await getEnrollmentById(enrollmentId);
  if (!existing || existing.enrollmentId === null) {
    throw new Error("Enrollment not found");
  }

  const payload = {
    EnrollmentID: existing.enrollmentId,
    StudentID: existing.studentId,
    CourseID: existing.courseId,
    SubjectID: existing.subjectId,
    ClassID: nextClassId ?? null,
    EnrollmentDate:
      overrides.EnrollmentDate ??
      existing.enrollmentDate ??
      new Date().toISOString(),
    IsActive: overrides.IsActive ?? existing.isActive ?? true,
  };

  const response = await axios.put(
    `/Enrollments/${existing.enrollmentId}`,
    payload
  );
  return normalizeEnrollmentRecord(
    response.data ?? payload,
    existing.studentId
  );
};

export const setEnrollmentActiveStatus = async (
  enrollmentId,
  isActive,
  context = {}
) => {
  const payload = { IsActive: Boolean(isActive) };
  const numericId = Number(enrollmentId);
  if (!Number.isNaN(numericId)) {
    payload.EnrollmentID = numericId;
  } else if (enrollmentId !== undefined && enrollmentId !== null) {
    payload.EnrollmentID = enrollmentId;
  }

  const studentId =
    context.StudentID ??
    context.studentID ??
    context.studentId ??
    context.UserID ??
    context.userID ??
    context.userId ??
    null;
  if (studentId !== null && studentId !== undefined) {
    payload.StudentID = studentId;
  }

  const courseId =
    context.CourseID ??
    context.courseID ??
    context.courseId ??
    context.CourseId ??
    null;
  if (courseId !== null && courseId !== undefined) {
    payload.CourseID = courseId;
  }

  const subjectId =
    context.SubjectID ??
    context.subjectID ??
    context.subjectId ??
    context.SubjectId ??
    null;
  if (subjectId !== null && subjectId !== undefined) {
    payload.SubjectID = subjectId;
  }

  const enrollmentDate =
    context.EnrollmentDate ?? context.enrollmentDate ?? null;
  if (enrollmentDate) {
    payload.EnrollmentDate = enrollmentDate;
  }

  return updateEnrollment(enrollmentId, payload);
};

export default {
  createEnrollment,
  createEnrollmentsForStudent,
  getEnrollmentsByStudent,
  deleteEnrollment,
  createEnrollmentPost,             // ✅ new
  createEnrollmentsForStudentPost,  // ✅ new
  deleteUserCourse,
  updateEnrollment,
  getEnrollmentById,
  updateEnrollmentClass,
  setEnrollmentActiveStatus,
};
