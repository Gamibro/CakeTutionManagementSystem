import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  getAllUsers,
  createUser,
  updateUser,
  getUserById,
  deleteUser,
  uploadProfilePhoto,
  updateProfilePhoto,
} from "../../services/userService";
import {
  createStudent,
  updateStudent,
  getStudentById,
} from "../../services/studentService";
import {
  createEnrollmentsForStudent,
  createEnrollment,
  getEnrollmentsByStudent,
  deleteEnrollment,
  updateEnrollment,
  setEnrollmentActiveStatus,
} from "../../services/enrollmentService";
import {
  createTeacher,
  updateTeacher,
  getTeacherById,
} from "../../services/teacherService";
import {
  getTeacherCourses,
  updateCourse,
  getStudentCourses,
  getCourseDetails,
} from "../../services/courseService";
import UserList from "../../components/users/UserList";
import UserForm from "../../components/users/UserForm";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import CoursePickerModal from "../../components/courses/CoursePickerModal";
import ClassPickerModal from "../../components/classes/ClassPickerModal";
import Toast from "../../components/common/Toast";
import { getAllClassSchedules } from "../../services/classScheduleService";
import { getAllSubjects } from "../../services/subjectService";
import { FiUsers, FiShield, FiUser, FiUserCheck } from "react-icons/fi";

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

const toApiId = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
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

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "nameAsc", label: "Name A-Z" },
  { value: "nameDesc", label: "Name Z-A" },
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
    };

    option.label = resolvedLabel;
    option.code = codeCandidate;
    option.courseSubjectId = resolvedCourseSubjectId;

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

    const hasExplicitMatch = normalizedCourseId
      ? courseIdCandidates.has(normalizedCourseId)
      : false;
    const hasScheduleMatch = subjectScheduleMap.has(normalizedSubjectId);

    if (normalizedCourseId && !hasExplicitMatch && !hasScheduleMatch) {
      return;
    }

    registerOption(normalizedSubjectId, subject.name ?? subject.SubjectName, {
      code: subject.subjectCode ?? subject.code ?? subject.Code ?? null,
    });
  };

  subjects.forEach(pushSubjectCourseMatches);

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
      {}
    );
  });

  options.sort((a, b) => a.label.localeCompare(b.label));
  return options;
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredStudentIds, setFilteredStudentIds] = useState(new Set());
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editStep, setEditStep] = useState(1); // 1: core details, 2: role-specific (edit flow)
  const [createStep, setCreateStep] = useState(1); // 1: core details, 2: role-specific (create flow)
  const [editMode, setEditMode] = useState("edit");
  const [formError, setFormError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [forceUserType, setForceUserType] = useState(null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [initialCourseSelection, setInitialCourseSelection] = useState([]);
  const [pendingUserData, setPendingUserData] = useState(null); // holds student payload awaiting course pick
  const [pendingCreateCore, setPendingCreateCore] = useState(null); // stores step-1 (core) data for create flow
  // Post-create teacher course assignment modal state
  const [showAssignTeacherCourses, setShowAssignTeacherCourses] =
    useState(false);
  const [newTeacherIdForAssignment, setNewTeacherIdForAssignment] =
    useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("success");
  // view for members list: 'active' or 'inactive'
  const [membersTab, setMembersTab] = useState("active");
  const [sortOption, setSortOption] = useState("newest");
  const [coursePickerSaving, setCoursePickerSaving] = useState(false);
  const [coursePickerError, setCoursePickerError] = useState("");
  const [pendingCourseSelection, setPendingCourseSelection] = useState([]);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [classOptions, setClassOptions] = useState([]);
  const [classSelection, setClassSelection] = useState([]);
  const [classPickerLoading, setClassPickerLoading] = useState(false);
  const [classPickerError, setClassPickerError] = useState("");
  const [classPickerCourseName, setClassPickerCourseName] = useState("");
  const [classPickerContext, setClassPickerContext] = useState(null);
  const [studentCourseClassSelections, setStudentCourseClassSelections] =
    useState({});
  const [creationSaving, setCreationSaving] = useState(false);
  const subjectsCacheRef = useRef(null);
  const classSchedulesCacheRef = useRef(null);
  const classOptionsCacheRef = useRef(new Map());
  const pendingClassSelectionResolverRef = useRef(null);
  const studentCourseClassSelectionsRef = useRef({});

  useEffect(() => {
    studentCourseClassSelectionsRef.current = studentCourseClassSelections;
  }, [studentCourseClassSelections]);

  // derived course filter (if admin navigated here with a course param)
  const courseFilterParam = (() => {
    try {
      const qs = new URLSearchParams(location.search || "");
      return qs.get("course") || location.state?.course || "" || "";
    } catch (e) {
      return "";
    }
  })();

  const resetPendingStudentFlow = () => {
    setPendingUserData(null);
    setPendingCourseSelection([]);
    setCoursePickerSaving(false);
    setCoursePickerError("");
    setClassOptions([]);
    setClassSelection([]);
    setClassPickerLoading(false);
    setClassPickerError("");
    setClassPickerCourseName("");
    setShowClassPicker(false);
    setCreationSaving(false);
    setClassPickerContext(null);
    setStudentCourseClassSelections({});
    pendingClassSelectionResolverRef.current = null;
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

  const ensureSchedulesLoaded = async () => {
    if (classSchedulesCacheRef.current) {
      return classSchedulesCacheRef.current;
    }

    try {
      const schedules = await getAllClassSchedules();
      classSchedulesCacheRef.current = Array.isArray(schedules)
        ? schedules
        : [];
    } catch (error) {
      console.warn("Failed to load class schedules for class selection", error);
      classSchedulesCacheRef.current = [];
    }

    return classSchedulesCacheRef.current;
  };

  const loadClassOptionsForCourse = async (selectedCourseId) => {
    const normalizedId = normalizeIdString(selectedCourseId);
    if (!normalizedId) {
      return { options: [], courseName: "" };
    }

    if (classOptionsCacheRef.current.has(normalizedId)) {
      return classOptionsCacheRef.current.get(normalizedId);
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

    const [subjects, schedules] = await Promise.all([
      ensureSubjectsLoaded(),
      ensureSchedulesLoaded(),
    ]);

    const options = deriveClassOptions(
      courseDetails,
      normalizedId,
      subjects,
      schedules
    );
    const payload = { options, courseName };
    classOptionsCacheRef.current.set(normalizedId, payload);
    return payload;
  };

  const finalizeStudentCreation = async (
    selectedCourseIds,
    selectedSubjectIds = []
  ) => {
    if (!pendingUserData) {
      throw new Error("Missing student details. Please restart the flow.");
    }

    setFormError("");

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

    const photoToUpload =
      pendingUserData.ProfilePicture || pendingUserData.profilepicture || null;

    setCreationSaving(true);

    try {
      const createdUser = await createUser({
        ...pendingUserData,
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
        pendingUserData.EnrollmentDate ??
        pendingUserData.enrollmentDate ??
        null;

      const studentPayload = {
        UserID:
          createdUser.UserID ??
          createdUser.id ??
          createdUser.userID ??
          createdUser.userId,
        RollNumber:
          pendingUserData.RollNumber ??
          pendingUserData.IDNumber ??
          pendingUserData.rollNumber ??
          pendingUserData.idNumber ??
          undefined,
        EnrollmentDate: enrollmentDateValue ?? undefined,
        CurrentGrade:
          pendingUserData.CurrentGrade ??
          pendingUserData.Class ??
          pendingUserData.currentGrade ??
          pendingUserData.class ??
          undefined,
        ParentName:
          pendingUserData.ParentName ??
          pendingUserData.GuardianName ??
          pendingUserData.parentName ??
          pendingUserData.guardianName ??
          undefined,
        ParentContact:
          pendingUserData.ParentContact ??
          pendingUserData.GuardianPhone ??
          pendingUserData.parentContact ??
          pendingUserData.guardianPhone ??
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
        setFormError(
          studentErr?.message || "Student created but failed to save details"
        );
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
        } else if (numericCourseIds.length) {
          await createEnrollmentsForStudent(
            toApiId(resolvedStudentId),
            numericCourseIds,
            {
              EnrollmentDate: enrollmentDateIso,
              IsActive: true,
            }
          );
        }
      }

      const normalizedCourseIdsForUser = courseIds.map((cid) => {
        const numeric = Number(cid);
        return Number.isNaN(numeric) ? cid : numeric;
      });

      const enrichedUser = {
        ...createdUser,
        StudentCourseIDs: normalizedCourseIdsForUser,
      };

      if (createdStudent && typeof createdStudent === "object") {
        const studentIdCandidate =
          createdStudent.StudentID ??
          createdStudent.studentID ??
          createdStudent.studentId ??
          createdStudent.id ??
          null;
        if (studentIdCandidate !== null && studentIdCandidate !== undefined) {
          enrichedUser.StudentID = studentIdCandidate;
          enrichedUser.studentID = studentIdCandidate;
        }
        enrichedUser.Student = createdStudent;
        enrichedUser.student = createdStudent;
      }

      setUsers((prev) => [enrichedUser, ...prev]);
      resetPendingStudentFlow();
      setShowCoursePicker(false);
      setShowModal(false);
      setForceUserType(null);
      setInitialCourseSelection([]);
      setPendingCreateCore(null);
    } catch (error) {
      throw error;
    } finally {
      setCreationSaving(false);
    }
  };

  const handleClassPickerClose = () => {
    if (classPickerContext?.mode === "edit-student-course") {
      const resolver = pendingClassSelectionResolverRef.current;
      pendingClassSelectionResolverRef.current = null;
      setShowClassPicker(false);
      setClassPickerContext(null);
      setClassPickerError("");
      setClassPickerLoading(false);
      setClassSelection([]);
      setClassPickerCourseName("");
      setClassOptions([]);
      if (resolver && typeof resolver.resolve === "function") {
        resolver.resolve(null);
      }
      return;
    }

    if (creationSaving) {
      return;
    }
    setShowClassPicker(false);
    setClassPickerError("");
    setClassPickerLoading(false);
    setClassSelection([]);
    setClassPickerCourseName("");
    setClassOptions([]);
    setPendingCourseSelection([]);
    if (pendingUserData) {
      setCoursePickerError("");
      setShowCoursePicker(true);
    }
    setClassPickerContext(null);
  };

  const handleStudentCourseSelectionChange = async (
    nextIdsRaw = [],
    previousIdsRaw = []
  ) => {
    const dedupeIds = (list) =>
      Array.from(
        new Set(
          (list || [])
            .map((value) => normalizeIdString(value))
            .filter((value) => value !== null)
        )
      );

    const nextIds = dedupeIds(nextIdsRaw);
    const previousIds = dedupeIds(previousIdsRaw);

    const previousSet = new Set(previousIds);
    const nextSet = new Set(nextIds);

    const removed = previousIds.filter((id) => !nextSet.has(id));
    if (removed.length) {
      setStudentCourseClassSelections((prev) => {
        const next = { ...prev };
        removed.forEach((courseId) => {
          const key = normalizeIdString(courseId);
          if (key && Object.prototype.hasOwnProperty.call(next, key)) {
            delete next[key];
          }
        });
        return next;
      });
    }

    const added = nextIds.filter((id) => !previousSet.has(id));
    if (!added.length) {
      return {
        accepted: true,
        finalIds: nextIds,
      };
    }

    let workingMap = { ...studentCourseClassSelectionsRef.current };

    for (const courseIdCandidate of added) {
      const courseId = normalizeIdString(courseIdCandidate);
      if (!courseId) {
        continue;
      }

      setClassPickerLoading(true);
      setClassPickerError("");

      let payload;
      try {
        payload = await loadClassOptionsForCourse(courseId);
      } catch (error) {
        console.error("Failed to load classes for course", error);
        setClassPickerLoading(false);
        setFormError(
          error?.message ||
            "Unable to load classes for the selected course. Please try again."
        );
        return {
          accepted: false,
          finalIds: previousIds,
          reopenPicker: true,
        };
      }

      const options = Array.isArray(payload?.options) ? payload.options : [];
      const courseName = payload?.courseName || "";

      setClassPickerLoading(false);

      if (!options.length) {
        const nextMap = { ...workingMap };
        if (Object.prototype.hasOwnProperty.call(nextMap, courseId)) {
          delete nextMap[courseId];
        }
        workingMap = nextMap;
        continue;
      }

      const existingSelection = workingMap[courseId]
        ? [String(workingMap[courseId].subjectId)]
        : [];

      const selection = await new Promise((resolve) => {
        pendingClassSelectionResolverRef.current = { resolve };
        setClassOptions(options);
        setClassSelection(
          existingSelection.length
            ? existingSelection
            : options.length === 1
            ? [String(options[0].id)]
            : []
        );
        setClassPickerCourseName(courseName);
        setClassPickerError("");
        setClassPickerContext({
          mode: "edit-student-course",
          courseId,
        });
        setShowClassPicker(true);
      });

      if (!selection || !selection.length) {
        return {
          accepted: false,
          finalIds: previousIds,
          reopenPicker: true,
        };
      }

      const selectedId = String(selection[0]);
      const normalizedSelectedId = normalizeIdString(selectedId);

      const optionMatch = options.find((option) => {
        const optionId = normalizeIdString(option?.id ?? option?.subjectId);
        return optionId && optionId === normalizedSelectedId;
      });

      workingMap = {
        ...workingMap,
        [courseId]: {
          subjectId: normalizedSelectedId,
          courseSubjectId: normalizeIdString(
            optionMatch?.courseSubjectId ?? optionMatch?.CourseSubjectID
          ),
        },
      };
    }

    setStudentCourseClassSelections(workingMap);
    setClassPickerLoading(false);

    return {
      accepted: true,
      finalIds: nextIds,
    };
  };

  const handleClassPickerProceed = async (selectedSubjectIds) => {
    if (classPickerContext?.mode === "edit-student-course") {
      const normalized = Array.from(
        new Set((selectedSubjectIds || []).map((value) => String(value)))
      ).filter(Boolean);

      setClassSelection(normalized);
      setClassPickerError("");
      setClassPickerLoading(false);
      setShowClassPicker(false);

      const resolver = pendingClassSelectionResolverRef.current;
      pendingClassSelectionResolverRef.current = null;
      setClassPickerContext(null);

      if (resolver && typeof resolver.resolve === "function") {
        resolver.resolve(normalized);
      }
      return;
    }

    const normalized = Array.from(
      new Set((selectedSubjectIds || []).map((value) => String(value)))
    ).filter(Boolean);
    setClassSelection(normalized);
    setClassPickerError("");

    try {
      await finalizeStudentCreation(pendingCourseSelection, normalized);
    } catch (err) {
      console.error("Error finalizing student creation:", err);
      setClassPickerError(
        err?.message ||
          "Unable to enroll the student in the selected class. Please try again."
      );
    }
  };

  const handleCoursePickerClose = () => {
    if (coursePickerSaving || classPickerLoading || creationSaving) {
      return;
    }
    setShowCoursePicker(false);
    if (pendingUserData) {
      resetPendingStudentFlow();
      setPendingCreateCore(null);
      setForceUserType(null);
      setInitialCourseSelection([]);
      setCreateStep(1);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Apply initial tab/course filter from URL (either search params or navigation state)
  useEffect(() => {
    const qs = new URLSearchParams(location.search || "");
    const tab = (qs.get("tab") || location.state?.tab || "").toString();
    const courseParam = (
      qs.get("course") ||
      location.state?.course ||
      ""
    ).toString();

    if (tab === "students") {
      setActiveTab("students");
    }

    if (courseParam) {
      // set students tab if not already
      setActiveTab("students");
      // compute student ids enrolled in the course and store in state
      (async () => {
        try {
          const matching = new Set();
          // For each user that is a student, check enrollments
          const allUsers = users && users.length ? users : await getAllUsers();
          const studentUsers = (allUsers || []).filter((u) =>
            ["3", 3].includes(
              Number(
                u.UserTypeID ?? u.userTypeID ?? u.UserType ?? u.userType ?? 0
              )
            )
          );

          for (const u of studentUsers) {
            const sid = u.UserID ?? u.id ?? u.userID ?? u.userId ?? null;
            if (!sid) continue;
            try {
              const enrollments = await getEnrollmentsByStudent(sid);
              if (
                Array.isArray(enrollments) &&
                enrollments.some(
                  (e) => String(e.CourseID) === String(courseParam)
                )
              ) {
                matching.add(String(sid));
              }
            } catch (e) {
              // ignore per-user errors
            }
          }

          setFilteredStudentIds(matching);
        } catch (err) {
          console.warn("Failed to pre-filter students by course", err);
        }
      })();
    }
  }, [location.search, location.state, users]);

  const handleUserSubmit = async (userData) => {
    try {
      setFormError("");
      setCoursePickerError("");
      setClassPickerError("");

      if (!selectedUser) {
        // Creation flow (2-step wizard)
        const typeId = String(userData.UserTypeID || userData.userTypeID || "");

        // If admin, there's no role-specific step — create immediately from step 1
        if (createStep === 1 && typeId === "1") {
          // capture photo if present on form data
          const photoToUpload = userData?.ProfilePicture || null;
          const createdAdmin = await createUser({
            ...userData,
            IsActive: true,
            ProfilePicture: null,
          });
          // upload photo separately if provided (backend endpoint will update DB)
          if (
            photoToUpload &&
            typeof photoToUpload === "string" &&
            photoToUpload.startsWith("data:")
          ) {
            try {
              const uploadResult = await uploadProfilePhoto(
                createdAdmin.UserID || createdAdmin.id,
                photoToUpload
              );
              const uploadedPath = uploadResult?.filePath;
              const cacheBuster = uploadResult?.cacheBuster;
              if (uploadedPath) {
                createdAdmin.ProfilePicture = uploadedPath;
                createdAdmin.profilePicture = uploadedPath;
              }
              if (cacheBuster) {
                createdAdmin.ProfilePictureVersion = cacheBuster;
                createdAdmin.profilePictureVersion = cacheBuster;
              }
            } catch (uErr) {
              console.warn("Profile upload failed:", uErr);
            }
          }
          setUsers([...users, createdAdmin]);
          setShowModal(false);
          setForceUserType(null);
          setCreateStep(1);
          setPendingCreateCore(null);
          return;
        }

        if (createStep === 1) {
          // Store core details and move to step 2
          setPendingCreateCore({ ...userData });
          // Lock user type for step 2
          setForceUserType(Number(typeId) || null);
          setCreateStep(2);
          return; // don't call API yet
        }

        // Step 2: role-specific submit
        const mergedCreate = {
          ...(pendingCreateCore || {}),
          ...userData,
          UserTypeID: Number(
            typeId ||
              (pendingCreateCore?.UserTypeID ?? pendingCreateCore?.userTypeID)
          ),
          IsActive: true,
          ProfilePicture: null,
        };

        if (typeId === "3") {
          // Student: after step 2, open course picker to finish
          resetPendingStudentFlow();
          setPendingUserData(mergedCreate);
          setShowModal(false);
          setInitialCourseSelection(
            (mergedCreate.StudentCourseIDs || []).map((id) => String(id))
          );
          setShowCoursePicker(true);
          // reset wizard state
          setCreateStep(1);
          setPendingCreateCore(null);
          return;
        }

        // If creating a teacher, synthesize the next user id from existing users
        if (typeId === "2") {
          try {
            const existing = await getAllUsers();
            const nums = (existing || []).map((u) => {
              const id = u?.UserID ?? u?.id ?? u?.userID ?? u?.userId ?? 0;
              const n = Number(id);
              return Number.isNaN(n) ? 0 : n;
            });
            const max = nums.length ? Math.max(...nums) : 0;
            const nextId = max + 1;
            // prefer not to overwrite if caller already supplied an id
            mergedCreate.UserID = mergedCreate.UserID ?? nextId;
            mergedCreate.userID = mergedCreate.userID ?? nextId;
            mergedCreate.id = mergedCreate.id ?? nextId;
          } catch (err) {
            // ignore and proceed without injected id
            console.warn("Failed to auto-generate next user id:", err);
          }
        }

        // Create base user
        const photoToUpload =
          mergedCreate.ProfilePicture ||
          pendingCreateCore?.ProfilePicture ||
          userData?.ProfilePicture ||
          null;
        const createdUser = await createUser(mergedCreate);

        if (typeId === "2") {
          // Create teacher record and assign courses if provided
          try {
            const teacherPayload = {
              TeacherID:
                createdUser.UserID ??
                createdUser.id ??
                createdUser.userID ??
                createdUser.userId,
              EmployeeID: mergedCreate.EmployeeID || undefined,
              Department: mergedCreate.Department || undefined,
              Qualification: mergedCreate.Qualification || undefined,
              JoiningDate:
                mergedCreate.JoiningDate ??
                mergedCreate.joiningDate ??
                mergedCreate.JoinDate ??
                undefined,
              Bio: mergedCreate.Bio || undefined,
            };

            // Enforce JoiningDate for teachers
            const joiningValue =
              mergedCreate.JoiningDate ??
              mergedCreate.joiningDate ??
              mergedCreate.JoinDate ??
              null;
            if (!joiningValue) {
              setFormError("Joining date is required for teachers");
              return;
            }

            const createdTeacher = await createTeacher(teacherPayload);

            const merged = {
              ...createdUser,
              TeacherID:
                createdTeacher.TeacherID ??
                createdTeacher.teacherId ??
                createdTeacher.Teacher?.TeacherID ??
                createdUser.TeacherID,
              Teacher: createdTeacher,
            };
            // upload photo if present
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
                  merged.ProfilePicture = uploadedPath;
                  merged.profilePicture = uploadedPath;
                }
                if (cacheBuster) {
                  merged.ProfilePictureVersion = cacheBuster;
                  merged.profilePictureVersion = cacheBuster;
                }
              } catch (uErr) {
                console.warn("Profile upload failed:", uErr);
              }
            }
            setUsers([...users, merged]);
            // Open post-create course assignment modal instead of pre-select step
            const teacherId =
              merged.UserID ?? merged.id ?? merged.userID ?? merged.userId;
            if (teacherId) {
              setNewTeacherIdForAssignment(String(teacherId));
              setShowAssignTeacherCourses(true);
              try {
                const fullName = `${
                  merged.FirstName || merged.firstName || ""
                } ${merged.LastName || merged.lastName || ""}`.trim();
                const persisted = { id: String(teacherId), name: fullName };
                window.localStorage.setItem(
                  "selected_teacher_for_course",
                  JSON.stringify(persisted)
                );
              } catch (e) {
                // ignore storage errors
              }
            }
          } catch (err) {
            setUsers([...users, createdUser]);
            setFormError(err?.message || "Failed to create teacher record");
          }
        } else {
          // upload photo if present
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
          setUsers([...users, createdUser]);
        }

        // Reset wizard state
        setShowModal(false);
        setForceUserType(null);
        setCreateStep(1);
        setPendingCreateCore(null);
      } else {
        const userId = selectedUser.UserID || selectedUser.id;

        if (editStep === 1) {
          // Step 1: update core details only
          const updatedUser = await updateUser(userId, userData);

          // If the user included a new photo (data URL), upload it separately using UPDATE endpoint
          const photoToUpload = userData?.ProfilePicture || null;
          if (
            photoToUpload &&
            typeof photoToUpload === "string" &&
            photoToUpload.startsWith("data:")
          ) {
            try {
              const uploadResult = await updateProfilePhoto(
                userId,
                photoToUpload
              );
              const uploadedPath = uploadResult?.filePath;
              const cacheBuster = uploadResult?.cacheBuster;
              if (uploadedPath) {
                // reflect in the returned updatedUser and in local users list
                updatedUser.ProfilePicture = uploadedPath;
                updatedUser.profilePicture = uploadedPath;
              }
              if (cacheBuster) {
                updatedUser.ProfilePictureVersion = cacheBuster;
                updatedUser.profilePictureVersion = cacheBuster;
              }
            } catch (uErr) {
              console.warn("Profile upload failed:", uErr);
            }
          }

          // Determine next type and handle admin as a one-step update
          const nextTypeId = String(
            updatedUser.UserTypeID || updatedUser.userTypeID || ""
          );

          // If the user is an Admin, complete the update in one step.
          if (nextTypeId === "1") {
            setUsers(
              users.map((user) => {
                const currentUserId = user.UserID || user.id;
                const updatedUserId = updatedUser.UserID || updatedUser.id;
                return currentUserId === updatedUserId ? updatedUser : user;
              })
            );
            // close modal and reset state
            setShowModal(false);
            setSelectedUser(null);
            setForceUserType(null);
            setEditStep(1);
            return;
          }

          // Preload role-specific details for step 2 and merge into user
          let merged = { ...updatedUser };
          try {
            if (nextTypeId === "3") {
              // Student: load student record and enrolled courses
              const [studentRec, courses, enrollments] = await Promise.all([
                getStudentById(userId),
                getStudentCourses(userId),
                getEnrollmentsByStudent(userId),
              ]);
              const studentFields = studentRec || {};
              const courseIds = (courses || [])
                .map((c) => c.id ?? c.CourseID ?? c.courseId)
                .filter((v) => v !== undefined && v !== null);

              const initialSelections = {};
              (enrollments || []).forEach((enrollment) => {
                if (!enrollment || typeof enrollment !== "object") {
                  return;
                }

                const courseKey = normalizeIdString(
                  enrollment.CourseID ??
                    enrollment.courseID ??
                    enrollment.raw?.CourseID ??
                    enrollment.raw?.courseID
                );
                if (!courseKey) {
                  return;
                }

                const subjectCandidates = [
                  enrollment.SubjectID,
                  enrollment.subjectID,
                  enrollment.subjectId,
                  enrollment.raw?.SubjectID,
                  enrollment.raw?.subjectID,
                  enrollment.raw?.SubjectId,
                  enrollment.raw?.subjectId,
                ];

                let subjectId = null;
                for (const candidate of subjectCandidates) {
                  const normalized = normalizeIdString(candidate);
                  if (normalized) {
                    subjectId = normalized;
                    break;
                  }
                }

                if (!subjectId) {
                  return;
                }

                const courseSubjectCandidates = [
                  enrollment.CourseSubjectID,
                  enrollment.courseSubjectID,
                  enrollment.courseSubjectId,
                  enrollment.raw?.CourseSubjectID,
                  enrollment.raw?.courseSubjectID,
                  enrollment.raw?.CourseSubjectId,
                  enrollment.raw?.courseSubjectId,
                ];

                let courseSubjectId = null;
                for (const candidate of courseSubjectCandidates) {
                  const normalized = normalizeIdString(candidate);
                  if (normalized) {
                    courseSubjectId = normalized;
                    break;
                  }
                }

                initialSelections[courseKey] = {
                  subjectId,
                  courseSubjectId,
                };
              });

              setStudentCourseClassSelections(initialSelections);
              merged = {
                ...merged,
                RollNumber:
                  studentFields.RollNumber ??
                  studentFields.rollNumber ??
                  merged.RollNumber,
                CurrentGrade:
                  studentFields.CurrentGrade ??
                  studentFields.currentGrade ??
                  merged.CurrentGrade,
                ParentName:
                  studentFields.ParentName ??
                  studentFields.parentName ??
                  merged.ParentName,
                ParentContact:
                  studentFields.ParentContact ??
                  studentFields.parentContact ??
                  merged.ParentContact,
                EnrollmentDate:
                  studentFields.EnrollmentDate ??
                  studentFields.enrollmentDate ??
                  merged.EnrollmentDate,
                StudentCourseIDs: courseIds,
              };
            } else if (nextTypeId === "2") {
              // Teacher: load teacher record and assigned courses
              const [teacherRec, courses] = await Promise.all([
                getTeacherById(userId),
                getTeacherCourses(userId),
              ]);
              const courseIds = (courses || [])
                .map((c) => c.id ?? c.CourseID ?? c.courseId)
                .filter((v) => v !== undefined && v !== null);
              merged = {
                ...merged,
                EmployeeID:
                  teacherRec?.EmployeeID ??
                  teacherRec?.employeeID ??
                  merged.EmployeeID,
                Department:
                  teacherRec?.Department ??
                  teacherRec?.department ??
                  merged.Department,
                Qualification:
                  teacherRec?.Qualification ??
                  teacherRec?.qualification ??
                  merged.Qualification,
                JoiningDate:
                  teacherRec?.JoiningDate ??
                  teacherRec?.joiningDate ??
                  merged.JoiningDate,
                Bio: teacherRec?.Bio ?? teacherRec?.bio ?? merged.Bio,
                CourseIDs: courseIds,
              };
            }
          } catch (prefillErr) {
            console.warn("Failed to preload role-specific details", prefillErr);
          }

          // Update list and move to step 2
          setUsers(
            users.map((user) => {
              const currentUserId = user.UserID || user.id;
              const updatedUserId = merged.UserID || merged.id;
              return currentUserId === updatedUserId ? merged : user;
            })
          );
          setSelectedUser(merged);
          setForceUserType(Number(nextTypeId || 0) || null);
          setEditStep(2);
          // stay in modal for step 2
          return;
        }

        // Step 2: update role-specific data only
        const typeId = String(
          selectedUser.UserTypeID || selectedUser.userTypeID || ""
        );

        try {
          if (typeId === "3") {
            await updateStudent(userId, {
              RollNumber: userData.RollNumber ?? userData.IDNumber,
              EnrollmentDate: userData.EnrollmentDate,
              CurrentGrade: userData.CurrentGrade ?? userData.Class,
              ParentName: userData.ParentName ?? userData.GuardianName,
              ParentContact: userData.ParentContact ?? userData.GuardianPhone,
            });
            const desiredRaw = userData.StudentCourseIDs || [];

            // 🔹 Desired courses: unique, ordered list from the picker
            const desired = Array.from(
              new Set(
                desiredRaw
                  .map((value) => normalizeIdString(value))
                  .filter((value) => value !== null)
              )
            );

            try {
              const enrollmentList = await getEnrollmentsByStudent(userId);
              const selectionMap =
                studentCourseClassSelectionsRef.current || {};

              // Normalize existing enrollments (we’ll reuse these rows)
              const currentEnrollments = (enrollmentList || [])
                .filter(
                  (enrollment) => enrollment && typeof enrollment === "object"
                )
                .map((enrollment) => {
                  const enrollmentId =
                    enrollment.EnrollmentID ??
                    enrollment.enrollmentID ??
                    enrollment.id ??
                    enrollment.Id ??
                    enrollment.raw?.EnrollmentID ??
                    enrollment.raw?.enrollmentID ??
                    null;

                  const courseId = normalizeIdString(
                    enrollment.CourseID ??
                      enrollment.courseID ??
                      enrollment.raw?.CourseID ??
                      enrollment.raw?.courseID
                  );

                  return {
                    enrollment,
                    enrollmentId,
                    courseId,
                  };
                })
                .filter((entry) => entry.enrollmentId !== null);

              // Stable ordering: "first enrollment", "second enrollment", etc.
              currentEnrollments.sort((a, b) => {
                const aNum = Number(a.enrollmentId);
                const bNum = Number(b.enrollmentId);
                if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
                  return aNum - bNum;
                }
                return String(a.enrollmentId).localeCompare(
                  String(b.enrollmentId)
                );
              });

              const toUpdate = [];
              const toCreate = [];
              const toRemove = [];

              // 🔹 Align existing rows with desired courses by position:
              // row 1 → desired[0], row 2 → desired[1], etc.
              const maxLen = Math.max(
                currentEnrollments.length,
                desired.length
              );

              for (let index = 0; index < maxLen; index += 1) {
                const existing = currentEnrollments[index] || null;
                const desiredCourseId = desired[index] || null;

                if (existing && desiredCourseId) {
                  // ✅ reuse this enrollment row and change CourseID/SubjectID to desired course
                  toUpdate.push({
                    ...existing,
                    courseId: desiredCourseId,
                  });
                } else if (!existing && desiredCourseId) {
                  // no existing row here → create a new enrollment
                  toCreate.push(desiredCourseId);
                } else if (existing && !desiredCourseId) {
                  // extra enrollment row → delete it
                  toRemove.push(existing);
                }
              }

              // 🔹 Update reused enrollments
              if (toUpdate.length) {
                const updateResults = await Promise.allSettled(
                  toUpdate.map((entry) => {
                    const normalizedCourseId = normalizeIdString(
                      entry.courseId
                    );
                    if (!entry.enrollmentId || !normalizedCourseId) {
                      return Promise.resolve(null);
                    }

                    // Subject/Class choice for this course (from the modal selection map)
                    const selection =
                      selectionMap[normalizedCourseId] ||
                      selectionMap[Number(normalizedCourseId)] ||
                      {};

                    const subjectCandidates = [
                      selection.subjectId,
                      entry.enrollment.SubjectID,
                      entry.enrollment.subjectID,
                      entry.enrollment.raw?.SubjectID,
                      entry.enrollment.raw?.subjectID,
                    ].map((candidate) => normalizeIdString(candidate));

                    const courseSubjectCandidates = [
                      selection.courseSubjectId,
                      entry.enrollment.CourseSubjectID,
                      entry.enrollment.courseSubjectID,
                      entry.enrollment.raw?.CourseSubjectID,
                      entry.enrollment.raw?.courseSubjectID,
                    ].map((candidate) => normalizeIdString(candidate));

                    const resolvedSubjectId = subjectCandidates.find(Boolean);
                    const resolvedCourseSubjectId =
                      courseSubjectCandidates.find(Boolean);

                    const enrollmentDateValue =
                      userData.EnrollmentDate ||
                      entry.enrollment.EnrollmentDate ||
                      entry.enrollment.raw?.EnrollmentDate ||
                      entry.enrollment.raw?.enrollmentDate ||
                      new Date().toISOString();

                    const payload = {
                      EnrollmentID: toApiId(entry.enrollmentId),
                      StudentID: toApiId(userId),
                      // ⬅️ THIS is the new CourseID we are assigning to this existing row
                      CourseID: toApiId(normalizedCourseId),
                      EnrollmentDate: enrollmentDateValue,
                      IsActive:
                        entry.enrollment.IsActive ??
                        entry.enrollment.isActive ??
                        true,
                    };

                    if (resolvedSubjectId) {
                      payload.SubjectID = toApiId(resolvedSubjectId);
                    }

                    if (resolvedCourseSubjectId) {
                      payload.CourseSubjectID = toApiId(
                        resolvedCourseSubjectId
                      );
                    }

                    return updateEnrollment(entry.enrollmentId, payload);
                  })
                );

                const failedUpdate = updateResults.find(
                  (result) => result.status === "rejected"
                );

                if (failedUpdate) {
                  const reason = failedUpdate.reason;
                  throw new Error(
                    reason?.message ||
                      "Failed to update existing course enrollment."
                  );
                }
              }

              // 🔹 Create extra enrollments when you picked more courses than existing rows
              if (toCreate.length) {
                const defaultEnrollmentDate =
                  userData.EnrollmentDate || new Date().toISOString();

                const creationResults = await Promise.allSettled(
                  toCreate.map((courseId) => {
                    const normalizedCourseId = normalizeIdString(courseId);
                    if (!normalizedCourseId) {
                      return Promise.resolve(null);
                    }

                    const selection =
                      selectionMap[normalizedCourseId] ||
                      selectionMap[Number(normalizedCourseId)] ||
                      {};

                    const payload = {
                      StudentID: toApiId(userId),
                      CourseID: toApiId(normalizedCourseId),
                      EnrollmentDate: defaultEnrollmentDate,
                      IsActive: true,
                    };

                    if (selection.subjectId) {
                      payload.SubjectID = toApiId(selection.subjectId);
                    }
                    if (selection.courseSubjectId) {
                      payload.CourseSubjectID = toApiId(
                        selection.courseSubjectId
                      );
                    }

                    return createEnrollment(payload);
                  })
                );

                const failures = creationResults.filter(
                  (result) => result.status === "rejected"
                );

                if (failures.length) {
                  const reason = failures[0]?.reason;
                  throw new Error(
                    reason?.message ||
                      "Failed to enroll the student in the selected class."
                  );
                }
              }

              // 🔹 Remove extra old enrollments when desired count is smaller
              for (const entry of toRemove) {
                if (entry.enrollmentId != null) {
                  await deleteEnrollment(entry.enrollmentId);
                }
              }
            } catch (enSyncErr) {
              console.error("Failed to sync student enrollments", enSyncErr);
              setFormError(
                enSyncErr?.message ||
                  "Updated student, but failed to sync enrollments"
              );
            }

            // const desired = (userData.StudentCourseIDs || [])
            //   .map((value) => normalizeIdString(value))
            //   .filter((value) => value !== null);
            // try {
            //   const enrollmentList = await getEnrollmentsByStudent(userId);
            //   const selectionMap =
            //     studentCourseClassSelectionsRef.current || {};

            //   const currentEnrollments = (enrollmentList || []).map(
            //     (enrollment) => {
            //       const courseId = normalizeIdString(
            //         enrollment.CourseID ??
            //           enrollment.courseID ??
            //           enrollment.raw?.CourseID ??
            //           enrollment.raw?.courseID
            //       );

            //       const enrollmentId =
            //         enrollment.EnrollmentID ??
            //         enrollment.enrollmentID ??
            //         enrollment.id ??
            //         enrollment.Id ??
            //         enrollment.raw?.EnrollmentID ??
            //         enrollment.raw?.enrollmentID ??
            //         null;

            //       return {
            //         enrollment,
            //         courseId,
            //         enrollmentId,
            //       };
            //     }
            //   );

            //   const currentEnrollmentMap = new Map();
            //   const duplicateEnrollments = [];
            //   currentEnrollments.forEach((entry) => {
            //     if (!entry.courseId) {
            //       if (entry.enrollmentId != null) {
            //         duplicateEnrollments.push(entry);
            //       }
            //       return;
            //     }

            //     if (currentEnrollmentMap.has(entry.courseId)) {
            //       if (entry.enrollmentId != null) {
            //         duplicateEnrollments.push(entry);
            //       }
            //       return;
            //     }

            //     currentEnrollmentMap.set(entry.courseId, entry);
            //   });

            //   const desiredSet = new Set(desired);

            //   const toCreate = [];
            //   const toUpdate = [];

            //   desiredSet.forEach((courseId) => {
            //     if (!courseId) {
            //       return;
            //     }

            //     const existing = currentEnrollmentMap.get(courseId);
            //     if (existing) {
            //       toUpdate.push(existing);
            //     } else {
            //       toCreate.push(courseId);
            //     }
            //   });

            //   const toRemove = (() => {
            //     const flagged = new Map();

            //     duplicateEnrollments.forEach((entry) => {
            //       if (entry.enrollmentId != null) {
            //         flagged.set(entry.enrollmentId, entry);
            //       }
            //     });

            //     currentEnrollments.forEach((entry) => {
            //       if (
            //         entry.courseId &&
            //         !desiredSet.has(entry.courseId) &&
            //         entry.enrollmentId != null
            //       ) {
            //         flagged.set(entry.enrollmentId, entry);
            //       }
            //     });

            //     return Array.from(flagged.values());
            //   })();

            //   if (toUpdate.length) {
            //     const updateResults = await Promise.allSettled(
            //       toUpdate.map((entry) => {
            //         if (!entry.enrollmentId) {
            //           return Promise.resolve(null);
            //         }

            //         const selection = selectionMap[entry.courseId] || {};

            //         const subjectCandidates = [
            //           selection.subjectId,
            //           entry.enrollment.SubjectID,
            //           entry.enrollment.subjectID,
            //           entry.enrollment.raw?.SubjectID,
            //           entry.enrollment.raw?.subjectID,
            //         ].map((candidate) => normalizeIdString(candidate));

            //         const courseSubjectCandidates = [
            //           selection.courseSubjectId,
            //           entry.enrollment.CourseSubjectID,
            //           entry.enrollment.courseSubjectID,
            //           entry.enrollment.raw?.CourseSubjectID,
            //           entry.enrollment.raw?.courseSubjectID,
            //         ].map((candidate) => normalizeIdString(candidate));

            //         const resolvedSubjectId = subjectCandidates.find(Boolean);
            //         const resolvedCourseSubjectId =
            //           courseSubjectCandidates.find(Boolean);

            //         const enrollmentDateValue =
            //           userData.EnrollmentDate ||
            //           entry.enrollment.EnrollmentDate ||
            //           entry.enrollment.raw?.EnrollmentDate ||
            //           entry.enrollment.raw?.enrollmentDate ||
            //           new Date().toISOString();

            //         const payload = {
            //           EnrollmentID: toApiId(entry.enrollmentId),
            //           StudentID: toApiId(userId),
            //           CourseID: toApiId(entry.courseId),
            //           EnrollmentDate: enrollmentDateValue,
            //           IsActive:
            //             entry.enrollment.IsActive ??
            //             entry.enrollment.isActive ??
            //             true,
            //         };

            //         if (resolvedSubjectId) {
            //           payload.SubjectID = toApiId(resolvedSubjectId);
            //         }

            //         if (resolvedCourseSubjectId) {
            //           payload.CourseSubjectID = toApiId(
            //             resolvedCourseSubjectId
            //           );
            //         }

            //         return updateEnrollment(entry.enrollmentId, payload);
            //       })
            //     );

            //     const failedUpdate = updateResults.find(
            //       (result) => result.status === "rejected"
            //     );

            //     if (failedUpdate) {
            //       const reason = failedUpdate.reason;
            //       throw new Error(
            //         reason?.message ||
            //           "Failed to update existing course enrollment."
            //       );
            //     }
            //   }

            //   if (toCreate.length) {
            //     const withClass = [];
            //     const withoutClass = [];

            //     toCreate.forEach((courseId) => {
            //       const selection = selectionMap[courseId];
            //       if (selection && selection.subjectId) {
            //         withClass.push({ courseId, selection });
            //       } else {
            //         withoutClass.push(courseId);
            //       }
            //     });

            //     const defaultEnrollmentDate =
            //       userData.EnrollmentDate || new Date().toISOString();

            //     if (withClass.length) {
            //       const creationResults = await Promise.allSettled(
            //         withClass.map(({ courseId, selection }) => {
            //           const payload = {
            //             StudentID: toApiId(userId),
            //             CourseID: toApiId(courseId),
            //             SubjectID: toApiId(selection.subjectId),
            //             EnrollmentDate: defaultEnrollmentDate,
            //             IsActive: true,
            //           };

            //           if (selection.courseSubjectId) {
            //             payload.CourseSubjectID = toApiId(
            //               selection.courseSubjectId
            //             );
            //           }

            //           return createEnrollment(payload);
            //         })
            //       );

            //       const failures = creationResults.filter(
            //         (result) => result.status === "rejected"
            //       );

            //       if (failures.length) {
            //         const reason = failures[0]?.reason;
            //         throw new Error(
            //           reason?.message ||
            //             "Failed to enroll the student in the selected class."
            //         );
            //       }
            //     }

            //     if (withoutClass.length) {
            //       if (withoutClass.length) {
            //         await Promise.all(
            //           withoutClass.map((courseId) =>
            //             createEnrollment({
            //               StudentID: toApiId(userId),
            //               CourseID: toApiId(courseId),
            //               EnrollmentDate: defaultEnrollmentDate,
            //               IsActive: true,
            //             })
            //           )
            //         );
            //       }
            //     }
            //   }

            //   for (const { enrollmentId } of toRemove) {
            //     if (enrollmentId != null) {
            //       await deleteEnrollment(enrollmentId);
            //     }
            //   }
            // } catch (enSyncErr) {
            //   console.error("Failed to sync student enrollments", enSyncErr);
            //   setFormError(
            //     enSyncErr?.message ||
            //       "Updated student, but failed to sync enrollments"
            //   );
            // }
          } else if (typeId === "2") {
            await updateTeacher(userId, {
              TeacherID: userId,
              EmployeeID: userData.EmployeeID,
              Department: userData.Department,
              Qualification: userData.Qualification,
              JoiningDate: userData.JoiningDate,
              Bio: userData.Bio,
            });
            const desired = (userData.CourseIDs || [])
              .map((v) => Number(v))
              .filter((n) => !isNaN(n));
            try {
              const existing = await getTeacherCourses(userId);
              const currentIds = (existing || [])
                .map((c) => Number(c.id ?? c.CourseID ?? c.courseId))
                .filter((n) => !isNaN(n));
              const toAssign = desired.filter(
                (cid) => !currentIds.includes(cid)
              );
              const toUnassign = currentIds.filter(
                (cid) => !desired.includes(cid)
              );
              for (const cid of toAssign) {
                await updateCourse(cid, { TeacherID: userId });
              }
              for (const cid of toUnassign) {
                await updateCourse(cid, { TeacherID: null });
              }
            } catch (tcErr) {
              console.error("Failed to sync teacher courses", tcErr);
              setFormError(
                tcErr?.message ||
                  "Updated teacher, but failed to sync assigned courses"
              );
            }
          }
        } catch (roleErr) {
          console.error("Failed to update role-specific data", roleErr);
          setFormError(
            roleErr?.message ||
              "User updated, but failed to update role-specific details"
          );
        }

        // Update users list with the latest data from selectedUser (which has profile pic updates from step 1)
        setUsers(
          users.map((user) => {
            const currentUserId = user.UserID || user.id;
            const updatedUserId = selectedUser.UserID || selectedUser.id;
            return currentUserId === updatedUserId ? selectedUser : user;
          })
        );

        setShowModal(false);
        setSelectedUser(null);
        setForceUserType(null);
        setEditStep(1);
        setStudentCourseClassSelections({});
      }

      setShowModal(false);
      setSelectedUser(null);
      setForceUserType(null);
      setStudentCourseClassSelections({});
    } catch (error) {
      console.error("Error saving user:", error);
      setFormError(error.message || "Failed to save user");
    }
  };

  const handleDeleteUser = async (userID) => {
    try {
      setFormError("");
      // Optional: confirm before delete
      // eslint-disable-next-line no-restricted-globals
      const ok = window.confirm("Are you sure you want to delete this user?");
      if (!ok) return;
      await deleteUser(userID);
      setUsers((prev) => prev.filter((u) => (u.UserID || u.id) !== userID));
    } catch (err) {
      console.error("Failed to delete user", err);
      setFormError(err?.message || "Failed to delete user");
    }
  };

  const handleActivateUser = async (userID) => {
    try {
      setFormError("");
      // call API to set IsActive = true
      const updated = await updateUser(userID, { IsActive: true });
      setUsers((prev) =>
        prev.map((u) => {
          const id = u.UserID || u.id || u.userID || u.userId || null;
          const updatedId =
            updated.UserID || updated.id || updated.userID || updated.userId;
          return String(id) === String(updatedId) ? updated : u;
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
      // call API to set IsActive = false
      const updated = await updateUser(userID, { IsActive: false });
      setUsers((prev) =>
        prev.map((u) => {
          const id = u.UserID || u.id || u.userID || u.userId || null;
          const updatedId =
            updated.UserID || updated.id || updated.userID || updated.userId;
          return String(id) === String(updatedId) ? updated : u;
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

  // When admin is viewing students filtered by a course, allow removing (deactivating)
  // the enrollment rather than the user record itself.
  const handleRemoveEnrollmentFromCourse = async (userID) => {
    try {
      setFormError("");
      const courseId = courseFilterParam;
      if (!courseId) {
        setToastMessage("No course selected for removal.");
        setToastType("error");
        return;
      }

      // Find enrollment for this student in the course
      const enrollments = await getEnrollmentsByStudent(userID);
      const enrollment = (enrollments || []).find(
        (e) => String(e.CourseID) === String(courseId)
      );

      if (!enrollment) {
        setToastMessage("Enrollment record not found for this student.");
        setToastType("error");
        return;
      }

      const ok = window.confirm(
        "Remove this student from the course? They will be marked inactive."
      );
      if (!ok) return;

      await setEnrollmentActiveStatus(
        enrollment.EnrollmentID ?? enrollment.id ?? enrollment.enrollmentID,
        false,
        {
          StudentID: userID,
          CourseID: courseId,
        }
      );

      // Remove from the filtered set so it disappears from the course-specific view
      setFilteredStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(String(userID));
        return next;
      });

      setToastMessage("Enrollment removed from course.");
      setToastType("success");
    } catch (err) {
      console.error("Failed to remove enrollment", err);
      setToastMessage(err?.message || "Failed to remove enrollment.");
      setToastType("error");
    }
  };

  const handleReactivateEnrollmentFromCourse = async (userID) => {
    try {
      setFormError("");
      const courseId = courseFilterParam;
      if (!courseId) {
        setToastMessage("No course selected for activation.");
        setToastType("error");
        return;
      }

      const enrollments = await getEnrollmentsByStudent(userID);
      const enrollment = (enrollments || []).find(
        (e) => String(e.CourseID) === String(courseId)
      );

      if (!enrollment) {
        setToastMessage("Enrollment record not found for this student.");
        setToastType("error");
        return;
      }

      await setEnrollmentActiveStatus(
        enrollment.EnrollmentID ?? enrollment.id ?? enrollment.enrollmentID,
        true,
        {
          StudentID: userID,
          CourseID: courseId,
        }
      );

      // Add back to filtered set so it shows in the course-specific view
      setFilteredStudentIds((prev) => {
        const next = new Set(prev);
        next.add(String(userID));
        return next;
      });

      setToastMessage("Enrollment reactivated for course.");
      setToastType("success");
    } catch (err) {
      console.error("Failed to reactivate enrollment", err);
      setToastMessage(err?.message || "Failed to reactivate enrollment.");
      setToastType("error");
    }
  };

  const handleEditUser = async (userID, opts = {}) => {
    const mode = opts && opts.mode === "add" ? "add" : "edit";
    setEditMode(mode);
    try {
      setEditLoading(true);
      setFormError("");
      setSelectedUser(null);

      const user = await getUserById(userID);
      setSelectedUser(user);
      setEditStep(1);
      setForceUserType(null);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      const fallbackUser = users.find((u) => (u.UserID || u.id) === userID);
      if (fallbackUser) {
        setSelectedUser(fallbackUser);
        setEditStep(1);
        setForceUserType(null);
        setShowModal(true);
      } else {
        setFormError("Failed to fetch user details. Please try again.");
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddUser = () => {
    resetPendingStudentFlow();
    setShowCoursePicker(false);
    setSelectedUser(null);
    setShowModal(true);
    setFormError("");
  };

  const openCreateFor = (typeId) => {
    // Initialize 2-step create flow
    resetPendingStudentFlow();
    setForceUserType(typeId);
    setSelectedUser(null);
    setFormError("");
    setInitialCourseSelection([]);
    setPendingCreateCore(null);
    setCreateStep(1);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormError("");
    setForceUserType(null);
    setEditStep(1);
    setCreateStep(1);
    setPendingCreateCore(null);
    resetPendingStudentFlow();
    setShowCoursePicker(false);
    setEditMode("edit");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const isEditingStudentFlow =
    Boolean(selectedUser) &&
    String(
      forceUserType ??
        selectedUser.UserTypeID ??
        selectedUser.userTypeID ??
        selectedUser.UserType ??
        selectedUser.userType ??
        ""
    ) === "3";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          User Management
        </h1>
      </div>

      {editLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Loading user details...
            </span>
          </div>
        </div>
      )}

      {/* Tabs for filtering users by role */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: "all", label: "All", icon: FiUsers },
            { key: "admins", label: "Admins", icon: FiShield },
            { key: "teachers", label: "Teachers", icon: FiUserCheck },
            { key: "students", label: "Students", icon: FiUser },
          ].map((tab) => {
            const Icon = tab.icon;
            const count = getCountForTab(users, tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                title={`${tab.label} (${count})`}
                className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all transform focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-indigo-600 dark:bg-gray-700 dark:text-indigo-300"
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="truncate">
                  <span className="block leading-tight">{tab.label}</span>
                </span>
                <span
                  className={`ml-auto text-xs font-medium ${
                    isActive
                      ? "text-white/90"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full ${
                      isActive ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter users by active tab and show role-specific add button */}
      {(() => {
        const filtered = filterUsersByTab(users, activeTab);
        // If admin was navigated here with a course filter, further narrow student list
        const displayUsers =
          activeTab === "students" &&
          filteredStudentIds &&
          filteredStudentIds.size
            ? filtered.filter((u) => {
                const sid = u.UserID ?? u.id ?? u.userID ?? u.userId ?? null;
                return sid && filteredStudentIds.has(String(sid));
              })
            : filtered;

        const sortedUsers = sortUsers(displayUsers, sortOption);

        const addButton = (() => {
          if (activeTab === "admins") {
            return (
              <button
                onClick={() => openCreateFor(1)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                + Add Admin
              </button>
            );
          }

          if (activeTab === "teachers") {
            return (
              <button
                onClick={() => openCreateFor(2)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                + Add Teacher
              </button>
            );
          }

          if (activeTab === "students") {
            return (
              <button
                onClick={() => openCreateFor(3)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                + Add Student
              </button>
            );
          }

          return null;
        })();

        return (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="user-sort"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Sort by
                </label>
                <select
                  id="user-sort"
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {addButton && (
                <div className="flex justify-start sm:justify-end w-full sm:w-auto">
                  {addButton}
                </div>
              )}
            </div>

            {/* Members tab (Active / Inactive) */}
            {(() => {
              const isActiveFlag = (u) =>
                Boolean(u?.IsActive ?? u?.isActive ?? true);

              const activeUsers = (sortedUsers || []).filter(isActiveFlag);
              const inactiveUsers = (sortedUsers || []).filter(
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
                        title={`Active (${activeUsers.length})`}
                      >
                        Active{" "}
                        <span className="ml-2 text-xs">
                          ({activeUsers.length})
                        </span>
                      </button>

                      <button
                        onClick={() => setMembersTab("inactive")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          membersTab === "inactive"
                            ? "bg-indigo-600 text-white"
                            : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                        title={`Inactive (${inactiveUsers.length})`}
                      >
                        Inactive{" "}
                        <span className="ml-2 text-xs">
                          ({inactiveUsers.length})
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    {membersTab === "active" ? (
                      <UserList
                        users={activeUsers}
                        onEdit={handleEditUser}
                        onAddStudent={handleEditUser}
                        onActivate={handleActivateUser}
                        onDeactivate={handleDeactivateUser}
                      />
                    ) : (
                      <UserList
                        users={inactiveUsers}
                        onEdit={handleEditUser}
                        onAddStudent={handleEditUser}
                        onActivate={handleActivateUser}
                        onDeactivate={handleDeactivateUser}
                      />
                    )}
                  </div>
                </>
              );
            })()}

            <CoursePickerModal
              isOpen={showCoursePicker}
              onClose={handleCoursePickerClose}
              initialSelected={initialCourseSelection}
              title={
                pendingUserData
                  ? "Select Course for Student"
                  : "Select Courses for Teacher"
              }
              description={
                pendingUserData
                  ? "Choose the course to enroll the new student in."
                  : "Select one or more courses to assign to the new teacher."
              }
              multiSelect={pendingUserData ? false : true}
              allowCreate={true}
              // when enrolling a pending student, hide courses already passed in (if any)
              excludedIds={pendingUserData?.CourseIDs || []}
              saving={coursePickerSaving || creationSaving}
              errorMessage={coursePickerError}
              onProceed={async (selectedIds) => {
                const ids = (selectedIds || [])
                  .map((id) => String(id))
                  .filter(Boolean);

                if (!pendingUserData) {
                  setInitialCourseSelection(ids);
                  setShowCoursePicker(false);
                  setShowModal(true);
                  return;
                }

                setPendingCourseSelection(ids);

                if (!ids.length) {
                  setCoursePickerError("Select a course before continuing.");
                  return;
                }

                setCoursePickerError("");
                setCoursePickerSaving(true);
                setClassPickerLoading(true);
                setClassPickerError("");

                try {
                  const primaryCourseId = ids[0] ?? null;
                  const { options, courseName } =
                    await loadClassOptionsForCourse(primaryCourseId);

                  setClassOptions(options);
                  setClassSelection(
                    options.length === 1 ? [String(options[0].id)] : []
                  );
                  setClassPickerCourseName(courseName || "");
                  setClassPickerContext({
                    mode: "create-student",
                    courseId: primaryCourseId,
                    multiSelect: false,
                  });
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
              }}
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
              saving={
                classPickerContext?.mode === "create-student"
                  ? creationSaving
                  : false
              }
              loading={classPickerLoading}
              errorMessage={classPickerError}
              multiSelect={Boolean(classPickerContext?.multiSelect) || false}
              requireSelection={classOptions.length > 0}
              proceedLabel={
                classPickerContext?.mode === "edit-student-course"
                  ? "Save Selection"
                  : "Create Student"
              }
              cancelLabel={
                classPickerContext?.mode === "edit-student-course"
                  ? "Cancel"
                  : "Back"
              }
              onProceed={handleClassPickerProceed}
            />
            {/* Post-create teacher course assignment modal */}
            <CoursePickerModal
              isOpen={showAssignTeacherCourses}
              onClose={() => {
                setShowAssignTeacherCourses(false);
                setNewTeacherIdForAssignment(null);
              }}
              // show all existing courses for assignment (new teachers won't
              // have any teacher-scoped courses yet)
              teacherId={newTeacherIdForAssignment}
              scopeToTeacher={false}
              initialSelected={[]}
              title="Assign Courses to New Teacher"
              description="Select one or more courses to assign to the newly created teacher."
              multiSelect={true}
              allowCreate={true}
              // Only allow creating a new course in this post-create flow
              // (admins cannot pick from existing courses per requested behavior)
              onlyCreate={true}
              onProceed={async (selectedIds) => {
                const ids = (selectedIds || []).map((id) =>
                  isNaN(Number(id)) ? id : Number(id)
                );
                const teacherId = newTeacherIdForAssignment;
                // if (teacherId && ids.length) {
                //   try {
                //     for (const cid of ids) {
                //       await updateCourse(cid, { TeacherID: teacherId });
                //     }
                //     // Refresh users list to reflect assignments
                //     try {
                //       const all = await getAllUsers();
                //       setUsers(all);
                //     } catch (_) {
                //       // non-fatal
                //     }
                //     setToastMessage("Assigned courses to the new teacher.");
                //     setToastType("success");
                //   } catch (assignErr) {
                //     console.error(
                //       "Failed to assign selected courses to teacher",
                //       assignErr
                //     );
                //     setFormError(
                //       assignErr?.message ||
                //         "Teacher created, but failed to assign selected courses"
                //     );
                //     setToastMessage("Failed to assign selected courses.");
                //     setToastType("error");
                //   }
                // }
                setShowAssignTeacherCourses(false);
                setNewTeacherIdForAssignment(null);
              }}
            />
          </>
        );
      })()}

      {/* <AnimatePresence>
        {showModal && (
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
                  {editMode === "add"
                    ? "Add Enrolled Courses"
                    : selectedUser
                    ? "Edit User"
                    : "Create New User"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 px-4 py-3">
                  {formError}
                </div>
              )}

              <div className="p-4">
                <UserForm
                  onSubmit={handleUserSubmit}
                  user={selectedUser}
                  loading={editLoading}
                  userTypes={[
                    { id: 1, name: "Admin" },
                    { id: 2, name: "Teacher" },
                    { id: 3, name: "Student" },
                  ]}
                  forceUserType={forceUserType}
                  initialCourseSelection={initialCourseSelection}
                  showCoreFields={
                    Boolean(selectedUser) ? editStep === 1 : createStep === 1
                  }
                  showRoleFields={
                    Boolean(selectedUser) ? editStep === 2 : createStep === 2
                  }
                  onStudentCourseSelectionChange={
                    isEditingStudentFlow
                      ? handleStudentCourseSelectionChange
                      : undefined
                  }
                  showEnrolledOnly={editMode === "add"}
                  submitLabel={
                    selectedUser
                      ? editStep === 1
                        ? "Next"
                        : editMode === "add"
                        ? "Add"
                        : "Update"
                      : // Creating a new user: if forced to Admin (via + Add Admin),
                      // show "Save" on the first step instead of "Next".
                      createStep === 1
                      ? forceUserType === 1
                        ? "Save"
                        : "Next"
                      : "Create"
                  }
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence> */}
      <AnimatePresence>
        {showModal && (
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
                    : selectedUser
                    ? "Edit User"
                    : "Create New User"}
                </h2>
                <button
                  onClick={closeModal}
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
                  onSubmit={handleUserSubmit}
                  user={selectedUser}
                  loading={editLoading}
                  userTypes={[
                    { id: 1, name: "Admin" },
                    { id: 2, name: "Teacher" },
                    { id: 3, name: "Student" },
                  ]}
                  forceUserType={forceUserType}
                  initialCourseSelection={initialCourseSelection}
                  showCoreFields={
                    Boolean(selectedUser) ? editStep === 1 : createStep === 1
                  }
                  showRoleFields={
                    Boolean(selectedUser) ? editStep === 2 : createStep === 2
                  }
                  showEnrolledOnly={editMode === "add"}
                  submitLabel={
                    selectedUser
                      ? editStep === 1
                        ? "Next"
                        : "Update"
                      : createStep === 1
                      ? forceUserType === 1
                        ? "Save"
                        : "Next"
                      : "Create"
                  }
                  onStudentCourseSelectionChange={
                    isEditingStudentFlow
                      ? handleStudentCourseSelectionChange
                      : undefined
                  }
                  // 🔹 NEW: used by handleSaveEnrolledCourses to get SubjectID per course
                  resolveEnrollmentSelection={(courseId) => {
                    const map = studentCourseClassSelectionsRef.current || {};
                    const keyStr = String(courseId);
                    return map[keyStr] ?? map[Number(keyStr)] ?? null;
                  }}
                  onCancel={() => {
                    setShowModal(false);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toastMessage ? (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      ) : null}
    </div>
  );
};

// Toast rendering (placed here so it can access users page state via closure)
const ToastWrapper = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <Toast message={message} type={type} duration={3000} onClose={onClose} />
  );
};

const getUserFullName = (user) => {
  if (!user || typeof user !== "object") {
    return "";
  }

  const first = ((user.FirstName ?? user.firstName) || "").toString().trim();
  const last = ((user.LastName ?? user.lastName) || "").toString().trim();
  const full = `${first} ${last}`.trim();
  if (full) {
    return full;
  }

  const username = ((user.Username ?? user.username) || "").toString().trim();
  if (username) {
    return username;
  }

  return ((user.Email ?? user.email) || "").toString().trim();
};

const parseTimestamp = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizeNumeric = (num) => {
    if (!Number.isFinite(num)) {
      return null;
    }
    if (num > 1e12) {
      return num;
    }
    if (num > 1e9) {
      return num * 1000;
    }
    return null;
  };

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }

  if (typeof value === "number") {
    return normalizeNumeric(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const dotNet = trimmed.match(/Date\((\d+)\)/i);
    if (dotNet && dotNet[1]) {
      const asNumber = Number(dotNet[1]);
      return normalizeNumeric(asNumber) ?? asNumber;
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return normalizeNumeric(numeric);
    }

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const getUserCreationTime = (user) => {
  if (!user || typeof user !== "object") {
    return 0;
  }

  const raw = user.raw && typeof user.raw === "object" ? user.raw : null;
  const creationKeys = [
    "CreatedAt",
    "createdAt",
    "CreatedDate",
    "createdDate",
    "CreatedOn",
    "createdOn",
    "DateCreated",
    "dateCreated",
    "RegistrationDate",
    "registrationDate",
    "RegisteredAt",
    "registeredAt",
    "Created",
    "created",
    "InsertDate",
    "insertDate",
  ];

  const timestamps = [];
  creationKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(user, key)) {
      const parsed = parseTimestamp(user[key]);
      if (parsed !== null) {
        timestamps.push(parsed);
      }
    }
    if (raw && Object.prototype.hasOwnProperty.call(raw, key)) {
      const parsed = parseTimestamp(raw[key]);
      if (parsed !== null) {
        timestamps.push(parsed);
      }
    }
  });

  if (raw && typeof raw === "object") {
    const audit = raw.Audit && typeof raw.Audit === "object" ? raw.Audit : null;
    if (audit) {
      const parsed = parseTimestamp(audit.CreatedAt ?? audit.createdAt);
      if (parsed !== null) {
        timestamps.push(parsed);
      }
    }
  }

  if (timestamps.length) {
    return Math.max(...timestamps);
  }

  const idCandidates = [
    user.UserID,
    user.userID,
    user.userId,
    user.id,
    raw?.UserID,
    raw?.userID,
    raw?.userId,
    raw?.id,
  ];

  for (const candidate of idCandidates) {
    const asNumber = Number(candidate);
    if (!Number.isNaN(asNumber) && asNumber !== 0) {
      return asNumber;
    }
  }

  return 0;
};

const sortUsers = (users, sortOption) => {
  if (!Array.isArray(users)) {
    return [];
  }

  const copy = [...users];

  switch (sortOption) {
    case "oldest":
      copy.sort((a, b) => getUserCreationTime(a) - getUserCreationTime(b));
      break;
    case "nameAsc":
      copy.sort((a, b) => {
        const nameA = getUserFullName(a);
        const nameB = getUserFullName(b);
        return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      });
      break;
    case "nameDesc":
      copy.sort((a, b) => {
        const nameA = getUserFullName(a);
        const nameB = getUserFullName(b);
        return nameB.localeCompare(nameA, undefined, { sensitivity: "base" });
      });
      break;
    case "newest":
    default:
      copy.sort((a, b) => getUserCreationTime(b) - getUserCreationTime(a));
      break;
  }

  return copy;
};

// Helper: returns filtered users array based on selected tab
const filterUsersByTab = (users, tabKey) => {
  if (!users || users.length === 0) return [];
  switch (tabKey) {
    case "admins":
      return users.filter(
        (u) =>
          String(u.UserTypeID || u.userTypeID || u.UserType || u.userType) ===
            "1" || String(u.userType)?.toLowerCase?.() === "admin"
      );
    case "teachers":
      return users.filter(
        (u) =>
          String(u.UserTypeID || u.userTypeID || u.UserType || u.userType) ===
            "2" || String(u.userType)?.toLowerCase?.() === "teacher"
      );
    case "students":
      return users.filter(
        (u) =>
          String(u.UserTypeID || u.userTypeID || u.UserType || u.userType) ===
            "3" || String(u.userType)?.toLowerCase?.() === "student"
      );
    case "all":
    default:
      return users;
  }
};

// Helper: count users for a tab
const getCountForTab = (users, tabKey) =>
  filterUsersByTab(users, tabKey).length;

export default AdminUsers;
