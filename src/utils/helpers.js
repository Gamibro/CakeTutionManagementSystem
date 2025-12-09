export const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy} / ${mm} / ${dd}`;
};

export const formatTime = (timeString) => {
  const options = { hour: "2-digit", minute: "2-digit" };
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString(
    undefined,
    options
  );
};

export const getFileType = (fileName) => {
  const extension = fileName.split(".").pop().toLowerCase();
  switch (extension) {
    case "pdf":
      return "PDF";
    case "doc":
    case "docx":
      return "Word";
    case "ppt":
    case "pptx":
      return "PowerPoint";
    case "xls":
    case "xlsx":
      return "Excel";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return "Image";
    case "mp4":
    case "mov":
    case "avi":
      return "Video";
    case "mp3":
    case "wav":
      return "Audio";
    default:
      return "File";
  }
};

export const truncate = (str, n) => {
  return str.length > n ? str.substr(0, n - 1) + "..." : str;
};

export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const normalizeIdentifier = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value);
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (/^-?\d+$/.test(text) && !/^0\d+/.test(text)) {
    return String(Number(text));
  }

  return text;
};

export const collectCourseIdsForStudent = (courses, fallbackCourseId) => {
  const ids = new Set();

  const addId = (value) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(addId);
      return;
    }

    const normalized = normalizeIdentifier(value);
    if (!normalized) {
      return;
    }

    ids.add(normalized);
  };

  if (Array.isArray(courses)) {
    courses.forEach((course) => {
      if (!course || typeof course !== "object") {
        return;
      }

      const candidates = [
        course.id,
        course.courseId,
        course.courseID,
        course.CourseId,
        course.CourseID,
        course.Course?.id,
        course.Course?.courseId,
        course.Course?.courseID,
        course.Course?.CourseId,
        course.Course?.CourseID,
      ];

      candidates.forEach(addId);
    });
  }

  if (fallbackCourseId !== undefined && fallbackCourseId !== null) {
    addId(fallbackCourseId);
  }

  return Array.from(ids);
};

const addSubjectIdCandidate = (value, target) => {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => addSubjectIdCandidate(item, target));
    return;
  }

  const normalized = normalizeIdentifier(value);
  if (!normalized) {
    return;
  }

  if (!target.has(normalized)) {
    target.set(normalized, normalized);
  }
};

const inspectSubjectCandidate = (candidate, target) => {
  if (!candidate) {
    return;
  }

  if (Array.isArray(candidate)) {
    candidate.forEach((entry) => inspectSubjectCandidate(entry, target));
    return;
  }

  if (typeof candidate === "object") {
    addSubjectIdCandidate(
      [
        candidate.SubjectID,
        candidate.subjectID,
        candidate.SubjectId,
        candidate.subjectId,
        candidate.SubjectIDValue,
        candidate.subjectIDValue,
        candidate.id,
        candidate.Id,
        candidate.value,
      ],
      target
    );

    inspectSubjectCandidate(candidate.Subject, target);
    inspectSubjectCandidate(candidate.subject, target);
    inspectSubjectCandidate(candidate.SubjectDetails, target);
    inspectSubjectCandidate(candidate.subjectDetails, target);
    inspectSubjectCandidate(candidate.SubjectInfo, target);
    inspectSubjectCandidate(candidate.subjectInfo, target);
    inspectSubjectCandidate(candidate.SubjectData, target);
    inspectSubjectCandidate(candidate.subjectData, target);

    return;
  }

  addSubjectIdCandidate(candidate, target);
};

const appendCourseSubjectIds = (course, target) => {
  if (!course || typeof course !== "object") {
    return;
  }

  const directLists = [
    course.SubjectIDs,
    course.subjectIDs,
    course.SubjectIds,
    course.subjectIds,
  ];

  directLists.forEach((entry) => inspectSubjectCandidate(entry, target));

  addSubjectIdCandidate(
    [course.SubjectID, course.subjectID, course.SubjectId, course.subjectId],
    target
  );

  const nestedCollections = [
    course.courseSubjects,
    course.CourseSubjects,
    course.subjects,
    course.Subjects,
    course.subjectList,
    course.SubjectList,
  ];

  nestedCollections.forEach((entry) => inspectSubjectCandidate(entry, target));

  inspectSubjectCandidate(course.subject, target);
  inspectSubjectCandidate(course.Subject, target);
  inspectSubjectCandidate(course.subjectDetails, target);
  inspectSubjectCandidate(course.SubjectDetails, target);
};

export const collectSubjectIdsForStudent = (
  courses = [],
  fallbackSubjects = []
) => {
  const subjectIds = new Map();

  if (Array.isArray(courses)) {
    courses.forEach((course) => appendCourseSubjectIds(course, subjectIds));
  }

  inspectSubjectCandidate(fallbackSubjects, subjectIds);

  return Array.from(subjectIds.values());
};
