import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTeacherStudents,
  getCourseDetails,
  getTeacherCourseStudents,
  getTeacherCourses,
} from "../../services/courseService";
import UserList from "../../components/users/UserList";
import UserForm from "../../components/users/UserForm";
import Toast from "../../components/common/Toast";
import {
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from "../../services/userService";
import { uploadProfilePhoto } from "../../services/userService";
import {
  createStudent,
  updateStudent,
  deleteStudent as deleteStudentRecord,
  getStudentById,
} from "../../services/studentService";
import {
  createEnrollmentsForStudent,
  createEnrollment,
  getEnrollmentsByStudent,
  deleteEnrollment,
} from "../../services/enrollmentService";
import { getStudentCourses, deleteTeacherCourse } from "../../services/courseService";
import Loader from "../../components/common/Loader";
import CoursePickerModal from "../../components/courses/CoursePickerModal";
import ClassPickerModal from "../../components/classes/ClassPickerModal";
import { getAllClassSchedules } from "../../services/classScheduleService";
import { getAllSubjects } from "../../services/subjectService";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";

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

const normalizeIdString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const str = String(value).trim();
  if (!str) {
    return null;
  }

  if (/^-?\d+$/.test(str)) {
    const asNumber = Number(str);
    if (!Number.isNaN(asNumber)) {
      return String(asNumber);
    }
  }

  return str;
};

const toNormalizedIdArray = (values) => {
  const seen = new Set();
  const result = [];
  (values || []).forEach((value) => {
    const normalized = normalizeIdString(value);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
};

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const formatScheduleSummary = (schedule) => {
  if (!schedule || typeof schedule !== "object") {
    return "";
  }

  const dayIndex = Number.isFinite(schedule.dayOfWeek)
    ? Math.max(0, Math.min(Number(schedule.dayOfWeek), dayNames.length - 1))
    : null;
  const day = dayIndex !== null ? dayNames[dayIndex] : "";

  const trimTime = (value) => {
    if (!value || typeof value !== "string") {
      return "";
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    return trimmed.slice(0, 5);
  };

  const start = trimTime(schedule.startTime);
  const end = trimTime(schedule.endTime);
  const time = start && end ? `${start}-${end}` : start || end;
  const room = schedule.roomNumber
    ? `Room ${String(schedule.roomNumber).trim()}`
    : "";

  return [day, time, room].filter(Boolean).join(" • ");
};

const deriveClassOptions = (
  courseDetails,
  courseId,
  subjects = [],
  schedules = []
) => {
  const normalizedCourseId = normalizeIdString(
    courseId ??
      courseDetails?.CourseID ??
      courseDetails?.courseID ??
      courseDetails?.CourseId ??
      courseDetails?.courseId ??
      courseDetails?.id ??
      courseDetails?.Id
  );

  const subjectScheduleMap = new Map();
  schedules.forEach((schedule) => {
    if (!schedule || typeof schedule !== "object") {
      return;
    }

    const scheduleCourseId = normalizeIdString(
      schedule.courseId ?? schedule.CourseID ?? schedule.courseID
    );
    if (
      normalizedCourseId &&
      scheduleCourseId &&
      scheduleCourseId !== normalizedCourseId
    ) {
      return;
    }

    const subjectId = normalizeIdString(schedule.subjectId);
    if (!subjectId) {
      return;
    }

    const existing = subjectScheduleMap.get(subjectId) || [];
    existing.push(schedule);
    subjectScheduleMap.set(subjectId, existing);
  });

  const options = [];
  const optionMap = new Map();

  const attachScheduleMeta = (option, subjectId) => {
    const subjectSchedules = subjectScheduleMap.get(subjectId) || [];
    if (!subjectSchedules.length) {
      return;
    }

    const summaries = subjectSchedules
      .map((schedule) => formatScheduleSummary(schedule))
      .filter(Boolean);

    if (summaries.length && !option.meta) {
      option.meta = summaries.slice(0, 2).join(" | ");
    }

    const ids = subjectSchedules
      .map((schedule) => {
        const idCandidate =
          schedule.scheduleId ?? schedule.ScheduleID ?? schedule.id ?? null;
        return idCandidate !== null && idCandidate !== undefined
          ? normalizeIdString(idCandidate)
          : null;
      })
      .filter(Boolean);
    if (ids.length) {
      option.scheduleIds = ids;
    }
  };

  const registerOption = (rawId, labelCandidate, extra = {}) => {
    const normalizedId = normalizeIdString(rawId);
    if (!normalizedId) {
      return;
    }

    const existing = optionMap.get(normalizedId);
    const resolvedLabel = (() => {
      const candidates = [
        labelCandidate,
        extra?.name,
        extra?.subjectName,
        extra?.SubjectName,
        extra?.title,
        extra?.Title,
        existing?.label,
      ];

      for (const candidate of candidates) {
        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          if (trimmed) {
            return trimmed;
          }
        }
      }

      return existing?.label || `Class ${normalizedId}`;
    })();

    const codeCandidate = (() => {
      const candidates = [
        extra?.code,
        extra?.subjectCode,
        extra?.SubjectCode,
        extra?.Code,
        existing?.code,
      ];

      for (const candidate of candidates) {
        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          if (trimmed) {
            return trimmed;
          }
        }
      }

      return existing?.code || "";
    })();

    const resolvedCourseSubjectId = (() => {
      const candidate =
        extra?.courseSubjectId ??
        extra?.CourseSubjectId ??
        extra?.CourseSubjectID ??
        existing?.courseSubjectId;
      const normalized = normalizeIdString(candidate);
      return normalized ?? null;
    })();

    const option = existing || {
      id: normalizedId,
      label: resolvedLabel,
      code: codeCandidate,
      courseSubjectId: resolvedCourseSubjectId,
      source: extra?.source ?? existing?.source ?? null,
    };

    option.label = resolvedLabel;
    option.code = codeCandidate;
    option.courseSubjectId = resolvedCourseSubjectId;
    option.source = extra?.source ?? option.source ?? null;

    attachScheduleMeta(option, normalizedId);

    if (!existing) {
      optionMap.set(normalizedId, option);
      options.push(option);
    }
  };

  const candidateCollections = [
    courseDetails?.subjectDetails,
    courseDetails?.SubjectDetails,
    courseDetails?.courseSubjects,
    courseDetails?.CourseSubjects,
    courseDetails?.subjects,
    courseDetails?.Subjects,
    courseDetails?.subjectStudentGroups,
  ];

  candidateCollections.forEach((collection) => {
    if (!collection) {
      return;
    }

    if (Array.isArray(collection)) {
      collection.forEach((entry) => {
        if (!entry || typeof entry !== "object") {
          return;
        }

        const rawId =
          entry.subjectId ??
          entry.SubjectID ??
          entry.SubjectId ??
          entry.subjectID ??
          entry.SubjectID ??
          entry.id ??
          entry.Id ??
          null;

        registerOption(
          rawId,
          entry.name ?? entry.subjectName ?? entry.SubjectName,
          {
            code:
              entry.code ??
              entry.subjectCode ??
              entry.SubjectCode ??
              entry.Code ??
              null,
            courseSubjectId:
              entry.courseSubjectId ??
              entry.CourseSubjectId ??
              entry.CourseSubjectID ??
              null,
            source: "courseDetails",
          }
        );
      });
      return;
    }

    if (typeof collection === "object") {
      Object.values(collection).forEach((entry) => {
        if (!entry || typeof entry !== "object") {
          return;
        }

        const rawId =
          entry.subjectId ??
          entry.SubjectID ??
          entry.SubjectId ??
          entry.subjectID ??
          entry.SubjectID ??
          entry.id ??
          entry.Id ??
          null;

        registerOption(
          rawId,
          entry.name ?? entry.subjectName ?? entry.SubjectName,
          {
            code:
              entry.code ??
              entry.subjectCode ??
              entry.SubjectCode ??
              entry.Code ??
              null,
            courseSubjectId:
              entry.courseSubjectId ??
              entry.CourseSubjectId ??
              entry.CourseSubjectID ??
              null,
            source: "courseDetails",
          }
        );
      });
    }
  });

  const pushSubjectCourseMatches = (subject) => {
    if (!subject || typeof subject !== "object") {
      return;
    }

    const normalizedSubjectId = normalizeIdString(
      subject.id ??
        subject.SubjectID ??
        subject.subjectID ??
        subject.SubjectId ??
        subject.subjectId
    );
    if (!normalizedSubjectId) {
      return;
    }

    const courseIdCandidates = new Set();
    const addCandidate = (value) => {
      if (Array.isArray(value)) {
        value.forEach(addCandidate);
        return;
      }
      const normalized = normalizeIdString(value);
      if (normalized) {
        courseIdCandidates.add(normalized);
      }
    };

    addCandidate(subject.courseId);
    addCandidate(subject.CourseID);
    addCandidate(subject.CourseId);
    addCandidate(subject.courseID);
    addCandidate(subject.courseIds);
    addCandidate(subject.CourseIDs);
    addCandidate(subject.CourseIds);

    if (Array.isArray(subject.courses)) {
      subject.courses.forEach((course) => {
        addCandidate(
          course?.id ??
            course?.CourseID ??
            course?.courseID ??
            course?.CourseId ??
            course?.courseId
        );
      });
    }

    if (normalizedCourseId) {
      if (!courseIdCandidates.size) {
        return;
      }

      if (!courseIdCandidates.has(normalizedCourseId)) {
        return;
      }
    }

    registerOption(normalizedSubjectId, subject.name ?? subject.SubjectName, {
      code: subject.subjectCode ?? subject.code ?? subject.Code ?? null,
      source: "subjectsFallback",
    });
  };

  if (!options.length) {
    subjects.forEach(pushSubjectCourseMatches);
  }

  subjectScheduleMap.forEach((scheduleList, subjectId) => {
    if (optionMap.has(subjectId)) {
      return;
    }

    const firstSchedule = scheduleList.find(
      (entry) => entry && typeof entry === "object"
    );
    registerOption(
      subjectId,
      firstSchedule?.subjectName ?? firstSchedule?.SubjectName,
      { source: "scheduleFallback" }
    );
  });

  const hasCourseSpecific = options.some(
    (option) => option.source === "courseDetails"
  );

  const filteredOptions = hasCourseSpecific
    ? options.filter((option) => option.source === "courseDetails")
    : options;

  filteredOptions.sort((a, b) => a.label.localeCompare(b.label));
  return filteredOptions;
};

const deriveTeacherCourseIdSet = (courses) => {
  const normalizedCourses = Array.isArray(courses) ? courses : [];
  const ids = toNormalizedIdArray(
    normalizedCourses.map(
      (course) =>
        course?.CourseID ??
        course?.CourseId ??
        course?.courseID ??
        course?.courseId ??
        course?.id ??
        course?.Id ??
        null
    )
  );
  return new Set(ids);
};

const filterCourseIdsBySet = (courseIds, courseIdSet, shouldFilter) => {
  const sourceArray = Array.isArray(courseIds) ? courseIds : [courseIds];
  const normalizedIds = toNormalizedIdArray(sourceArray);
  if (!shouldFilter) {
    return normalizedIds;
  }
  if (!courseIdSet || courseIdSet.size === 0) {
    return [];
  }
  return normalizedIds.filter((id) => courseIdSet.has(id));
};

const filterCourseObjectsBySet = (courses, courseIdSet, shouldFilter) => {
  if (!shouldFilter) {
    return Array.isArray(courses) ? [...courses] : [];
  }
  if (!Array.isArray(courses) || !courseIdSet || courseIdSet.size === 0) {
    return [];
  }
  return courses.filter((course) => {
    const normalizedCourseId = normalizeIdString(
      course?.CourseID ??
        course?.CourseId ??
        course?.courseID ??
        course?.courseId ??
        course?.id ??
        course?.Id ??
        null
    );
    return normalizedCourseId && courseIdSet.has(normalizedCourseId);
  });
};

const TeacherStudents = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [forceUserType, setForceUserType] = useState(null);
  const [editMode, setEditMode] = useState("edit");
  const [formError, setFormError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [pendingCoreData, setPendingCoreData] = useState(null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [pendingStudentData, setPendingStudentData] = useState(null);
  const [courseSelection, setCourseSelection] = useState([]);
  const [coursePickerSaving, setCoursePickerSaving] = useState(false);
  const [coursePickerError, setCoursePickerError] = useState("");
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [classOptions, setClassOptions] = useState([]);
  const [classSelection, setClassSelection] = useState([]);
  const [classPickerLoading, setClassPickerLoading] = useState(false);
  const [classPickerError, setClassPickerError] = useState("");
  const [classPickerCourseName, setClassPickerCourseName] = useState("");
  const [creationSaving, setCreationSaving] = useState(false);
  const teacherId = resolveTeacherId(user);
  const queryCourse = new URLSearchParams(location.search || "").get("course");
  const courseId = queryCourse
    ? String(queryCourse).trim()
    : id
    ? String(id).trim()
    : null;
  const defaultCourseSelection = courseId ? [String(courseId)] : [];
  const subjectsCacheRef = useRef(null);
  const classSchedulesCacheRef = useRef(null);
  const classOptionsCacheRef = useRef(new Map());
  const [teacherCourseFilter, setTeacherCourseFilter] = useState({
    ready: false,
    courses: [],
    hadError: false,
  });
  const teacherCourseIdSet = useMemo(
    () => deriveTeacherCourseIdSet(teacherCourseFilter.courses),
    [teacherCourseFilter.courses]
  );

  useEffect(() => {
    setTeacherCourseFilter({ ready: false, courses: [], hadError: false });
  }, [teacherId]);

  const ensureTeacherCourseFilter = (force = false) => {
    if (!teacherId) {
      setTeacherCourseFilter({ ready: false, courses: [], hadError: false });
      return Promise.resolve({ list: [], ready: false });
    }

    if (!force && teacherCourseFilter.ready && !teacherCourseFilter.hadError) {
      return Promise.resolve({
        list: teacherCourseFilter.courses,
        ready: true,
      });
    }

    return getTeacherCourses(teacherId)
      .then((list) => {
        const normalizedList = Array.isArray(list) ? list : [];
        setTeacherCourseFilter({
          ready: true,
          courses: normalizedList,
          hadError: false,
        });
        return { list: normalizedList, ready: true };
      })
      .catch((error) => {
        console.error("Failed to load teacher courses for filtering:", error);
        setTeacherCourseFilter({
          ready: true,
          courses: [],
          hadError: true,
        });
        return { list: [], ready: true };
      });
  };

  const sanitizeCourseSelection = (values) =>
    filterCourseIdsBySet(values, teacherCourseIdSet, teacherCourseFilter.ready);

  const refreshStudents = async () => {
    if (!teacherId) {
      setStudents([]);
      return;
    }

    try {
      if (courseId) {
        try {
          const { course: scopedCourse, students: scopedStudents } =
            await getTeacherCourseStudents(teacherId, courseId);
          setStudents(scopedStudents);
          if (scopedCourse) {
            setCourse(scopedCourse);
          }
        } catch (error) {
          console.error(
            "Error refreshing course students via teacher route:",
            error
          );
          const fallbackStudents = await getTeacherStudents(courseId, {
            scope: "course",
          });
          setStudents(fallbackStudents);
        }
      } else {
        const updatedStudents = await getTeacherStudents(teacherId);
        setStudents(updatedStudents);
        setCourse(null);
      }
    } catch (error) {
      console.error("Error refreshing students:", error);
    }
  };

  const [membersTab, setMembersTab] = useState("active");
  const [editCourseClassAssignments, setEditCourseClassAssignments] = useState(
    {}
  );
  const editCourseClassAssignmentsRef = useRef(editCourseClassAssignments);
  const [editClassPickerVisible, setEditClassPickerVisible] = useState(false);
  const [editClassPickerOptions, setEditClassPickerOptions] = useState([]);
  const [editClassPickerCourseName, setEditClassPickerCourseName] =
    useState("");
  const [editClassPickerCourseId, setEditClassPickerCourseId] = useState(
    null
  );
  const [editClassPickerInitialSelection, setEditClassPickerInitialSelection] =
    useState([]);
  const editClassPickerResolverRef = useRef(null);

  useEffect(() => {
    editCourseClassAssignmentsRef.current = editCourseClassAssignments;
  }, [editCourseClassAssignments]);

  const openEdit = async (userId, opts = {}) => {
    const mode = opts && opts.mode === "add" ? "add" : "edit";
    setEditMode(mode);
    setEditLoading(true);
    setFormError("");
    setEditStep(1);
    setForceUserType(3);
    try {
      const teacherCourseContextPromise = ensureTeacherCourseFilter();
      const [userData, studentData, enrollments, teacherCourseContext] =
        await Promise.all([
          getUserById(userId),
          getStudentById(userId),
          getEnrollmentsByStudent(userId),
          teacherCourseContextPromise,
        ]);

      const teacherCoursesFilterSet = deriveTeacherCourseIdSet(
        teacherCourseContext.list
      );
      const isCourseInScope = (rawCourseId) => {
        if (!teacherCourseContext.ready) {
          return true;
        }
        if (!teacherCoursesFilterSet || teacherCoursesFilterSet.size === 0) {
          return false;
        }
        return teacherCoursesFilterSet.has(rawCourseId);
      };

      const enrollmentList = Array.isArray(enrollments) ? enrollments : [];
      const initialCourseIds = filterCourseIdsBySet(
        enrollmentList.map((enrollment) => enrollment?.CourseID),
        teacherCoursesFilterSet,
        teacherCourseContext.ready
      );

      const assignmentMap = {};
      enrollmentList.forEach((enrollment) => {
        const courseId = normalizeIdString(
          enrollment?.CourseID ?? enrollment?.raw?.CourseID
        );
        if (!courseId || !isCourseInScope(courseId)) {
          return;
        }

        const subjectId = normalizeIdString(
          enrollment?.raw?.SubjectID ??
            enrollment?.raw?.subjectID ??
            enrollment?.SubjectID ??
            enrollment?.subjectID
        );

        const courseSubjectId = normalizeIdString(
          enrollment?.raw?.CourseSubjectID ??
            enrollment?.raw?.courseSubjectID ??
            enrollment?.CourseSubjectID ??
            enrollment?.courseSubjectID
        );

        if (!assignmentMap[courseId]) {
          assignmentMap[courseId] = [];
        }

        if (subjectId) {
          const exists = assignmentMap[courseId].some(
            (entry) => entry.subjectId === subjectId
          );
          if (!exists) {
            assignmentMap[courseId].push({
              subjectId,
              courseSubjectId: courseSubjectId ?? null,
            });
          }
        }
      });

      setEditCourseClassAssignments(assignmentMap);

      const mergedBase =
        studentData && typeof studentData === "object"
          ? { ...userData, ...studentData }
          : userData;

      if (teacherCourseContext.ready) {
        const numericCourseIds = initialCourseIds.map((value) => {
          const numeric = Number(value);
          return Number.isNaN(numeric) ? value : numeric;
        });

        mergedBase.StudentCourseIDs = numericCourseIds;
        mergedBase.CourseIDs = numericCourseIds;

        mergedBase.Courses = filterCourseObjectsBySet(
          mergedBase?.Courses,
          teacherCoursesFilterSet,
          true
        );
      } else {
        const existingIds = toNormalizedIdArray(
          Array.isArray(mergedBase?.StudentCourseIDs)
            ? mergedBase.StudentCourseIDs
            : []
        );
        const mergedIds = toNormalizedIdArray([
          ...existingIds,
          ...initialCourseIds,
        ]).map((value) => {
          const numeric = Number(value);
          return Number.isNaN(numeric) ? value : numeric;
        });
        mergedBase.StudentCourseIDs = mergedIds;
      }

      if (!Array.isArray(mergedBase.StudentCourseIDs)) {
        mergedBase.StudentCourseIDs = [];
      }

      if (
        teacherCourseContext.ready &&
        (!Array.isArray(mergedBase.CourseIDs) ||
          mergedBase.CourseIDs.length !== mergedBase.StudentCourseIDs.length)
      ) {
        mergedBase.CourseIDs = mergedBase.StudentCourseIDs.slice();
      }

      setEditUser(mergedBase);
    } catch (err) {
      console.error("Error loading user for edit:", err);
      setEditCourseClassAssignments({});
      const fallback = students.find((s) => (s.UserID || s.id) === userId);
      setEditUser(fallback || null);
    } finally {
      setEditLoading(false);
      setEditOpen(true);
    }
  };

  const handleActivateUser = async (userID) => {
    try {
      setFormError("");
      const updated = await updateUser(userID, { IsActive: true });
      setStudents((prev) =>
        prev.map((u) => {
          const id = u.UserID || u.id || u.userID || u.userId || null;
          const updatedId =
            updated.UserID || updated.id || updated.userID || updated.userId;
          // Merge the updated data with existing data, ensuring IsActive is preserved
          return String(id) === String(updatedId)
            ? { ...u, ...updated, IsActive: true }
            : u;
        })
      );
      setToastMessage("User activated.");
      setToastType("success");
    } catch (err) {
      console.error("Failed to activate user", err);
      setFormError(err?.message || "Failed to activate user");
      setToastMessage("Failed to activate user.");
      setToastType("error");
    }
  };

  const handleDeactivateUser = async (userID) => {
    try {
      setFormError("");
      // confirm removal
      const ok = window.confirm("Do You Want To Remove This Student?");
      if (!ok) return;
      const updated = await updateUser(userID, { IsActive: false });
      setStudents((prev) =>
        prev.map((u) => {
          const id = u.UserID || u.id || u.userID || u.userId || null;
          const updatedId =
            updated.UserID || updated.id || updated.userID || updated.userId;
          // Merge the updated data with existing data, ensuring IsActive is preserved
          return String(id) === String(updatedId)
            ? { ...u, ...updated, IsActive: false }
            : u;
        })
      );
      setToastMessage("User deactivated.");
      setToastType("success");
    } catch (err) {
      console.error("Failed to deactivate user", err);
      setFormError(err?.message || "Failed to deactivate user");
      setToastMessage("Failed to deactivate user.");
      setToastType("error");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!teacherId) {
        setStudents([]);
        setCourse(null);
        setLoading(false);
        return;
      }

      try {
        if (courseId) {
          try {
            const { course: scopedCourse, students: scopedStudents } =
              await getTeacherCourseStudents(teacherId, courseId);
            setStudents(scopedStudents);
            setCourse(
              scopedCourse || (await getCourseDetails(courseId)) || null
            );
          } catch (error) {
            console.error(
              "Error fetching course students via teacher route:",
              error
            );
            const [studentsData, courseData] = await Promise.all([
              getTeacherStudents(courseId, { scope: "course" }),
              getCourseDetails(courseId),
            ]);
            setStudents(studentsData);
            setCourse(courseData);
          }
        } else {
          const studentsData = await getTeacherStudents(teacherId);
          setStudents(studentsData);
          setCourse(null);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teacherId, courseId]);

  const openCreateModal = () => {
    setCreateOpen(true);
    setCreateStep(1);
    setPendingCoreData(null);
    setPendingStudentData(null);
    setCourseSelection(sanitizeCourseSelection(defaultCourseSelection));
    setCoursePickerError("");
    setShowClassPicker(false);
    setClassOptions([]);
    setClassSelection([]);
    setClassPickerError("");
    setClassPickerCourseName("");
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateStep(1);
    setPendingCoreData(null);
    setPendingStudentData(null);
    setCourseSelection(sanitizeCourseSelection(defaultCourseSelection));
    setCoursePickerError("");
    setShowClassPicker(false);
    setClassOptions([]);
    setClassSelection([]);
    setClassPickerError("");
    setClassPickerCourseName("");
  };

  const handleCreateSubmit = async (formData) => {
    if (createStep === 1) {
      setPendingCoreData(formData);
      setCreateStep(2);
      return;
    }

    const mergedPayload = {
      ...(pendingCoreData || {}),
      ...formData,
    };

    const normalizedPayload = {
      ...mergedPayload,
      UserTypeID: 3,
      userTypeID: 3,
      IsActive: true,
      ProfilePicture:
        mergedPayload.ProfilePicture || mergedPayload.profilePicture || null,
    };

    const existingCourseIds = Array.isArray(normalizedPayload.StudentCourseIDs)
      ? normalizedPayload.StudentCourseIDs
      : Array.isArray(normalizedPayload.CourseIDs)
      ? normalizedPayload.CourseIDs
      : [];

    const initialSelection = Array.from(
      new Set([
        ...defaultCourseSelection,
        ...(existingCourseIds || []).map((cid) => String(cid)),
      ])
    ).filter(Boolean);

    setPendingStudentData(normalizedPayload);
    setCourseSelection(
      sanitizeCourseSelection(
        (initialSelection && initialSelection.length
          ? initialSelection
          : defaultCourseSelection
        ).map(String)
      )
    );
    setCreateOpen(false);
    setCreateStep(1);
    setPendingCoreData(null);
    setCoursePickerError("");
    setShowCoursePicker(true);
  };

  const ensureSubjectsLoaded = async () => {
    if (subjectsCacheRef.current) {
      return subjectsCacheRef.current;
    }

    try {
      const subjects = await getAllSubjects();
      subjectsCacheRef.current = Array.isArray(subjects) ? subjects : [];
    } catch (error) {
      console.warn("Failed to load subjects list for class selection", error);
      subjectsCacheRef.current = [];
    }

    return subjectsCacheRef.current;
  };

  // const ensureSchedulesLoaded = async () => {
  //   if (classSchedulesCacheRef.current) {
  //     return classSchedulesCacheRef.current;
  //   }

  //   try {
  //     const schedules = await getAllClassSchedules();
  //     classSchedulesCacheRef.current = Array.isArray(schedules)
  //       ? schedules
  //       : [];
  //   } catch (error) {
  //     console.warn("Failed to load class schedules for class selection", error);
  //     classSchedulesCacheRef.current = [];
  //   }

  //   return classSchedulesCacheRef.current;
  // };

  const loadClassOptionsForCourse = async (selectedCourseId) => {
    const normalizedId = normalizeIdString(selectedCourseId);
    if (!normalizedId) {
      return { options: [], courseName: "" };
    }

    if (classOptionsCacheRef.current.has(normalizedId)) {
      const cached = classOptionsCacheRef.current.get(normalizedId);
      const needsRefresh =
        !cached ||
        !Array.isArray(cached.options) ||
        cached.options.some((option) => option?.source == null);
      if (!needsRefresh) {
        return cached;
      }
      classOptionsCacheRef.current.delete(normalizedId);
    }

    let courseDetails = null;
    try {
      courseDetails = await getCourseDetails(normalizedId);
    } catch (error) {
      console.warn("Failed to load course details for class selection", error);
    }

    const courseNameCandidates = [
      courseDetails?.name,
      courseDetails?.CourseName,
      courseDetails?.courseName,
      courseDetails?.Title,
      courseDetails?.title,
    ];

    let courseName = "";
    for (const candidate of courseNameCandidates) {
      if (typeof candidate === "string") {
        const trimmed = candidate.trim();
        if (trimmed) {
          courseName = trimmed;
          break;
        }
      }
    }

    const [subjects] = await Promise.all([
      ensureSubjectsLoaded(),
    ]);

    const options = deriveClassOptions(
      courseDetails,
      normalizedId,
      subjects
    );
    
    // IMPORTANT: Attach fee information to each option from course details
    if (courseDetails?.subjects && Array.isArray(courseDetails.subjects)) {
      options.forEach(option => {
        const matchingSubject = courseDetails.subjects.find(s => 
          String(s.subjectID) === String(option.id)
        );
        if (matchingSubject) {
          option.totalFee = matchingSubject.totalFee;
          option.monthlyFee = matchingSubject.monthlyFee;
        }
      });
    }
    
    const payload = { options, courseName };
    classOptionsCacheRef.current.set(normalizedId, payload);
    return payload;
  };

  const requestEditClassSelection = ({
    courseId,
    courseName,
    options,
    initialSelected,
  }) =>
    new Promise((resolve) => {
      editClassPickerResolverRef.current = resolve;
      setEditClassPickerCourseName(courseName || "");
      setEditClassPickerCourseId(courseId ?? null);
      setEditClassPickerOptions(options || []);
      setEditClassPickerInitialSelection(
        Array.isArray(initialSelected)
          ? initialSelected.map((value) => String(value))
          : []
      );
      setEditClassPickerVisible(true);
    });

  const extractFeesFromSubject = (subject) => {
    if (!subject || typeof subject !== 'object') return { total: null, monthly: null };
    const get = (obj, keys) => {
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
      return null;
    };
    const total = get(subject, ['totalFee','TotalFee','total_fee','Total_Fee','total','fee']);
    const monthly = get(subject, ['monthlyFee','MonthlyFee','monthly_fee','Monthly_Fee','monthly']);
    return { total, monthly };
  };

  const handleEditClassPickerClose = () => {
    if (editClassPickerResolverRef.current) {
      const resolver = editClassPickerResolverRef.current;
      editClassPickerResolverRef.current = null;
      setEditClassPickerVisible(false);
      resolver(null);
      return;
    }
    setEditClassPickerVisible(false);
  };

  const handleEditClassPickerProceed = (selectedIds) => {
    const resolver = editClassPickerResolverRef.current;
    editClassPickerResolverRef.current = null;
    setEditClassPickerVisible(false);
    
    if (resolver) {
      (async () => {
        try {
          const normalized = Array.isArray(selectedIds)
            ? Array.from(new Set(selectedIds.map((v) => String(v))))
            : [];

          if (normalized.length && editClassPickerCourseId) {
            const targetId = normalizeIdString(normalized[0]);
            let fees = null;

            // Try API first
            try {
              const details = await getCourseDetails(editClassPickerCourseId);
              const subjectList = details?.subjects ?? details?.Subjects ?? details?.courseSubjects ?? [];
              const list = Array.isArray(subjectList) ? subjectList : [];
              if (list.length) {
                const found = list.find((s) =>
                  normalizeIdString(s?.subjectID ?? s?.SubjectID ?? s?.id ?? s?.subjectId) === targetId
                );
                if (found) {
                  fees = extractFeesFromSubject(found);
                }
                if (!fees || (fees.total === null && fees.monthly === null)) {
                  const fallback = list[0];
                  const fallbackFees = extractFeesFromSubject(fallback);
                  if (!fees) fees = fallbackFees;
                  else {
                    fees.total = fees.total ?? fallbackFees.total;
                    fees.monthly = fees.monthly ?? fallbackFees.monthly;
                  }
                }
              }
            } catch (apiErr) {
              // API failed; will fallback to option metadata below
            }

            // If API didn't yield fees, try the options metadata
            if (!fees || (fees.total === null && fees.monthly === null)) {
              const selectedOption = editClassPickerOptions.find(opt => String(opt.id) === String(targetId));
              if (selectedOption) {
                fees = {
                  total: selectedOption.totalFee ?? null,
                  monthly: selectedOption.monthlyFee ?? null,
                };
              }
            }

            if (fees) {
              try {
                if (fees.total !== undefined && fees.total !== null) {
                  window.localStorage.setItem('selectedTotalFee', String(fees.totalFee));
                  try { window.sessionStorage.setItem('selectedTotalFee', String(fees.totalFee)); } catch (e) {}
                }
                if (fees.monthly !== undefined && fees.monthly !== null) {
                  window.localStorage.setItem('selectedMonthlyFee', String(fees.monthlyFee));
                  try { window.sessionStorage.setItem('selectedMonthlyFee', String(fees.monthlyFee)); } catch (e) {}
                }
                // also persist the selected course and subject ids for Payment page
                try {
                  if (editClassPickerCourseId) {
                    window.localStorage.setItem('selectedCourseID', String(editClassPickerCourseId));
                    try { window.sessionStorage.setItem('selectedCourseID', String(editClassPickerCourseId)); } catch (e) {}
                  }
                  if (Array.isArray(normalized) && normalized[0]) {
                    window.localStorage.setItem('selectedSubjectID', String(normalized[0]));
                    try { window.sessionStorage.setItem('selectedSubjectID', String(normalized[0])); } catch (e) {}
                  }
                } catch (e) {}
              } catch (e) {
                // ignore storage errors
              }
            }
          }
        } finally {
          resolver(Array.isArray(selectedIds) ? selectedIds : []);
        }
      })();
    }
    // After resolver completes, ensure values are present as numeric strings (avoid empty values)
    try {
      const storedTotal = window.localStorage.getItem('selectedTotalFee');
      const storedMonthly = window.localStorage.getItem('selectedMonthlyFee');
      const targetId = normalizeIdString(Array.isArray(selectedIds) && selectedIds[0] ? selectedIds[0] : null);

      const finalTotal = (() => {
        if (storedTotal && String(storedTotal).trim() !== "") return storedTotal;
        const opt = (editClassPickerOptions || []).find(o => normalizeIdString(o.id) === targetId);
        if (opt && opt.totalFee !== undefined && opt.totalFee !== null) return String(opt.totalFee);
        return null;
      })();

      const finalMonthly = (() => {
        if (storedMonthly && String(storedMonthly).trim() !== "") return storedMonthly;
        const opt = (editClassPickerOptions || []).find(o => normalizeIdString(o.id) === targetId);
        if (opt && opt.monthlyFee !== undefined && opt.monthlyFee !== null) return String(opt.monthlyFee);
        return null;
      })();

      if (finalTotal !== null) {
        window.localStorage.setItem('selectedTotalFee', String(finalTotal));
        try { window.sessionStorage.setItem('selectedTotalFee', String(finalTotal)); } catch (e) {}
      }
      if (finalMonthly !== null) {
        window.localStorage.setItem('selectedMonthlyFee', String(finalMonthly));
        try { window.sessionStorage.setItem('selectedMonthlyFee', String(finalMonthly)); } catch (e) {}
      }

      console.log('Edit selection stored fees:', {
        selectedTotalFee: window.localStorage.getItem('selectedTotalFee'),
        selectedMonthlyFee: window.localStorage.getItem('selectedMonthlyFee')
      });
    } catch (e) {
      // ignore
    }
    try {
      const t = window.localStorage.getItem('selectedTotalFee');
      const m = window.localStorage.getItem('selectedMonthlyFee');
      if (t || m) {
        setToastMessage(`Fees saved — Total: ${t || 'N/A'}, Monthly: ${m || 'N/A'}`);
        setToastType('success');
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (e) {}
  };

  const handleStudentCourseSelectionChange = async (nextIds, prevIds = []) => {
    const previous = filterCourseIdsBySet(
      prevIds,
      teacherCourseIdSet,
      teacherCourseFilter.ready
    );
    const next = filterCourseIdsBySet(
      nextIds,
      teacherCourseIdSet,
      teacherCourseFilter.ready
    );

    const previousSet = new Set(previous);
    const nextSet = new Set(next);

    const removed = previous.filter((id) => !nextSet.has(id));
    const added = next.filter((id) => !previousSet.has(id));

    const pendingAssignments = Object.entries(
      editCourseClassAssignmentsRef.current || {}
    ).reduce((acc, [courseId, entries]) => {
      const normalizedCourseId = normalizeIdString(courseId);
      if (!normalizedCourseId) {
        return acc;
      }
      if (
        teacherCourseFilter.ready &&
        teacherCourseIdSet.size > 0 &&
        !teacherCourseIdSet.has(normalizedCourseId)
      ) {
        return acc;
      }
      acc[normalizedCourseId] = Array.isArray(entries)
        ? entries.map((entry) => ({ ...entry }))
        : [];
      return acc;
    }, {});

    removed.forEach((courseId) => {
      delete pendingAssignments[courseId];
    });

    try {
      for (const courseId of added) {
        if (
          teacherCourseFilter.ready &&
          teacherCourseIdSet.size > 0 &&
          !teacherCourseIdSet.has(courseId)
        ) {
          continue;
        }
        let payload;
        try {
          payload = await loadClassOptionsForCourse(courseId);
        } catch (error) {
          console.error(
            "Failed to load class options for course selection",
            error
          );
          setFormError(
            error?.message ||
              "Unable to load classes for the selected course. Please try again."
          );
          return { accepted: false, finalIds: previous };
        }

        const { options = [], courseName = "" } = payload || {};

        if (!options.length) {
          pendingAssignments[courseId] = [];
          continue;
        }

        const initialSelected = (pendingAssignments[courseId] || []).map(
          (entry) => entry?.subjectId
        );

        const selection = await requestEditClassSelection({
          courseId,
          courseName,
          options,
          initialSelected,
        });

        if (!selection) {
          return { accepted: false, finalIds: previous };
        }

        const normalizedSelection = toNormalizedIdArray(selection);
        const optionMap = new Map(
          options.map((option) => [normalizeIdString(option.id), option])
        );

        pendingAssignments[courseId] = normalizedSelection.map((subjectId) => {
          const option = optionMap.get(subjectId) || {};
          return {
            subjectId,
            courseSubjectId: normalizeIdString(option.courseSubjectId),
          };
        });
      }
    } catch (error) {
      console.error(
        "Error while processing class selection for student course update",
        error
      );
      setFormError(
        error?.message ||
          "Unable to complete class selection for the chosen course."
      );
      return { accepted: false, finalIds: previous };
    }

    setEditCourseClassAssignments(pendingAssignments);

    return { accepted: true, finalIds: next };
  };

  const finalizeStudentCreation = async (
    selectedCourseIds,
    selectedSubjectIds = []
  ) => {
    if (!pendingStudentData) {
      throw new Error("Missing student details. Please restart the flow.");
    }

    const courseIds = Array.from(
      new Set(
        (selectedCourseIds || [])
          .map((value) => normalizeIdString(value))
          .filter(Boolean)
      )
    );

    if (!courseIds.length) {
      throw new Error("Select a course before continuing.");
    }

    const uniqueSubjectIds = Array.from(
      new Set(
        (selectedSubjectIds || [])
          .map((value) => normalizeIdString(value))
          .filter(Boolean)
      )
    );

    const toApiId = (value) => {
      if (value === null || value === undefined) {
        return value;
      }
      const numeric = Number(value);
      return Number.isNaN(numeric) ? value : numeric;
    };

    const photoToUpload =
      pendingStudentData.ProfilePicture ||
      pendingStudentData.profilepicture ||
      null;

    setCreationSaving(true);

    try {
      const createdUser = await createUser({
        ...pendingStudentData,
        CourseIDs: courseIds.map((cid) => {
          const numeric = Number(cid);
          return Number.isNaN(numeric) ? cid : numeric;
        }),
        IsActive: true,
        ProfilePicture: null,
      });

      if (
        photoToUpload &&
        typeof photoToUpload === "string" &&
        photoToUpload.startsWith("data:")
      ) {
        try {
          const uploadResult = await uploadProfilePhoto(
            createdUser.UserID || createdUser.id,
            photoToUpload
          );
          const uploadedPath = uploadResult?.filePath;
          const cacheBuster = uploadResult?.cacheBuster;
          if (uploadedPath) {
            createdUser.ProfilePicture = uploadedPath;
            createdUser.profilepicture = uploadedPath;
          }
          if (cacheBuster) {
            createdUser.ProfilePictureVersion = cacheBuster;
            createdUser.profilePictureVersion = cacheBuster;
          }
        } catch (uErr) {
          console.warn("Profile upload failed:", uErr);
        }
      }

      const enrollmentDateValue =
        pendingStudentData.EnrollmentDate ??
        pendingStudentData.enrollmentDate ??
        null;

      const studentPayload = {
        UserID:
          createdUser.UserID ??
          createdUser.id ??
          createdUser.userID ??
          createdUser.userId,
        RollNumber:
          pendingStudentData.RollNumber ??
          pendingStudentData.IDNumber ??
          pendingStudentData.rollNumber ??
          pendingStudentData.idNumber ??
          undefined,
        EnrollmentDate: enrollmentDateValue ?? undefined,
        CurrentGrade:
          pendingStudentData.CurrentGrade ??
          pendingStudentData.Class ??
          pendingStudentData.currentGrade ??
          pendingStudentData.class ??
          undefined,
        ParentName:
          pendingStudentData.ParentName ??
          pendingStudentData.GuardianName ??
          pendingStudentData.parentName ??
          pendingStudentData.guardianName ??
          undefined,
        ParentContact:
          pendingStudentData.ParentContact ??
          pendingStudentData.GuardianPhone ??
          pendingStudentData.parentContact ??
          pendingStudentData.guardianPhone ??
          undefined,
      };

      const cleanedStudentPayload = Object.fromEntries(
        Object.entries(studentPayload).filter(
          ([, value]) => value !== undefined
        )
      );

      let createdStudent = null;
      try {
        createdStudent = await createStudent(cleanedStudentPayload);
      } catch (studentErr) {
        console.error("Failed to create student record:", studentErr);
      }

      const studentIdentifierCandidates = [
        createdStudent?.StudentID,
        createdStudent?.studentID,
        createdStudent?.studentId,
        createdStudent?.UserID,
        createdStudent?.userID,
        createdStudent?.userId,
        createdStudent?.id,
        createdUser?.StudentID,
        createdUser?.studentID,
        createdUser?.studentId,
        createdUser?.UserID,
        createdUser?.userID,
        createdUser?.userId,
        createdUser?.id,
      ];

      let resolvedStudentId = null;
      for (const candidate of studentIdentifierCandidates) {
        if (candidate === undefined || candidate === null) {
          continue;
        }
        const normalized = normalizeIdString(candidate);
        if (!normalized) {
          continue;
        }
        const asNumber = Number(normalized);
        resolvedStudentId = Number.isNaN(asNumber) ? normalized : asNumber;
        break;
      }

      if (resolvedStudentId !== null && resolvedStudentId !== undefined) {
        const enrollmentDateIso =
          enrollmentDateValue || new Date().toISOString();

        const numericCourseIds = courseIds
          .map((cid) => {
            const numeric = Number(cid);
            return Number.isNaN(numeric) ? null : numeric;
          })
          .filter((cid) => cid !== null);

        const primaryCourseId = courseIds[0];
        const numericPrimaryCourseId = Number(primaryCourseId);
        const courseIdForApi = Number.isNaN(numericPrimaryCourseId)
          ? primaryCourseId
          : numericPrimaryCourseId;

        if (uniqueSubjectIds.length) {
          const optionMap = new Map(
            (classOptions || []).map((option) => [
              normalizeIdString(option.id),
              option,
            ])
          );

          const creationResults = await Promise.allSettled(
            uniqueSubjectIds.map((subjectId) => {
              const option = optionMap.get(subjectId) || null;
              const payload = {
                StudentID: toApiId(resolvedStudentId),
                CourseID: toApiId(courseIdForApi),
                SubjectID: toApiId(subjectId),
                EnrollmentDate: enrollmentDateIso,
                IsActive: true,
              };

              if (
                option?.courseSubjectId !== null &&
                option?.courseSubjectId !== undefined
              ) {
                payload.CourseSubjectID = toApiId(option.courseSubjectId);
              }

              return createEnrollment(payload);
            })
          );

          const failures = creationResults.filter(
            (result) => result.status === "rejected"
          );

          if (failures.length) {
            const firstError = failures[0]?.reason;
            throw new Error(
              firstError?.message ||
                "Failed to enroll student in the selected class."
            );
          }

          // Collect created enrollment IDs from fulfilled results
          try {
            const createdEnrollmentIds = [];
            creationResults.forEach((r) => {
              if (r && r.status === "fulfilled" && r.value) {
                const v = r.value;
                const idCandidate =
                  v?.EnrollmentID ?? v?.EnrollmentId ?? v?.id ?? v?.ID ?? v?.Id ?? null;
                if (idCandidate !== null && idCandidate !== undefined) {
                  const normalized = normalizeIdString(idCandidate);
                  if (normalized) createdEnrollmentIds.push(normalized);
                }
              }
            });

            if (createdEnrollmentIds.length) {
              try {
                window.localStorage.setItem("lastEnrollmentID", String(createdEnrollmentIds[0]));
                try { window.sessionStorage.setItem('lastEnrollmentID', String(createdEnrollmentIds[0])); } catch (e) {}
              } catch (e) {}
              // Navigate to payments page with query param for immediate payment
              try {
                // include course and subject in the query so Payment page can fetch directly from API
                const primaryCourse = (selectedCourseIds && selectedCourseIds.length) ? normalizeIdString(selectedCourseIds[0]) : null;
                const primarySubject = (selectedSubjectIds && selectedSubjectIds.length) ? normalizeIdString(selectedSubjectIds[0]) : null;
                let url = `/teacher/payments?enrollment=${encodeURIComponent(createdEnrollmentIds[0])}`;
                if (primaryCourse) url += `&course=${encodeURIComponent(primaryCourse)}`;
                if (primarySubject) url += `&subject=${encodeURIComponent(primarySubject)}`;
                navigate(url);
              } catch (e) {
                // ignore navigation errors
              }
            }
          } catch (e) {
            // ignore collection errors
          }
        } else if (numericCourseIds.length) {
          await createEnrollmentsForStudent(
            toApiId(resolvedStudentId),
            numericCourseIds,
            {
              EnrollmentDate: enrollmentDateIso,
              IsActive: true,
            }
          );
        } else {
          await createEnrollment({
            StudentID: toApiId(resolvedStudentId),
            CourseID: toApiId(courseIdForApi),
            EnrollmentDate: enrollmentDateIso,
            IsActive: true,
          });
        }
      }

      await refreshStudents();
      setShowCoursePicker(false);
      setShowClassPicker(false);
      setPendingStudentData(null);
      setCourseSelection(sanitizeCourseSelection(defaultCourseSelection));
      setClassSelection([]);
      setClassOptions([]);
      setClassPickerLoading(false);
      setClassPickerError("");
      setClassPickerCourseName("");
      setCoursePickerError("");
    } catch (error) {
      throw error;
    } finally {
      setCreationSaving(false);
    }
  };

  const handleCoursePickerProceed = async (selectedIds) => {
    const ids = (selectedIds || []).map((id) => String(id)).filter(Boolean);
    setCourseSelection(sanitizeCourseSelection(ids));

    if (!pendingStudentData) {
      setShowCoursePicker(false);
      setCourseSelection(sanitizeCourseSelection(defaultCourseSelection));
      return;
    }

    if (!ids.length) {
      setCoursePickerError("Select a course before continuing.");
      return;
    }

    setCoursePickerSaving(true);
    setCoursePickerError("");

    try {
      const primaryCourseId = ids[0] ?? null;
      setClassPickerLoading(true);
      const { options, courseName } = await loadClassOptionsForCourse(
        primaryCourseId
      );

      setClassOptions(options);
      setClassSelection(options.length === 1 ? [String(options[0].id)] : []);
      setClassPickerCourseName(courseName || "");
      setClassPickerError("");
      setShowCoursePicker(false);
      setShowClassPicker(true);
    } catch (err) {
      console.error("Failed to load class selection options:", err);
      setCoursePickerError(
        err?.message ||
          "Unable to load classes for the selected course. Please try again."
      );
    } finally {
      setClassPickerLoading(false);
      setCoursePickerSaving(false);
    }
  };

  const handleCoursePickerClose = () => {
    if (coursePickerSaving) return;
    setShowCoursePicker(false);
    setPendingStudentData(null);
    setCoursePickerError("");
    setCourseSelection(sanitizeCourseSelection(defaultCourseSelection));
    setShowClassPicker(false);
    setClassOptions([]);
    setClassSelection([]);
    setClassPickerLoading(false);
    setClassPickerError("");
    setClassPickerCourseName("");
    setCreationSaving(false);
  };

  const handleClassPickerClose = () => {
    if (creationSaving) {
      return;
    }
    setShowClassPicker(false);
    setClassPickerError("");
    setClassPickerLoading(false);
    setClassSelection([]);
    setClassPickerCourseName("");
    setClassOptions([]);
    setCoursePickerSaving(false);
    setCreationSaving(false);
    if (pendingStudentData) {
      setCoursePickerError("");
      setShowCoursePicker(true);
    }
  };

  // const handleClassPickerProceed = async (selectedSubjectIds) => {
  //   const normalized = Array.from(
  //     new Set((selectedSubjectIds || []).map((value) => String(value)))
  //   ).filter(Boolean);
  //   setClassSelection(normalized);
  //   setClassPickerError("");

  //   // Ensure we have fee values saved; try course details first, fallback to option fields
  //   try {
  //     const primaryCourseId = Array.isArray(courseSelection) && courseSelection[0]
  //       ? normalizeIdString(courseSelection[0])
  //       : null;
  //     if (primaryCourseId && normalized.length) {
  //       try {
  //         const details = await getCourseDetails(primaryCourseId);
  //         const subjectList =
  //           details?.subjects ?? details?.Subjects ?? details?.courseSubjects ?? [];
  //         const targetId = normalizeIdString(normalized[0]);
  //         const list = Array.isArray(subjectList) ? subjectList : [];
  //         let fees = null;
  //         if (list.length) {
  //           const found = list.find((s) =>
  //             normalizeIdString(s?.subjectID ?? s?.SubjectID ?? s?.id ?? s?.subjectId) ===
  //             targetId
  //           );
  //           if (found) {
  //             fees = extractFeesFromSubject(found);
  //           }

  //           if (!fees || (fees.total === null && fees.monthly === null)) {
  //             const fallback = list[0];
  //             const fallbackFees = extractFeesFromSubject(fallback);
  //             if (!fees) fees = fallbackFees;
  //             else {
  //               fees.total = fees.total ?? fallbackFees.total;
  //               fees.monthly = fees.monthly ?? fallbackFees.monthly;
  //             }
  //           }

  //           if (fees) {
  //             try {
  //               if (fees.total !== undefined && fees.total !== null) {
  //                 window.localStorage.setItem('selectedTotalFee', String(fees.total));
  //                 try { window.sessionStorage.setItem('selectedTotalFee', String(fees.total)); } catch (e) {}
  //               }
  //               if (fees.monthly !== undefined && fees.monthly !== null) {
  //                 window.localStorage.setItem('selectedMonthlyFee', String(fees.monthly));
  //                 try { window.sessionStorage.setItem('selectedMonthlyFee', String(fees.monthly)); } catch (e) {}
  //               }
  //             } catch (e) {
  //               // ignore storage errors
  //             }
  //           }
  //         }
  //       } catch (e) {
  //         // if API fails, continue and try to use option metadata below
  //       }
  //     }

  //     // Fallback: if fees not stored yet, check classOptions map
  //     try {
  //       const hasTotal = window.localStorage.getItem('selectedTotalFee') !== null;
  //       const hasMonthly = window.localStorage.getItem('selectedMonthlyFee') !== null;
  //       if ((!hasTotal || !hasMonthly) && Array.isArray(normalized) && normalized.length) {
  //         const optionMap = new Map((classOptions || []).map((option) => [normalizeIdString(option.id), option]));
  //         const opt = optionMap.get(normalizeIdString(normalized[0]));
  //         if (opt) {
  //           if (!hasTotal && opt.totalFee !== undefined && opt.totalFee !== null) {
  //             window.localStorage.setItem('selectedTotalFee', String(opt.totalFee));
  //           }
  //           if (!hasMonthly && opt.monthlyFee !== undefined && opt.monthlyFee !== null) {
  //             window.localStorage.setItem('selectedMonthlyFee', String(opt.monthlyFee));
  //           }
  //         }
  //       }
  //     } catch (e) {
  //       // ignore
  //     }

  //     await finalizeStudentCreation(courseSelection, normalized);
  //   } catch (err) {
  //     console.error("Error finalizing student creation:", err);
  //     setClassPickerError(
  //       err?.message ||
  //         "Unable to enroll the student in the selected class. Please try again."
  //     );
  //   }
  // };
  // Replace your existing handleClassPickerProceed function with this updated version

// Replace your existing handleClassPickerProceed function with this updated version

// Replace your existing handleClassPickerProceed function with this updated version

// Replace your handleClassPickerProceed function with this version
const handleClassPickerProceed = async (selectedSubjectIds) => {
    const normalized = Array.from(
      new Set((selectedSubjectIds || []).map((value) => String(value)))
    ).filter(Boolean);

    setClassSelection(normalized);
    setClassPickerError("");

    try {
      const primaryCourseId = Array.isArray(courseSelection) && courseSelection[0]
        ? normalizeIdString(courseSelection[0])
        : null;

      let fees = null;

      // Try API first to get authoritative fee values
      if (primaryCourseId && normalized.length) {
        try {
          console.log('Fetching course details for:', primaryCourseId);
          const details = await getCourseDetails(primaryCourseId);
          console.log('Course details received:', details);
          
          const subjectList = details?.subjects ?? details?.Subjects ?? details?.courseSubjects ?? [];
          const targetId = normalizeIdString(normalized[0]);
          const list = Array.isArray(subjectList) ? subjectList : [];
          
          console.log('Looking for subject ID:', targetId, 'in list:', list);

          if (list.length) {
            const found = list.find((s) => {
              const sId = normalizeIdString(s?.subjectID ?? s?.SubjectID ?? s?.id ?? s?.subjectId);
              console.log('Comparing:', sId, 'with', targetId);
              return sId === targetId;
            });
            
            console.log('Found subject:', found);
            
            if (found) {
              fees = extractFeesFromSubject(found);
              console.log('Extracted fees from found subject:', fees);
            }
            
            // Fallback to first subject if target not found
            if (!fees || (fees.total === null && fees.monthly === null)) {
              const fallback = list[0];
              const fallbackFees = extractFeesFromSubject(fallback);
              console.log('Using fallback fees:', fallbackFees);
              if (!fees) fees = fallbackFees;
              else {
                fees.total = fees.total ?? fallbackFees.total;
                fees.monthly = fees.monthly ?? fallbackFees.monthly;
              }
            }

            if (fees && (fees.total !== null || fees.monthly !== null)) {
              console.log('Storing fees in localStorage:', fees);
              try {
                if (fees.total !== undefined && fees.total !== null) {
                  window.localStorage.setItem('selectedTotalFee', String(fees.total));
                 window.sessionStorage.setItem('selectedTotalFee', String(fees.total));
                }
                if (fees.monthly !== undefined && fees.monthly !== null) {
                  window.localStorage.setItem('selectedMonthlyFee', String(fees.monthly));
                  window.sessionStorage.setItem('selectedMonthlyFee', String(fees.monthly));
                }
                
                // Store course and subject IDs for Payment page
                window.localStorage.setItem('selectedCourseID', String(primaryCourseId));
                window.sessionStorage.setItem('selectedCourseID', String(primaryCourseId));
                window.localStorage.setItem('selectedSubjectID', String(targetId));
                window.sessionStorage.setItem('selectedSubjectID', String(targetId));
                
                console.log('All fees stored successfully');
              } catch (e) {
                console.error('Error storing fees:', e);
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch course details for fee storage:', e);
        }
      }

      // Fallback: if API didn't populate fees, use option metadata
      if (!fees || (fees.total === null && fees.monthly === null)) {
        console.log('Trying fallback to classOptions metadata');
        console.log('classOptions available:', classOptions);
        try {
          if (Array.isArray(normalized) && normalized.length && Array.isArray(classOptions)) {
            const optionMap = new Map((classOptions || []).map((option) => {
              const id = normalizeIdString(option.id);
              console.log('Mapping option:', id, option);
              return [id, option];
            }));
            const targetId = normalizeIdString(normalized[0]);
            console.log('Looking for option with ID:', targetId);
            const opt = optionMap.get(targetId);
            console.log('Found option:', opt);
            
            if (opt) {
              if (opt.totalFee !== undefined && opt.totalFee !== null) {
                
                window.localStorage.setItem('selectedTotalFee', String(opt.totalFee));
                console.log('Storing totalFee from option:', opt.totalFee);
                //window.sessionStorage.setItem('selectedTotalFee', String(opt.totalFee));
              } else {
                console.warn('Option totalFee is undefined or null');
              }
              if (opt.monthlyFee !== undefined && opt.monthlyFee !== null) {
                console.log('Storing monthlyFee from option:', opt.monthlyFee);
                window.localStorage.setItem('selectedMonthlyFee', String(opt.monthlyFee));
                window.sessionStorage.setItem('selectedMonthlyFee', String(opt.monthlyFee));
              } else {
                console.warn('Option monthlyFee is undefined or null');
              }
            } else {
              console.error('No option found in map for ID:', targetId);
              console.log('Available option IDs:', Array.from(optionMap.keys()));
            }
          } else {
            console.log('Conditions not met for fallback:', {
              normalizedExists: Array.isArray(normalized) && normalized.length,
              classOptionsExists: Array.isArray(classOptions)
            });
          }
        } catch (e) {
          console.error('Error with fallback:', e);
        }
      }

      // Verify fees are stored
      const storedTotal = window.localStorage.getItem('selectedTotalFee');
      const storedMonthly = window.localStorage.getItem('selectedMonthlyFee');
      console.log('Final stored values:', { storedTotal, storedMonthly });

      // Show toast with stored values
      if (storedTotal || storedMonthly) {
        setToastMessage(`Fees saved — Total: ${storedTotal || 'N/A'}, Monthly: ${storedMonthly || 'N/A'}`);
        setToastType('success');
        setTimeout(() => setToastMessage(null), 3500);
      }

      await finalizeStudentCreation(courseSelection, normalized);
    } catch (err) {
      console.error("Error finalizing student creation:", err);
      setClassPickerError(
        err?.message ||
          "Unable to enroll the student in the selected class. Please try again."
      );
    }
  };
  // Handles the multi-step edit flow for students (mirrors admin behavior)
  const handleEditSubmit = async (formData) => {
    setFormError("");
    try {
      if (editStep === 1) {
        const uid = editUser?.UserID || editUser?.id;
        const updatedUser = await updateUser(uid, {
          ...formData,
          UserTypeID: 3,
        });

        // If a new profile photo was supplied (data URL), upload it
        const photoToUpload =
          formData?.ProfilePicture || formData?.profilepicture || null;
        if (
          photoToUpload &&
          typeof photoToUpload === "string" &&
          photoToUpload.startsWith("data:")
        ) {
          try {
            const uploadResult = await uploadProfilePhoto(uid, photoToUpload);
            const uploadedPath = uploadResult?.filePath;
            const cacheBuster = uploadResult?.cacheBuster;
            if (uploadedPath) {
              updatedUser.ProfilePicture = uploadedPath;
              updatedUser.profilepicture = uploadedPath;
            }
            if (cacheBuster) {
              updatedUser.ProfilePictureVersion = cacheBuster;
              updatedUser.profilePictureVersion = cacheBuster;
            }
          } catch (uErr) {
            console.warn("Profile upload failed:", uErr);
          }
        }

        let merged = { ...updatedUser };
        try {
          const teacherCourseContextPromise = ensureTeacherCourseFilter();
          const [studentRec, courses, teacherCourseContext] = await Promise.all(
            [
              getStudentById(uid),
              getStudentCourses(uid),
              teacherCourseContextPromise,
            ]
          );

          const teacherCoursesFilterSet = deriveTeacherCourseIdSet(
            teacherCourseContext.list
          );

          const filteredCourseIds = filterCourseIdsBySet(
            (courses || []).map(
              (c) =>
                c?.id ??
                c?.CourseID ??
                c?.CourseId ??
                c?.courseID ??
                c?.courseId ??
                null
            ),
            teacherCoursesFilterSet,
            teacherCourseContext.ready
          ).map((value) => {
            const numeric = Number(value);
            return Number.isNaN(numeric) ? value : numeric;
          });

          const numericPrefillIds = filteredCourseIds.map((value) => {
            const numeric = Number(value);
            return Number.isNaN(numeric) ? value : numeric;
          });

          const sanitizedCourses = filterCourseObjectsBySet(
            courses,
            teacherCoursesFilterSet,
            teacherCourseContext.ready
          );

          merged = {
            ...merged,
            RollNumber:
              studentRec?.RollNumber ??
              studentRec?.rollNumber ??
              merged.RollNumber,
            CurrentGrade:
              studentRec?.CurrentGrade ??
              studentRec?.currentGrade ??
              merged.CurrentGrade,
            ParentName:
              studentRec?.ParentName ??
              studentRec?.parentName ??
              merged.ParentName,
            ParentContact:
              studentRec?.ParentContact ??
              studentRec?.parentContact ??
              merged.ParentContact,
            EnrollmentDate:
              studentRec?.EnrollmentDate ??
              studentRec?.enrollmentDate ??
              merged.EnrollmentDate,
            StudentCourseIDs: numericPrefillIds,
            CourseIDs: numericPrefillIds,
            Courses: sanitizedCourses,
          };
        } catch (prefillErr) {
          console.warn("Failed to preload student details", prefillErr);
        }

        setStudents((prev) =>
          prev.map((s) => {
            const currentUserId = s.UserID || s.id;
            const updatedUserId = merged.UserID || merged.id;
            return currentUserId === updatedUserId ? merged : s;
          })
        );
        setEditUser(merged);
        setForceUserType(3);
        setEditStep(2);
        return;
      }

      // Step 2: update student-specific details and sync enrollments
      const uid = editUser?.UserID || editUser?.id;
      try {
        await updateStudent(uid, {
          StudentID: uid,
          RollNumber: formData.RollNumber,
          EnrollmentDate: formData.EnrollmentDate,
          CurrentGrade: formData.CurrentGrade,
          ParentName: formData.ParentName,
          ParentContact: formData.ParentContact,
        });

        const teacherCourseContext = await ensureTeacherCourseFilter();
        const teacherCoursesFilterSet = deriveTeacherCourseIdSet(
          teacherCourseContext.list
        );
        const isCourseInScope = (courseId) => {
          if (!teacherCourseContext.ready) {
            return true;
          }
          if (!teacherCoursesFilterSet || teacherCoursesFilterSet.size === 0) {
            return false;
          }
          return teacherCoursesFilterSet.has(courseId);
        };

        const desiredCourseIds = filterCourseIdsBySet(
          formData.StudentCourseIDs || [],
          teacherCoursesFilterSet,
          teacherCourseContext.ready
        );

        try {
          const current = await getEnrollmentsByStudent(uid);
          const desiredSet = new Set(desiredCourseIds);

          const currentByCourse = new Map();

          for (const enrollment of current) {
            const courseIdStr = normalizeIdString(
              enrollment?.CourseID ?? enrollment?.raw?.CourseID
            );
            if (!courseIdStr) {
              continue;
            }

            if (!isCourseInScope(courseIdStr)) {
              continue;
            }

            if (!desiredSet.has(courseIdStr)) {
              if (enrollment.EnrollmentID != null) {

                try {
                  const numericCourseId = toApiId(courseIdStr);
                  if (teacherId && isCourseInScope(courseIdStr)) {
                    await deleteTeacherCourse(teacherId, numericCourseId);
                  } else {
                    await deleteEnrollment(enrollment.EnrollmentID);
                  }
                } catch (e) {
                  await deleteEnrollment(enrollment.EnrollmentID);
                }
// =======
//                 await deleteEnrollment(enrollment.EnrollmentID);
// >>>>>>> main
              }
              continue;
            }

            const subjectIdStr = normalizeIdString(
              enrollment?.raw?.SubjectID ??
                enrollment?.raw?.subjectID ??
                enrollment?.SubjectID ??
                enrollment?.subjectID
            );

            const courseSubjectIdStr = normalizeIdString(
              enrollment?.raw?.CourseSubjectID ??
                enrollment?.raw?.courseSubjectID ??
                enrollment?.CourseSubjectID ??
                enrollment?.courseSubjectID
            );

            const entry = currentByCourse.get(courseIdStr) || {
              subjects: new Map(),
              courseOnly: null,
            };

            if (subjectIdStr) {
              entry.subjects.set(subjectIdStr, {
                enrollment,
                courseSubjectId: courseSubjectIdStr,
              });
            } else if (!entry.courseOnly) {
              entry.courseOnly = enrollment;
            }

            currentByCourse.set(courseIdStr, entry);
          }

          const toApiId = (value) => {
            if (value === null || value === undefined) {
              return value;
            }
            if (typeof value === "number") {
              return value;
            }
            const numeric = Number(value);
            return Number.isNaN(numeric) ? value : numeric;
          };

          const enrollmentDate =
            formData.EnrollmentDate || new Date().toISOString();

          for (const courseIdStr of desiredCourseIds) {
            if (!isCourseInScope(courseIdStr)) {
              continue;
            }
            const assignmentEntries = (
              editCourseClassAssignmentsRef.current?.[courseIdStr] || []
            )
              .map((entry) => (entry && entry.subjectId ? { ...entry } : null))
              .filter(Boolean);

            const targetSubjectIds = new Set(
              assignmentEntries.map((entry) => entry.subjectId)
            );

            const currentEntry = currentByCourse.get(courseIdStr) || {
              subjects: new Map(),
              courseOnly: null,
            };

            if (targetSubjectIds.size > 0) {
              for (const assignment of assignmentEntries) {
                if (currentEntry.subjects.has(assignment.subjectId)) {
                  continue;
                }

                const courseSubjectId = assignment.courseSubjectId ?? null;

                await createEnrollment({
                  StudentID: toApiId(uid),
                  CourseID: toApiId(courseIdStr),
                  SubjectID: toApiId(assignment.subjectId),
                  ...(courseSubjectId !== null && courseSubjectId !== undefined
                    ? { CourseSubjectID: toApiId(courseSubjectId) }
                    : {}),
                  EnrollmentDate: enrollmentDate,
                  IsActive: true,
                });
              }

              for (const [subjectId, info] of currentEntry.subjects) {
                if (!targetSubjectIds.has(subjectId)) {
                  if (info.enrollment?.EnrollmentID != null) {
                    try {
                      const numericCourseId = toApiId(courseIdStr);
                      if (teacherId && isCourseInScope(courseIdStr)) {
                        await deleteTeacherCourse(teacherId, numericCourseId);
                      } else {
                        await deleteEnrollment(info.enrollment.EnrollmentID);
                      }
                    } catch (e) {
                      await deleteEnrollment(info.enrollment.EnrollmentID);
                    }
                  }
                }
              }

              if (currentEntry.courseOnly?.EnrollmentID != null) {
                try {
                  const numericCourseId = toApiId(courseIdStr);
                  if (teacherId && isCourseInScope(courseIdStr)) {
                    await deleteTeacherCourse(teacherId, numericCourseId);
                  } else {
                    await deleteEnrollment(currentEntry.courseOnly.EnrollmentID);
                  }
                } catch (e) {
                  await deleteEnrollment(currentEntry.courseOnly.EnrollmentID);
                }
              }
            } else {
              for (const info of currentEntry.subjects.values()) {
                if (info.enrollment?.EnrollmentID != null) {
                  try {
                    const numericCourseId = toApiId(courseIdStr);
                    if (teacherId && isCourseInScope(courseIdStr)) {
                      await deleteTeacherCourse(teacherId, numericCourseId);
                    } else {
                      await deleteEnrollment(info.enrollment.EnrollmentID);
                    }
                  } catch (e) {
                    await deleteEnrollment(info.enrollment.EnrollmentID);
                  }
                }
              }

              if (!currentEntry.courseOnly) {
                await createEnrollment({
                  StudentID: toApiId(uid),
                  CourseID: toApiId(courseIdStr),
                  EnrollmentDate: enrollmentDate,
                  IsActive: true,
                });
              }
            }
          }
        } catch (enSyncErr) {
          console.error("Failed to sync student enrollments", enSyncErr);
          setFormError(
            enSyncErr?.message ||
              "Updated student, but failed to sync enrollments"
          );
        }
      } catch (roleErr) {
        console.error("Failed to update student data", roleErr);
        setFormError(
          roleErr?.message ||
            "User updated, but failed to update student details"
        );
      }

      await refreshStudents();
      setEditCourseClassAssignments({});
      setEditClassPickerVisible(false);
      setEditClassPickerOptions([]);
      setEditClassPickerInitialSelection([]);
      setEditClassPickerCourseName("");
      if (editClassPickerResolverRef.current) {
        editClassPickerResolverRef.current(null);
        editClassPickerResolverRef.current = null;
      }
      setEditOpen(false);
      setEditUser(null);
      setForceUserType(null);
      setEditStep(1);
      setEditMode("edit");
      setEditMode("edit");
    } catch (error) {
      console.error("Error saving edit:", error);
      setFormError(error?.message || "Failed to save user");
    }
  };

  if (loading) {
    return <Loader className="py-12" />;
  }

  // if (!id) {
  //   return (
  //     <div className="space-y-6">
  //       <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  //         Students
  //       </h1>
  //       <EmptyState
  //         title="Select a course"
  //         description="Please select a course to view enrolled students."
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-8">
      <h1 className="text-lg sm:text-xl font-bold  text-gray-900 dark:text-white border-l-4 border-indigo-500/60 dark:border-indigo-400/60 pl-3">
        {course
          ? `Students in ${
              course.name ?? course.CourseName ?? course.courseName ?? ""
            }`
          : "My Students"}
      </h1>

      <div className="flex justify-start sm:justify-end ">
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          + Add Student
        </button>
      </div>

      {/* <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {"Create New User"}
                </h2>
                <button
                  onClick={closeCreateModal}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-4">
                <UserForm
                  onSubmit={handleCreateSubmit}
                  loading={false}
                  user={null}
                  userTypes={[
                    { id: 1, name: "Admin" },
                    { id: 2, name: "Teacher" },
                    { id: 3, name: "Student" },
                  ]}
                  forceUserType={3}
                  initialCourseSelection={sanitizeCourseSelection(
                    defaultCourseSelection
                  )}
                  teacherId={teacherId}
                  showCoreFields={createStep === 1}
                  showRoleFields={createStep === 2}
                  submitLabel={createStep === 1 ? "Next" : "Create"}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence> */}

       <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {"Create New User"}
                </h2>
                <button
                  onClick={closeCreateModal}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                <UserForm
                  onSubmit={handleCreateSubmit}
                  loading={false}
                  user={null}
                  userTypes={[
                    { id: 1, name: "Admin" },
                    { id: 2, name: "Teacher" },
                    { id: 3, name: "Student" },
                  ]}
                  forceUserType={3}
                  initialCourseSelection={sanitizeCourseSelection(
                    defaultCourseSelection
                  )}
                  teacherId={teacherId}
                  showCoreFields={createStep === 1}
                  showRoleFields={createStep === 2}
                  submitLabel={createStep === 1 ? "Next" : "Create"}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-4 sm:p-6">
        {(() => {
          const isActiveFlag = (u) => {
            // Explicitly check for IsActive property, don't default to true if it's false or 0
            const activeValue =
              u?.IsActive !== undefined && u?.IsActive !== null
                ? u.IsActive
                : u?.isActive !== undefined && u?.isActive !== null
                ? u.isActive
                : true;
            return Boolean(activeValue);
          };
          const activeStudents = (students || []).filter(isActiveFlag);
          const inactiveStudents = (students || []).filter(
            (u) => !isActiveFlag(u)
          );

          return (
            <>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => setMembersTab("active")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      membersTab === "active"
                        ? "bg-indigo-600 text-white"
                        : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    title={`Active (${activeStudents.length})`}
                  >
                    Active{" "}
                    <span className="ml-2 text-xs">
                      ({activeStudents.length})
                    </span>
                  </button>

                  <button
                    onClick={() => setMembersTab("inactive")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      membersTab === "inactive"
                        ? "bg-indigo-600 text-white"
                        : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    title={`Inactive (${inactiveStudents.length})`}
                  >
                    Inactive{" "}
                    <span className="ml-2 text-xs">
                      ({inactiveStudents.length})
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {membersTab === "active" ? (
                  <UserList
                    users={activeStudents}
                    onEdit={openEdit}
                    onAddStudent={openEdit}
                    onActivate={handleActivateUser}
                    onDeactivate={handleDeactivateUser}
                    getDetailsPath={(student) => {
                      const identifier =
                        student.UserID ||
                        student.userID ||
                        student.userId ||
                        student.id ||
                        student.StudentID ||
                        student.studentID ||
                        student.studentId;
                      return identifier
                        ? `/teacher/students/${identifier}`
                        : null;
                    }}
                  />
                ) : (
                  <UserList
                    users={inactiveStudents}
                    onEdit={openEdit}
                    onAddStudent={openEdit}
                    onActivate={handleActivateUser}
                    onDeactivate={handleDeactivateUser}
                    getDetailsPath={(student) => {
                      const identifier =
                        student.UserID ||
                        student.userID ||
                        student.userId ||
                        student.id ||
                        student.StudentID ||
                        student.studentID ||
                        student.studentId;
                      return identifier
                        ? `/teacher/students/${identifier}`
                        : null;
                    }}
                  />
                )}
              </div>

              {toastMessage && (
                <Toast
                  message={toastMessage}
                  type={toastType}
                  onClose={() => setToastMessage(null)}
                />
              )}
            </>
          );
        })()}
      </div>

      <CoursePickerModal
        isOpen={showCoursePicker}
        onClose={handleCoursePickerClose}
        initialSelected={courseSelection}
        title="Select Course for Student"
        description="Choose a course to enroll the new student in."
        multiSelect={false}
        allowCreate={false}
        teacherId={teacherId}
        saving={coursePickerSaving || creationSaving}
        errorMessage={coursePickerError}
        onProceed={handleCoursePickerProceed}
      />

      <ClassPickerModal
        isOpen={showClassPicker}
        onClose={handleClassPickerClose}
        options={classOptions}
        initialSelected={classSelection}
        title={
          classPickerCourseName
            ? `Select Class for ${classPickerCourseName}`
            : "Select Class"
        }
        description={
          classPickerCourseName
            ? `Choose the class or section for ${classPickerCourseName}.`
            : "Choose the class for the student."
        }
        saving={creationSaving}
        loading={classPickerLoading}
        errorMessage={classPickerError}
        multiSelect={false}
        requireSelection={classOptions.length > 0}
        proceedLabel="Create Student"
        cancelLabel="Back"
        onProceed={handleClassPickerProceed}
      />

      <ClassPickerModal
        isOpen={editClassPickerVisible}
        onClose={handleEditClassPickerClose}
        options={editClassPickerOptions}
        initialSelected={editClassPickerInitialSelection}
        title={
          editClassPickerCourseName
            ? `Select Class for ${editClassPickerCourseName}`
            : "Select Class"
        }
        description={
          editClassPickerCourseName
            ? `Choose the class or section for ${editClassPickerCourseName}.`
            : "Choose the class for the selected course."
        }
        saving={false}
        loading={false}
        errorMessage=""
        multiSelect={false}
        requireSelection={editClassPickerOptions.length > 0}
        proceedLabel="Save Selection"
        cancelLabel="Cancel"
        onProceed={handleEditClassPickerProceed}
      />

      {/* Edit Student Popup (admin-style multi-step modal) */}
      <AnimatePresence>
        {isEditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editMode === "add"
                    ? "Add Enrolled Courses"
                    : editUser
                    ? "Edit User"
                    : "Create New User"}
                </h2>
                <button
                  onClick={() => {
                    if (editClassPickerResolverRef.current) {
                      editClassPickerResolverRef.current(null);
                      editClassPickerResolverRef.current = null;
                    }
                    setEditClassPickerVisible(false);
                    setEditClassPickerOptions([]);
                    setEditClassPickerInitialSelection([]);
                    setEditClassPickerCourseName("");
                    setEditCourseClassAssignments({});
                    setEditOpen(false);
                    setEditUser(null);
                    setForceUserType(null);
                    setEditStep(1);
                    setFormError("");
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 px-4 py-3 flex-shrink-0">
                  {formError}
                </div>
              )}

              <div className="overflow-y-auto flex-1 p-4">
                <UserForm
                  onSubmit={handleEditSubmit}
                  user={editUser}
                  loading={editLoading}
                  userTypes={[
                    { id: 1, name: "Admin" },
                    { id: 2, name: "Teacher" },
                    { id: 3, name: "Student" },
                  ]}
                  forceUserType={forceUserType}
                  teacherId={teacherId}
                  initialCourseSelection={
                    (editUser?.StudentCourseIDs || []).map(String) || []
                  }
                  onStudentCourseSelectionChange={
                    handleStudentCourseSelectionChange
                  }
                  showCoreFields={editStep === 1}
                  showRoleFields={editStep === 2}
                  showEnrolledOnly={editMode === "add"}
                  submitLabel={editMode === "add" ? "Add" : editStep === 1 ? "Next" : "Update"}
                  {...(editStep > 1
                    ? {
                        onBack: () =>
                          setEditStep((s) => Math.max(1, (s || 1) - 1)),
                      }
                    : {})}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherStudents;
