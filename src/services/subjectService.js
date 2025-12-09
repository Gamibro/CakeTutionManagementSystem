import axios from "axios";
import { getAllCourses } from "./courseService";

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

const normalizeNameArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  const str = String(value).trim();
  if (!str) return [];
  return str
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
};

const extractCourseMetadata = (raw) => {
  if (!raw || typeof raw !== "object") {
    return { courseIds: [], courseNames: [], courseCodes: [], courses: [] };
  }

  const idMap = new Map();
  const nameSet = new Set();
  const codeSet = new Set();
  const courses = [];

  const pushId = (value) => {
    const normalized = normalizeIdValue(value);
    if (normalized === null) return;
    const key =
      typeof normalized === "number" ? String(normalized) : normalized;
    if (!idMap.has(key)) idMap.set(key, normalized);
  };

  const pushName = (value) => {
    const names = normalizeNameArray(value);
    names.forEach((name) => nameSet.add(name));
  };

  const pushCode = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .forEach((entry) => codeSet.add(entry));
      return;
    }
    const str = String(value).trim();
    if (!str) return;
    str
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((entry) => codeSet.add(entry));
  };

  const pushCourse = (course) => {
    if (!course || typeof course !== "object") return;
    const idCandidate =
      course.CourseID ??
      course.courseID ??
      course.courseId ??
      course.CourseId ??
      course.id ??
      course.Id ??
      course.course?.id ??
      course.Course?.id ??
      null;
    const normalizedId = normalizeIdValue(idCandidate);
    pushId(normalizedId ?? idCandidate);

    const nameCandidate =
      course.CourseName ??
      course.courseName ??
      course.name ??
      course.Title ??
      course.title ??
      "";
    const codeCandidate =
      course.CourseCode ??
      course.courseCode ??
      course.code ??
      course.Code ??
      "";

    pushName(nameCandidate);
    pushCode(codeCandidate);

    courses.push({
      id: normalizedId,
      name: String(nameCandidate || "").trim(),
      code: String(codeCandidate || "").trim(),
    });
  };

  [raw.CourseID, raw.courseID, raw.CourseId, raw.courseId].forEach(pushId);
  pushName(raw.courseName);
  pushName(raw.CourseName);
  pushCode(raw.courseCode);
  pushCode(raw.CourseCode);

  const directIdArrays = [
    raw.CourseIDs,
    raw.courseIDs,
    raw.CourseIds,
    raw.courseIds,
  ];
  directIdArrays.forEach((source) => {
    if (Array.isArray(source)) source.forEach(pushId);
  });

  [raw.courseNames, raw.CourseNames].forEach(pushName);
  [raw.courseCodes, raw.CourseCodes].forEach(pushCode);

  const courseCollections = [
    raw.Courses,
    raw.courses,
    raw.courseList,
    raw.CourseList,
    raw.CourseAssignments,
    raw.courseAssignments,
    raw.CourseSubjects,
    raw.courseSubjects,
    raw.LinkedCourses,
    raw.linkedCourses,
  ];

  courseCollections.forEach((collection) => {
    if (!collection) return;
    if (Array.isArray(collection)) {
      collection.forEach((entry) => {
        if (entry && typeof entry === "object") {
          pushCourse(entry);
        } else {
          pushName(entry);
        }
      });
    } else if (typeof collection === "object") {
      Object.values(collection).forEach((entry) => {
        if (entry && typeof entry === "object") {
          pushCourse(entry);
        } else {
          pushName(entry);
        }
      });
    }
  });

  pushCourse(raw.Course);
  pushCourse(raw.course);

  const courseIds = Array.from(idMap.values());
  const courseNames = Array.from(nameSet.values());
  const courseCodes = Array.from(codeSet.values());

  const dedupedCourses = [];
  const seenKeys = new Set();
  courses.forEach((course) => {
    const key =
      course.id !== null && course.id !== undefined
        ? `id:${String(course.id)}`
        : `name:${course.name}|code:${course.code}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    dedupedCourses.push(course);
  });

  return { courseIds, courseNames, courseCodes, courses: dedupedCourses };
};

const mapSubject = (raw) => {
  if (!raw) return null;

  const { courseIds, courseNames, courseCodes, courses } =
    extractCourseMetadata(raw);

  const primaryCourseIdCandidate =
    normalizeIdValue(
      raw.CourseID ??
        raw.courseID ??
        raw.CourseId ??
        raw.courseId ??
        courseIds[0]
    ) ?? null;

  const primaryCourseName =
    (Array.isArray(courseNames) && courseNames.length
      ? courseNames[0]
      : null) ??
    raw.courseName ??
    raw.CourseName ??
    raw.course ??
    raw.courseTitle ??
    "";

  const primaryCourseCode =
    (Array.isArray(courseCodes) && courseCodes.length
      ? courseCodes[0]
      : null) ??
    raw.courseCode ??
    raw.CourseCode ??
    "";

  return {
    id:
      raw.id ??
      raw.SubjectID ??
      raw.SubjectId ??
      raw.subjectID ??
      raw.subjectId ??
      raw.subject_id ??
      null,
    name:
      raw.name ??
      raw.subjectName ??
      raw.SubjectName ??
      raw.title ??
      raw.Title ??
      "",
    subjectCode:
      raw.subjectCode ?? raw.SubjectCode ?? raw.code ?? raw.Code ?? "",
    courseId: primaryCourseIdCandidate,
    CourseID: primaryCourseIdCandidate,
    courseName:
      Array.isArray(courseNames) && courseNames.length
        ? courseNames.join(", ")
        : primaryCourseName,
    CourseName: primaryCourseName,
    courseNames,
    CourseNames: courseNames,
    courseCodes,
    CourseCodes: courseCodes,
    courseIds,
    CourseIDs: courseIds,
    courses,
    description: raw.description ?? raw.Description ?? raw.details ?? "",
  };
};

export const getAllSubjects = async () => {
  try {
    const resp = await axios.get("/Subjects");
    const raw = Array.isArray(resp.data)
      ? resp.data
      : resp.data?.subjects || [];
    const subjects = raw.map(mapSubject).filter(Boolean);
    if (subjects.length) return subjects;
  } catch (_) {
    // ignore and attempt course-derived fallback below
  }

  try {
    const courses = await getAllCourses();
    const fromCourses = [];
    for (const c of courses || []) {
      const courseId =
        c.id ?? c.CourseID ?? c.courseId ?? c.courseID ?? c.CourseId ?? null;
      const courseName =
        c.name ?? c.CourseName ?? c.courseName ?? c.title ?? c.Title ?? "";
      const courseCode = c.code ?? c.CourseCode ?? c.courseCode ?? "";

      const subjects =
        c.subjects ||
        c.Subjects ||
        c.subjectList ||
        c.subjectNames ||
        c.SubjectNames ||
        [];
      if (c.subject || c.Subject) {
        const sname = c.subject || c.Subject;
        fromCourses.push({
          id: `${c.id}-primary-${sname}`,
          name: sname,
          courseName,
          courseNames: courseName ? [courseName] : [],
          courseIds: courseId !== null ? [courseId] : [],
          CourseIDs: courseId !== null ? [courseId] : [],
          courseCodes: courseCode ? [courseCode] : [],
          courses: [
            {
              id: courseId,
              name: courseName,
              code: courseCode,
            },
          ],
        });
      }
      if (Array.isArray(subjects) && subjects.length) {
        for (const s of subjects) {
          const name =
            typeof s === "string"
              ? s
              : s.name ?? s.subjectName ?? s.SubjectName ?? s.Title ?? s.title;
          if (name) {
            fromCourses.push({
              id: `${c.id}-${name}`,
              name,
              courseName,
              courseNames: courseName ? [courseName] : [],
              courseIds: courseId !== null ? [courseId] : [],
              CourseIDs: courseId !== null ? [courseId] : [],
              courseCodes: courseCode ? [courseCode] : [],
              courses: [
                {
                  id: courseId,
                  name: courseName,
                  code: courseCode,
                },
              ],
            });
          }
        }
      }
    }

    const map = new Map();
    for (const s of fromCourses) {
      const key = `${String(s.name || "").toLowerCase()}|${String(
        s.courseName || ""
      ).toLowerCase()}`;
      if (!map.has(key)) map.set(key, mapSubject(s));
    }
    return Array.from(map.values());
  } catch (_) {
    return [];
  }
};
//when i clicks save button it call  this dunction

export const createSubject = async (subjectData) => {
  try {
    // Build payload expected by backend
    const name =
      (subjectData?.name || subjectData?.subjectName || subjectData?.SubjectName || "")
        .toString()
        .trim();
    const code =
      (subjectData?.subjectCode || subjectData?.SubjectCode || subjectData?.code || "")
        .toString()
        .trim();
    const description =
      (subjectData?.description || subjectData?.Description || "")
        .toString()
        .trim();

    // totalFee: support multiple input keys
    const feeRaw =
      subjectData?.fee ?? subjectData?.Fee ?? subjectData?.subjectFee ?? subjectData?.SubjectFee ?? subjectData?.totalFee ?? subjectData?.TotalFee ?? null;
    const totalFee = feeRaw !== null && feeRaw !== undefined && String(feeRaw).toString().trim() !== "" ? Number(String(feeRaw).replace(/,/g, "")) : null;

    // duration: try duration_In_Months or parse numeric from duration string
    let durationMonths = null;
    if (subjectData?.duration_In_Months || subjectData?.Duration_In_Months || subjectData?.durationMonths || subjectData?.duration) {
      const cand = subjectData?.duration_In_Months ?? subjectData?.Duration_In_Months ?? subjectData?.durationMonths ?? subjectData?.duration;
      const candStr = String(cand ?? "").trim();
      const m = candStr.match(/-?\d+(?:\.\d+)?/);
      if (m) {
        const n = Number(m[0]);
        if (!Number.isNaN(n)) durationMonths = n;
      }
    }

    // monthly fee
    const monthlyRaw = subjectData?.monthlyFee ?? subjectData?.MonthlyFee ?? subjectData?.monthly ?? null;
    const monthlyFee = monthlyRaw !== null && monthlyRaw !== undefined && String(monthlyRaw).toString().trim() !== "" ? Number(String(monthlyRaw).replace(/,/g, "")) : null;

    const payload = {
      subjectName: name,
      subjectCode: code,
      description: description,
    };
    if (totalFee !== null) payload.totalFee = totalFee;
    if (durationMonths !== null) payload.duration_In_Months = durationMonths;
    if (monthlyFee !== null) payload.monthlyFee = monthlyFee;

    // Post explicitly to the backend API URL
    const resp = await axios.post("http://localhost:50447/api/Subjects", payload);
    return mapSubject(resp.data);
  } catch (err) {
    console.error("Failed to create subject via API", err);
    throw err;
  }
};

export const deleteSubject = async (subjectId) => {
  try {
    await axios.delete(`/Subjects/${subjectId}`);
    return true;
  } catch (err) {
    console.error("Failed to delete subject via API", err);
    throw err;
  }
};

export const getSubjectById = async (subjectId) => {
  try {
    const resp = await axios.get(`/Subjects/${subjectId}`);
    return mapSubject(resp.data);
  } catch (err) {
    // fallback: search in derived subject list
    const all = await getAllSubjects();
    return all.find((s) => String(s.id) === String(subjectId)) || null;
  }
};

export const getStudentsBySubject = async (subjectId) => {
  if (subjectId === null || subjectId === undefined) {
    return [];
  }

  const trimmed = String(subjectId).trim();
  if (!trimmed) {
    return [];
  }

  const encoded = encodeURIComponent(trimmed);
  const baseUrl = axios?.defaults?.baseURL ?? "";
  const baseHasApiSuffix = /\/api\/?$/i.test(String(baseUrl));

  const candidateEndpoints = new Set([
    `/Subjects/StudentsBySubject/${encoded}`,
    `/Subjects/StudentsBySubject?subjectId=${encoded}`,
  ]);

  if (!baseHasApiSuffix) {
    candidateEndpoints.add(`/api/Subjects/StudentsBySubject/${encoded}`);
    candidateEndpoints.add(
      `/api/Subjects/StudentsBySubject?subjectId=${encoded}`
    );
  }

  let lastError = null;

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await axios.get(endpoint);

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (Array.isArray(response.data?.students)) {
        return response.data.students;
      }

      if (
        response.data &&
        typeof response.data === "object" &&
        Array.isArray(response.data?.data)
      ) {
        return response.data.data;
      }

      // If the endpoint succeeds but returns unexpected shape, continue to next
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  if (lastError) {
    console.error(
      `Failed to fetch students for subject ${subjectId}`,
      lastError
    );
    throw lastError;
  }

  return [];
};

export const getEnrolledSubjectsByStudent = async (studentId) => {
  if (studentId === null || studentId === undefined) {
    return [];
  }

  const trimmed = String(studentId).trim();
  if (!trimmed) {
    return [];
  }

  const encoded = encodeURIComponent(trimmed);
  const baseUrl = axios?.defaults?.baseURL ?? "";
  const baseHasApiSuffix = /\/api\/?$/i.test(String(baseUrl));

  const candidateEndpoints = new Set([
    `/Subjects/EnrolledByStudent/${encoded}`,
    `/Subjects/EnrolledByStudent?studentId=${encoded}`,
    `/Subjects/EnrolledByStudent?studentID=${encoded}`,
  ]);

  if (!baseHasApiSuffix) {
    candidateEndpoints.add(`/api/Subjects/EnrolledByStudent/${encoded}`);
    candidateEndpoints.add(
      `/api/Subjects/EnrolledByStudent?studentId=${encoded}`
    );
    candidateEndpoints.add(
      `/api/Subjects/EnrolledByStudent?studentID=${encoded}`
    );
  }

  const extractArrayPayload = (data) => {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return null;

    const candidates = [
      data.data,
      data.result,
      data.results,
      data.Subjects,
      data.subjects,
      data.payload,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    const firstArrayValue = Object.values(data).find((value) =>
      Array.isArray(value)
    );
    return Array.isArray(firstArrayValue) ? firstArrayValue : null;
  };

  let lastError = null;

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await axios.get(endpoint);
      const rawList = extractArrayPayload(response.data) ?? [];

      const normalized = rawList
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          const courseIdCandidate =
            entry.CourseID ??
            entry.courseID ??
            entry.courseId ??
            entry.CourseId ??
            entry.id ??
            entry.Id ??
            null;
          const courseId = normalizeIdValue(courseIdCandidate);

          const rawCourseName =
            entry.CourseName ??
            entry.courseName ??
            entry.title ??
            entry.Title ??
            entry.name ??
            "";
          const courseName = String(rawCourseName || "").trim();

          const subjectsSource =
            entry.Subjects ?? entry.subjects ?? entry.Classes ?? entry.classes;

          const subjectsArray = Array.isArray(subjectsSource)
            ? subjectsSource
            : [];

          const seenSubjectKeys = new Set();
          const normalizedSubjects = subjectsArray
            .map((subject) => {
              if (subject === null || subject === undefined) {
                return null;
              }

              if (typeof subject !== "object") {
                const subjectName = String(subject || "").trim();
                if (!subjectName) return null;
                const key = `name:${subjectName.toLowerCase()}`;
                if (seenSubjectKeys.has(key)) return null;
                seenSubjectKeys.add(key);
                return {
                  subjectId: null,
                  SubjectID: null,
                  subjectName,
                  SubjectName: subjectName,
                };
              }

              const subjectIdCandidate =
                subject.SubjectID ??
                subject.subjectID ??
                subject.SubjectId ??
                subject.subjectId ??
                subject.id ??
                subject.Id ??
                null;
              const subjectId = normalizeIdValue(subjectIdCandidate);

              const rawSubjectName =
                subject.SubjectName ??
                subject.subjectName ??
                subject.Name ??
                subject.name ??
                subject.Title ??
                subject.title ??
                "";
              const subjectName = String(rawSubjectName || "").trim();
              if (!subjectName) return null;

              const key =
                subjectId !== null && subjectId !== undefined
                  ? `id:${subjectId}`
                  : `name:${subjectName.toLowerCase()}`;
              if (seenSubjectKeys.has(key)) return null;
              seenSubjectKeys.add(key);

              return {
                subjectId,
                SubjectID: subjectId,
                subjectName,
                SubjectName: subjectName,
              };
            })
            .filter(Boolean);

          const summaryKeyParts = [];
          if (courseId !== null && courseId !== undefined) {
            summaryKeyParts.push(`id:${courseId}`);
          }
          if (courseName) {
            summaryKeyParts.push(`name:${courseName.toLowerCase()}`);
          }
          if (normalizedSubjects.length) {
            summaryKeyParts.push(
              normalizedSubjects
                .map((subject) => {
                  if (
                    subject.subjectId !== null &&
                    subject.subjectId !== undefined
                  ) {
                    return `sid:${subject.subjectId}`;
                  }
                  return `sname:${subject.subjectName.toLowerCase()}`;
                })
                .join("|")
            );
          }

          return {
            courseId,
            CourseID: courseId,
            courseName,
            CourseName: courseName,
            subjects: normalizedSubjects.map((subject) => ({
              subjectId: subject.subjectId,
              SubjectID: subject.SubjectID,
              subjectName: subject.subjectName,
              SubjectName: subject.SubjectName,
            })),
            key: summaryKeyParts.join("::") || undefined,
          };
        })
        .filter(Boolean);

      return normalized;
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  if (lastError) {
    console.error(
      `Failed to fetch enrolled subjects for student ${studentId}`,
      lastError
    );
    throw lastError;
  }

  return [];
};

// Update an existing subject
export const updateSubject = async (subjectId, data) => {
  try {
    const courseIdInputs = [];
    if (Array.isArray(data?.CourseIDs)) courseIdInputs.push(...data.CourseIDs);
    if (Array.isArray(data?.courseIDs)) courseIdInputs.push(...data.courseIDs);
    if (Array.isArray(data?.CourseIds)) courseIdInputs.push(...data.CourseIds);
    if (Array.isArray(data?.courseIds)) courseIdInputs.push(...data.courseIds);

    const normalizedCourseIds = normalizeIdArray(courseIdInputs);
    const primaryCourseId =
      normalizeIdValue(
        data?.CourseID ??
          data?.courseID ??
          data?.CourseId ??
          data?.courseId ??
          (normalizedCourseIds.length ? normalizedCourseIds[0] : null)
      ) ?? undefined;

    const courseNameSet = new Set();
    normalizeNameArray(data?.courseNames).forEach((name) =>
      courseNameSet.add(name)
    );
    normalizeNameArray(data?.CourseNames).forEach((name) =>
      courseNameSet.add(name)
    );
    if (data?.courseName) {
      const single = String(data.courseName).trim();
      if (single) courseNameSet.add(single);
    }
    if (data?.CourseName) {
      const single = String(data.CourseName).trim();
      if (single) courseNameSet.add(single);
    }
    const normalizedCourseNames = Array.from(courseNameSet);
    const primaryCourseName =
      normalizedCourseNames.length > 0
        ? normalizedCourseNames[0]
        : data?.courseName ?? data?.CourseName ?? "";

    const courseCodeSet = new Set();
    normalizeNameArray(data?.courseCodes).forEach((code) =>
      courseCodeSet.add(code)
    );
    normalizeNameArray(data?.CourseCodes).forEach((code) =>
      courseCodeSet.add(code)
    );
    if (data?.courseCode) {
      const single = String(data.courseCode).trim();
      if (single) courseCodeSet.add(single);
    }
    if (data?.CourseCode) {
      const single = String(data.CourseCode).trim();
      if (single) courseCodeSet.add(single);
    }
    const normalizedCourseCodes = Array.from(courseCodeSet);
    const primaryCourseCode =
      normalizedCourseCodes.length > 0
        ? normalizedCourseCodes[0]
        : data?.courseCode ?? data?.CourseCode ?? "";

    const payload = {
      subjectId: subjectId,
      SubjectID: subjectId,
      id: subjectId,
      subjectName: data.subjectName ?? data.SubjectName ?? data.name,
      SubjectName: data.subjectName ?? data.SubjectName ?? data.name,
      name: data.name ?? data.subjectName ?? data.SubjectName,
      subjectCode: data.subjectCode ?? data.SubjectCode ?? data.code,
      SubjectCode: data.subjectCode ?? data.SubjectCode ?? data.code,
      code: data.subjectCode ?? data.SubjectCode ?? data.code,
      Code: data.subjectCode ?? data.SubjectCode ?? data.code,
      description: data.description ?? data.Description,
      Description: data.description ?? data.Description,
      courseId: primaryCourseId,
      CourseID: primaryCourseId,
      CourseId: primaryCourseId,
      courseIds: normalizedCourseIds,
      CourseIDs: normalizedCourseIds,
      CourseIds: normalizedCourseIds,
      courseName: primaryCourseName,
      CourseName: primaryCourseName,
      courseNames: normalizedCourseNames,
      CourseNames: normalizedCourseNames,
      courseCode: primaryCourseCode,
      CourseCode: primaryCourseCode,
      courseCodes: normalizedCourseCodes,
      CourseCodes: normalizedCourseCodes,
    };
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(([key, value]) => {
        if (key === "CourseIDs" || key === "CourseIds" || key === "courseIds") {
          return value !== undefined;
        }
        return value !== undefined && value !== null;
      })
    );

    const resp = await axios.put(`/Subjects/${subjectId}`, cleanedPayload);
    return mapSubject(resp.data || cleanedPayload);
  } catch (err) {
    console.error("Failed to update subject via API", err);
    throw err;
  }
};

// Fetch latest subject id from backend with flexible endpoint detection
// export const getLatestSubjectId = async () => {
//   const endpoints = [
//     "/Subjects/LatestId",
//     "/subjects/LatestId",
//     "/Subjects/latest",
//     "/api/Subjects/LatestId",
//   ];

//   for (const ep of endpoints) {
//     try {
//       const resp = await axios.get(ep);
//       const data = resp?.data ?? {};
//       const id =
//         data.latestSubjectId ?? data.latestId ?? data.SubjectID ?? data.id;
//       if (id !== undefined && id !== null && String(id).trim() !== "") {
//         return Number(id);
//       }
//     } catch (_) {
//       // try next endpoint
//     }
//   }

//   // fallback: derive from subjects list
//   try {
//     const subjects = await getAllSubjects();
//     const maxId = Math.max(
//       0,
//       ...subjects
//         .map((s) => Number(s.id ?? s.SubjectID ?? s.subjectId ?? 0))
//         .filter((n) => !Number.isNaN(n))
//     );
//     return maxId || null;
//   } catch (_) {
//     return null;
//   }
// };

export default {
  getAllSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
  // getLatestSubjectId,
  updateSubject,
  getEnrolledSubjectsByStudent,
};
