import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Fragment,
} from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCourseDetails,
  updateCourse,
  getTeacherCourseStudents,
  getTeacherStudents,
  deactivateCourse,
} from "../../services/courseService";
import { reactivateCourse } from "../../services/courseService";
import { getCourseStudents } from "../../services/courseService";
import { getCourseMaterials } from "../../services/materialService";
import { getCourseAttendance } from "../../services/attendanceService";
import { getUserById } from "../../services/userService";
import MaterialList from "../materials/MaterialList";
import AttendanceList from "../attendance/AttendanceList";

// import Modal from "../common/Modal";

import Modal from "../common/Modal2";

import StudentPickerModal from "../common/StudentPickerModal";
import CourseForm from "./CourseForm";
import TeacherClassStatsPanel from "./TeacherClassStatsPanel";
import StudentClassStatsPanel from "./StudentClassStatsPanel";
import MaterialForm from "../materials/MaterialForm";
import QRGenerator from "../attendance/QRGenerator";
import Loader from "../common/Loader";
import Button from "../common/Button";
import UserForm from "../users/UserForm";
import Avatar from "../common/Avatar";
import {
  createSubject,
  updateSubject,
  getAllSubjects,
  getStudentsBySubject,
} from "../../services/subjectService";
import {
  createEnrollment,
  createEnrollmentsForStudent,
  setEnrollmentActiveStatus,
} from "../../services/enrollmentService";
import { createStudent } from "../../services/studentService";
import { createUser } from "../../services/userService";
import Toast from "../common/Toast";

// Icons
import {
  FiPlus,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiX,
  FiSearch,
  FiCheckCircle,
  FiBook,
  FiLayers,
  FiChevronRight,
  FiEdit,
  FiTrash2,
  FiRefreshCw,
} from "react-icons/fi";

const CourseView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [addingStudents, setAddingStudents] = useState(false);
  const [studentActionError, setStudentActionError] = useState("");
  const [studentsRefreshCounter, setStudentsRefreshCounter] = useState(0);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [pendingRegisterCore, setPendingRegisterCore] = useState(null);
  const [registerSelectedSubjectIds, setRegisterSelectedSubjectIds] = useState(
    []
  );
  const [registerSubjectError, setRegisterSubjectError] = useState("");
  const [showStudentMenu, setShowStudentMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [studentTab, setStudentTab] = useState("active");
  const [enrollmentLoadingMap, setEnrollmentLoadingMap] = useState({});
  const [subjectStudentGroups, setSubjectStudentGroups] = useState([]);
  const [selectedSubjectTab, setSelectedSubjectTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const [showAlert, setShowAlert] = useState(false);
  const [selectedClassKey, setSelectedClassKey] = useState(null);
  const [isClassStatsOpen, setIsClassStatsOpen] = useState(false);

  // Ref for student menu wrapper to detect outside clicks
  const studentMenuRef = useRef(null);

  const isStudentUser = user?.userType === "student";

  const studentIdentifierValues = useMemo(() => {
    if (!user || typeof user !== "object") {
      return [];
    }

    const collected = new Set();

    const push = (value) => {
      if (value === undefined || value === null) return;
      const str = String(value).trim();
      if (str) {
        collected.add(str);
      }
    };

    push(user.StudentID ?? user.studentID ?? user.studentId);
    push(user.UserID ?? user.userID ?? user.userId ?? user.id);

    const studentProfile = user.Student ?? user.student ?? null;
    if (studentProfile && typeof studentProfile === "object") {
      push(
        studentProfile.StudentID ??
          studentProfile.studentID ??
          studentProfile.studentId ??
          studentProfile.id
      );

      const nestedStudentUser =
        studentProfile.User ?? studentProfile.user ?? null;
      if (nestedStudentUser && typeof nestedStudentUser === "object") {
        push(
          nestedStudentUser.UserID ??
            nestedStudentUser.userID ??
            nestedStudentUser.userId ??
            nestedStudentUser.id
        );
      }
    }

    const nestedUser = user.User ?? user.user ?? null;
    if (nestedUser && typeof nestedUser === "object") {
      push(
        nestedUser.UserID ??
          nestedUser.userID ??
          nestedUser.userId ??
          nestedUser.id
      );
    }

    return Array.from(collected);
  }, [user]);

  const normalizeIdString = useCallback((value) => {
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
  }, []);

  const normalizedCourseId = useMemo(() => {
    const candidates = [
      course?.id,
      course?.CourseID,
      course?.courseID,
      course?.CourseId,
      course?.courseId,
      course?.course?.id,
      course?.Course?.id,
      id,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeIdString(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }, [
    course?.Course?.id,
    course?.CourseID,
    course?.CourseId,
    course?.course?.id,
    course?.courseID,
    course?.courseId,
    course?.id,
    id,
    normalizeIdString,
  ]);

  useEffect(() => {
    if (!showRegisterModal) {
      setRegisterStep(1);
      setPendingRegisterCore(null);
      setRegisterSelectedSubjectIds([]);
      setRegisterSubjectError("");
    }
  }, [showRegisterModal]);

  const normalizedCourseSubjectIdSet = useMemo(() => {
    const set = new Set();

    const pushCandidate = (candidate) => {
      if (candidate === null || candidate === undefined) {
        return;
      }

      if (Array.isArray(candidate)) {
        candidate.forEach(pushCandidate);
        return;
      }

      if (typeof candidate === "object") {
        const fields = [
          candidate.SubjectID,
          candidate.subjectID,
          candidate.SubjectId,
          candidate.subjectId,
          candidate.SubjectIDs,
          candidate.subjectIDs,
          candidate.SubjectIds,
          candidate.subjectIds,
          candidate.id,
          candidate.Id,
        ];

        fields.forEach((value) => {
          if (value === undefined || value === null) {
            return;
          }
          if (Array.isArray(value) || typeof value === "object") {
            pushCandidate(value);
            return;
          }
          const normalized = normalizeIdString(value);
          if (normalized) {
            set.add(normalized);
          }
        });
        return;
      }

      const normalized = normalizeIdString(candidate);
      if (normalized) {
        set.add(normalized);
      }
    };

    if (course && typeof course === "object") {
      const sources = [
        course.subjectIds,
        course.SubjectIDs,
        course.SubjectIds,
        course.subjectIDs,
        course.subjectId,
        course.SubjectID,
        course.SubjectId,
        course.subjectID,
        course.subjectDetails,
        course.SubjectDetails,
        course.subjects,
        course.Subjects,
        course.subjectList,
        course.SubjectList,
      ];

      sources.forEach(pushCandidate);
    }

    return set;
  }, [course, normalizeIdString]);

  const normalizedCourseSubjectNameSet = useMemo(() => {
    const set = new Set();

    const pushName = (candidate) => {
      if (!candidate) {
        return;
      }

      if (Array.isArray(candidate)) {
        candidate.forEach(pushName);
        return;
      }

      if (typeof candidate === "object") {
        const fields = [
          candidate.subjectName,
          candidate.SubjectName,
          candidate.name,
          candidate.Name,
          candidate.title,
          candidate.Title,
          candidate.SubjectTitle,
          candidate.subjectTitle,
        ];

        fields.forEach((value) => {
          if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (normalized) {
              set.add(normalized);
            }
            return;
          }
          if (Array.isArray(value) || typeof value === "object") {
            pushName(value);
          }
        });
        return;
      }

      if (typeof candidate === "string") {
        const normalized = candidate.trim().toLowerCase();
        if (normalized) {
          set.add(normalized);
        }
      }
    };

    if (course && typeof course === "object") {
      const sources = [
        course.subjects,
        course.Subjects,
        course.subjectList,
        course.SubjectList,
        course.subjectNames,
        course.SubjectNames,
        course.subjectDetails,
        course.SubjectDetails,
        course.subject,
        course.Subject,
      ];

      sources.forEach(pushName);
    }

    return set;
  }, [course]);

  const belongsToCurrentCourse = useCallback(
    (entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      let matchesCourse = !normalizedCourseId;

      if (normalizedCourseId) {
        const candidates = [
          entry.CourseID,
          entry.courseID,
          entry.CourseId,
          entry.courseId,
          entry?.Course?.CourseID,
          entry?.Course?.courseID,
          entry?.Course?.CourseId,
          entry?.Course?.courseId,
          entry?.course?.CourseID,
          entry?.course?.courseID,
          entry?.course?.CourseId,
          entry?.course?.courseId,
        ];

        for (const candidate of candidates) {
          const normalized = normalizeIdString(candidate);
          if (normalized && normalized === normalizedCourseId) {
            matchesCourse = true;
            break;
          }
        }

        if (!matchesCourse) {
          return false;
        }
      }

      const subjectIdSetSize = normalizedCourseSubjectIdSet.size;
      const subjectNameSetSize = normalizedCourseSubjectNameSet.size;

      if (subjectIdSetSize === 0 && subjectNameSetSize === 0) {
        return true;
      }

      let hasSubjectInfo = false;

      const subjectIdCandidates = [
        entry.SubjectID,
        entry.subjectID,
        entry.SubjectId,
        entry.subjectId,
        entry.CourseSubjectID,
        entry.courseSubjectID,
        entry.CourseSubjectId,
        entry.courseSubjectId,
        entry?.Subject?.SubjectID,
        entry?.Subject?.subjectID,
        entry?.Subject?.SubjectId,
        entry?.Subject?.subjectId,
        entry?.Subject?.id,
        entry?.Subject?.Id,
        entry?.subject?.SubjectID,
        entry?.subject?.subjectID,
        entry?.subject?.SubjectId,
        entry?.subject?.subjectId,
        entry?.subject?.id,
        entry?.subject?.Id,
      ];

      for (const candidate of subjectIdCandidates) {
        if (candidate === null || candidate === undefined) {
          continue;
        }
        hasSubjectInfo = true;
        const normalized = normalizeIdString(candidate);
        if (normalized && normalizedCourseSubjectIdSet.has(normalized)) {
          return true;
        }
      }

      const subjectNameCandidates = [
        entry.SubjectName,
        entry.subjectName,
        entry.CourseSubjectName,
        entry.courseSubjectName,
        entry?.Subject?.SubjectName,
        entry?.Subject?.subjectName,
        entry?.Subject?.name,
        entry?.Subject?.Name,
        entry?.Subject?.Title,
        entry?.Subject?.title,
        entry?.subject?.SubjectName,
        entry?.subject?.subjectName,
        entry?.subject?.name,
        entry?.subject?.Name,
        entry?.subject?.Title,
        entry?.subject?.title,
      ];

      for (const candidate of subjectNameCandidates) {
        if (typeof candidate !== "string") {
          continue;
        }
        const normalized = candidate.trim().toLowerCase();
        if (!normalized) {
          continue;
        }
        hasSubjectInfo = true;
        if (normalizedCourseSubjectNameSet.has(normalized)) {
          return true;
        }
      }

      if (!hasSubjectInfo) {
        return true;
      }

      return false;
    },
    [
      normalizeIdString,
      normalizedCourseId,
      normalizedCourseSubjectIdSet,
      normalizedCourseSubjectNameSet,
    ]
  );

  const normalizedStatus = course
    ? typeof course.status === "string"
      ? course.status.trim().toLowerCase()
      : typeof course.Status === "string"
      ? course.Status.trim().toLowerCase()
      : null
    : null;

  const isCourseActive = course
    ? course.isActive ??
      course.IsActive ??
      (normalizedStatus === null ? true : normalizedStatus !== "inactive")
    : true;

  const statusBadgeLabel = isCourseActive ? "Active" : "Inactive";

  const statusBadgeClassName = isCourseActive
    ? "px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800"
    : "px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-300/60 dark:bg-gray-800/60 dark:text-gray-300 dark:ring-gray-700";

  // Close student menu when clicking outside of it
  useEffect(() => {
    if (!showStudentMenu) return;

    const handleDocumentClick = (event) => {
      const node = studentMenuRef.current;
      if (!node) return;
      // If the click is outside the menu wrapper, close the menu
      if (!node.contains(event.target)) {
        setShowStudentMenu(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [showStudentMenu]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, materialsData, attendanceData] = await Promise.all([
          getCourseDetails(id),
          getCourseMaterials(id),
          getCourseAttendance(id),
        ]);
        setCourse(courseData);
        setMaterials(materialsData);
        setAttendance(attendanceData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    let isActive = true;

    const resolveTeacherId = (u) => {
      if (!u || typeof u !== "object") return null;
      return (
        u.TeacherID ??
        u.teacherID ??
        u.teacherId ??
        u.UserID ??
        u.userID ??
        u.userId ??
        u.id ??
        null
      );
    };

    const fetchStudents = async () => {
      // Do not fetch or show students when the current user is a student
      if (user?.userType === "student") {
        setStudents([]);
        setStudentsLoading(false);
        setStudentsError(null);
        return;
      }

      if (!user) {
        setStudents([]);
        setStudentsLoading(false);
        setStudentsError(null);
        return;
      }

      setStudentsLoading(true);
      setStudentsError(null);
      try {
        // If the current user is a teacher, prefer teacher endpoints
        if (user?.userType === "teacher") {
          const teacherId = resolveTeacherId(user);
          if (teacherId) {
            try {
              const { students: scopedStudents } =
                await getTeacherCourseStudents(teacherId, id);
              if (!isActive) return;
              setStudents(
                (scopedStudents || []).filter(belongsToCurrentCourse)
              );
              return;
            } catch (err) {
              // fallback to course-scoped students
              console.warn(
                "Teacher route unavailable, falling back to course-scoped students",
                err
              );
            }
          }
        }

        // Admins (and other roles) - fetch students for the course via course-scoped helper
        // Attempt to use the course's assigned teacher (if available) for a more reliable lookup
        const courseTeacherId =
          course?.teacherId ??
          course?.TeacherID ??
          course?.teacherID ??
          course?.TeacherId ??
          null;

        if (courseTeacherId) {
          try {
            const { students: teacherScopedStudents } =
              await getTeacherCourseStudents(courseTeacherId, id);
            if (!isActive) return;
            if (
              Array.isArray(teacherScopedStudents) &&
              teacherScopedStudents.length
            ) {
              setStudents(teacherScopedStudents.filter(belongsToCurrentCourse));
              return;
            }
          } catch (err) {
            console.warn(
              "Teacher-specific course students endpoint unavailable, continuing with course scope",
              err
            );
          }
        }

        try {
          const courseStudents = await getTeacherStudents(id, {
            scope: "course",
          });
          if (!isActive) return;
          const filteredStudents = Array.isArray(courseStudents)
            ? courseStudents.filter((student) => {
                const studentCourseId =
                  student?.CourseID ??
                  student?.courseID ??
                  student?.courseId ??
                  student?.CourseId ??
                  null;
                if (studentCourseId === null || studentCourseId === undefined) {
                  return true;
                }
                return belongsToCurrentCourse({ CourseID: studentCourseId });
              })
            : [];
          setStudents(filteredStudents.filter(belongsToCurrentCourse));

          // Also try the course-specific students endpoint which may include
          // inactive enrollments depending on the backend. Merge results so
          // inactive enrollments are available in the tabs on reload.
          try {
            const courseScoped = await getCourseStudents(id);
            if (!isActive) return;
            if (Array.isArray(courseScoped) && courseScoped.length) {
              // merge and dedupe by enrollment id (preferred) then student id
              const map = new Map();
              const pushEntry = (e) => {
                const enrollId =
                  e?.EnrollmentID ?? e?.enrollmentID ?? e?.enrollmentId ?? null;
                const studentId =
                  e?.StudentID ??
                  e?.studentID ??
                  e?.studentId ??
                  e?.UserID ??
                  e?.userID ??
                  e?.userId ??
                  null;
                const key = enrollId
                  ? `e:${String(enrollId)}`
                  : `s:${String(studentId)}`;
                if (!map.has(key)) {
                  map.set(key, e);
                }
              };

              // first add the already-fetched list so that courseScoped can overwrite
              (filteredStudents || []).forEach(pushEntry);
              courseScoped.forEach(pushEntry);

              const merged = Array.from(map.values()).filter(
                belongsToCurrentCourse
              );
              setStudents(merged);
            }
          } catch (mergeErr) {
            // ignore merge errors; we already have filteredStudents
          }
        } catch (err) {
          console.error("Failed to load course students:", err);
          if (!isActive) return;
          setStudents([]);
          setStudentsError("Unable to load enrolled students.");
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Unexpected error loading students:", err);
        setStudents([]);
        setStudentsError("Unable to load enrolled students.");
      } finally {
        if (isActive) setStudentsLoading(false);
      }
    };

    // Wait until course details have been loaded (ensures course teacher id availability)
    if (loading) {
      setStudentsLoading(true);
      return;
    }

    fetchStudents();

    return () => {
      isActive = false;
    };
  }, [
    id,
    user,
    loading,
    course?.teacherId,
    studentsRefreshCounter,
    belongsToCurrentCourse,
  ]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!course) {
      setSubjectStudentGroups([]);
      return;
    }

    const rawSubjectCandidates = [];

    const appendCandidate = (candidate) => {
      if (candidate === null || candidate === undefined) {
        return;
      }

      if (Array.isArray(candidate)) {
        candidate.forEach((item) => appendCandidate(item));
        return;
      }

      rawSubjectCandidates.push(candidate);
    };

    appendCandidate(course.subjectIds);
    appendCandidate(course.SubjectIDs);
    appendCandidate(course.SubjectIds);
    appendCandidate(course.subjectIDs);
    appendCandidate(course.subjectId);
    appendCandidate(course.subjectID);
    appendCandidate(course.SubjectId);
    appendCandidate(course.SubjectID);
    appendCandidate(course.subjectDetails);
    appendCandidate(course.SubjectDetails);
    appendCandidate(course.subjects);
    appendCandidate(course.Subjects);
    appendCandidate(course.subjectList);
    appendCandidate(course.SubjectList);

    const subjectCandidates = rawSubjectCandidates;

    const normalizeSubjectValue = (value) => {
      if (value === null || value === undefined) return null;

      if (typeof value === "number" && !Number.isNaN(value)) {
        return value;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (/^-?\d+$/.test(trimmed)) {
          const parsed = Number(trimmed);
          if (!Number.isNaN(parsed)) return parsed;
        }
        return null;
      }

      return null;
    };

    const normalizeSubjectCandidate = (candidate) => {
      if (candidate === null || candidate === undefined) return null;

      if (typeof candidate === "object") {
        const possibleFields = [
          candidate.subjectId,
          candidate.SubjectID,
          candidate.SubjectId,
          candidate.subjectID,
          candidate.id,
          candidate.Id,
        ];

        for (const field of possibleFields) {
          const normalized = normalizeSubjectValue(field);
          if (normalized !== null && normalized !== undefined) {
            return normalized;
          }
        }

        return null;
      }

      const normalized = normalizeSubjectValue(candidate);
      if (normalized !== null && normalized !== undefined) {
        return normalized;
      }

      return null;
    };

    const normalizedSubjectIds = Array.from(
      new Set(
        subjectCandidates
          .map((candidate) => normalizeSubjectCandidate(candidate))
          .filter((value) => value !== null && value !== undefined)
      )
    );

    if (!normalizedSubjectIds.length) {
      setSubjectStudentGroups([]);
      return;
    }

    let isActive = true;

    const fetchBySubject = async () => {
      setStudentsLoading(true);
      setStudentsError(null);
      try {
        const courseSubjectNames = Array.isArray(course.subjects)
          ? course.subjects
          : [];

        const results = await Promise.allSettled(
          normalizedSubjectIds.map((subjectId) =>
            getStudentsBySubject(subjectId)
          )
        );

        const groups = normalizedSubjectIds.map((subjectId, index) => {
          const fallbackName =
            courseSubjectNames[index] ?? `Subject #${subjectId}`;
          const result = results[index];

          if (result.status === "fulfilled") {
            const rawEntries = Array.isArray(result.value)
              ? result.value
              : Array.isArray(result.value?.students)
              ? result.value.students
              : [];

            const normalizedEntries = rawEntries
              .map((entry) => {
                const subjectNameValue =
                  entry?.SubjectName ?? entry?.subjectName ?? fallbackName;
                const subjectCodeValue =
                  entry?.SubjectCode ?? entry?.subjectCode ?? "";
                const resolvedSubjectId =
                  entry?.SubjectID ??
                  entry?.subjectID ??
                  entry?.subjectId ??
                  subjectId;

                return {
                  ...entry,
                  SubjectID: resolvedSubjectId,
                  subjectId: resolvedSubjectId,
                  SubjectName: subjectNameValue,
                  subjectName: subjectNameValue,
                  SubjectCode: subjectCodeValue,
                  subjectCode: subjectCodeValue,
                };
              })
              .filter(belongsToCurrentCourse);

            const subjectNameValue =
              normalizedEntries[0]?.SubjectName ?? fallbackName;
            const subjectCodeValue =
              normalizedEntries[0]?.SubjectCode ??
              normalizedEntries[0]?.subjectCode ??
              "";

            return {
              subjectId,
              subjectName: subjectNameValue,
              subjectCode: subjectCodeValue,
              students: normalizedEntries,
              error: null,
            };
          }

          return {
            subjectId,
            subjectName: fallbackName,
            subjectCode: "",
            students: [],
            error: result.reason,
          };
        });

        if (!isActive) return;

        setSubjectStudentGroups(groups);

        const flattened = groups
          .flatMap((group) => group.students || [])
          .filter(belongsToCurrentCourse);
        if (flattened.length) {
          setStudents(flattened);
        }

        const failedCount = groups.filter((group) =>
          Boolean(group.error)
        ).length;
        if (failedCount) {
          console.warn(
            `${failedCount} subject group(s) failed to load via StudentsBySubject endpoint.`
          );
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Failed to load subject enrollments:", err);
        setSubjectStudentGroups([]);
      } finally {
        if (isActive) {
          setStudentsLoading(false);
        }
      }
    };

    fetchBySubject();

    return () => {
      isActive = false;
    };
  }, [
    loading,
    course,
    course?.subjectIds,
    course?.SubjectIDs,
    course?.subjects,
    studentsRefreshCounter,
    belongsToCurrentCourse,
  ]);

  useEffect(() => {
    const teacherId = course?.teacherId;

    if (
      teacherId === undefined ||
      teacherId === null ||
      String(teacherId).trim() === ""
    ) {
      setTeacher(null);
      setTeacherError(null);
      return;
    }

    let isActive = true;

    const fetchTeacher = async () => {
      setTeacherLoading(true);
      setTeacherError(null);
      try {
        const data = await getUserById(teacherId);
        if (!isActive) return;
        setTeacher(data);
      } catch (error) {
        if (!isActive) return;
        console.error("Error fetching teacher details:", error);
        setTeacher(null);
        setTeacherError("Unable to load teacher information.");
      } finally {
        if (isActive) {
          setTeacherLoading(false);
        }
      }
    };

    fetchTeacher();

    return () => {
      isActive = false;
    };
  }, [course?.teacherId]);

  const resolveStudentId = useCallback((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return "";
    }

    const values = [
      candidate.StudentID,
      candidate.studentID,
      candidate.studentId,
      candidate.UserID,
      candidate.userID,
      candidate.userId,
      candidate.id,
    ];

    for (const value of values) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str) return str;
    }

    return "";
  }, []);

  const getStudentDetailsPath = (student) => {
    const identifier = resolveStudentId(student);
    if (!identifier) return null;
    return user?.userType === "teacher"
      ? `/teacher/students/${identifier}`
      : `/admin/users/${identifier}`;
  };

  const resolveEnrollmentId = (candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return "";
    }

    const fields = [
      candidate.EnrollmentID,
      candidate.enrollmentID,
      candidate.enrollmentId,
      candidate.EnrollmentId,
    ];

    for (const value of fields) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str) return str;
    }

    return "";
  };

  const resolveEnrollmentActive = useCallback((studentEntry) => {
    const raw =
      studentEntry?.EnrollmentIsActive ??
      studentEntry?.enrollmentIsActive ??
      studentEntry?.EnrollmentStatus ??
      studentEntry?.enrollmentStatus ??
      null;

    if (typeof raw === "string") {
      const normalized = raw.trim().toLowerCase();
      if (normalized === "active") return true;
      if (normalized === "inactive") return false;
      if (normalized === "true" || normalized === "1") return true;
      if (normalized === "false" || normalized === "0") return false;
    } else if (raw !== null && raw !== undefined) {
      return Boolean(raw);
    }

    const fallback = studentEntry?.IsActive ?? studentEntry?.isActive;
    if (fallback !== undefined && fallback !== null) {
      return Boolean(fallback);
    }

    return true;
  }, []);

  const formatEnrollmentDate = (value) => {
    if (!value) return "Not specified";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString();
  };

  const { activeStudents, inactiveStudents } = useMemo(() => {
    const grouped = { active: [], inactive: [] };

    if (Array.isArray(students)) {
      for (const studentEntry of students) {
        const isActive = resolveEnrollmentActive(studentEntry);
        if (isActive) {
          grouped.active.push(studentEntry);
        } else {
          grouped.inactive.push(studentEntry);
        }
      }
    }

    return {
      activeStudents: grouped.active,
      inactiveStudents: grouped.inactive,
    };
  }, [students, resolveEnrollmentActive]);

  const subjectGroupsWithStatus = useMemo(() => {
    if (!Array.isArray(subjectStudentGroups)) {
      return [];
    }

    return subjectStudentGroups.map((group) => {
      const studentList = Array.isArray(group.students) ? group.students : [];
      const active = [];
      const inactive = [];

      for (const entry of studentList) {
        if (resolveEnrollmentActive(entry)) {
          active.push(entry);
        } else {
          inactive.push(entry);
        }
      }

      return {
        ...group,
        activeStudents: active,
        inactiveStudents: inactive,
      };
    });
  }, [subjectStudentGroups, resolveEnrollmentActive]);

  const matchesSearchTerm = useCallback(
    (student) => {
      if (!searchTerm) {
        return true;
      }

      const normalized = searchTerm.trim().toLowerCase();
      if (!normalized) {
        return true;
      }

      const fullName = `${student.FirstName || student.firstName || ""} ${
        student.LastName || student.lastName || ""
      }`
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      if (fullName && fullName.includes(normalized)) {
        return true;
      }

      const email = (student.Email || student.email || "").toLowerCase();
      if (email && email.includes(normalized)) {
        return true;
      }

      const rollNumber = (
        student.RollNumber ||
        student.rollNumber ||
        ""
      ).toLowerCase();
      if (rollNumber && rollNumber.includes(normalized)) {
        return true;
      }

      const subjectCandidates = [
        student.SubjectName,
        student.subjectName,
        student.CourseSubjectName,
        student.courseSubjectName,
        student?.Subject?.SubjectName,
        student?.Subject?.subjectName,
        student?.subject?.SubjectName,
        student?.subject?.subjectName,
      ];

      for (const candidate of subjectCandidates) {
        if (
          typeof candidate === "string" &&
          candidate.trim().toLowerCase().includes(normalized)
        ) {
          return true;
        }
      }

      return false;
    },
    [searchTerm]
  );

  const courseSubjectOptions = useMemo(() => {
    const options = [];
    const seen = new Set();

    const pushOption = (rawId, nameCandidate, extra = {}) => {
      const normalizedId = normalizeIdString(rawId);
      if (!normalizedId || seen.has(normalizedId)) {
        return;
      }

      const labelSources = [
        nameCandidate,
        extra.name,
        extra.subjectName,
        extra.SubjectName,
        extra.title,
        extra.Title,
        extra.fallbackName,
      ];

      let label = "";
      for (const candidate of labelSources) {
        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          if (trimmed) {
            label = trimmed;
            break;
          }
        }
      }

      const codeSources = [
        extra.code,
        extra.subjectCode,
        extra.SubjectCode,
        extra.codeCandidate,
        extra.courseSubjectCode,
        extra.CourseSubjectCode,
      ];

      let code = "";
      for (const candidate of codeSources) {
        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          if (trimmed) {
            code = trimmed;
            break;
          }
        }
      }

      const courseSubjectIdRaw =
        extra.courseSubjectId ??
        extra.CourseSubjectId ??
        extra.CourseSubjectID ??
        null;

      const normalizedCourseSubjectId =
        courseSubjectIdRaw !== null && courseSubjectIdRaw !== undefined
          ? normalizeIdString(courseSubjectIdRaw)
          : null;

      options.push({
        id: normalizedId,
        label: label || `Subject ${normalizedId}`,
        code,
        courseSubjectId: normalizedCourseSubjectId,
      });
      seen.add(normalizedId);
    };

    (subjectStudentGroups || []).forEach((group, index) => {
      const rawId =
        group?.subjectId ??
        group?.SubjectID ??
        group?.SubjectId ??
        group?.id ??
        group?.Id ??
        null;

      if (rawId === null || rawId === undefined) {
        return;
      }

      pushOption(rawId, group?.subjectName ?? group?.SubjectName, {
        code: group?.subjectCode ?? group?.SubjectCode,
        courseSubjectId:
          group?.courseSubjectId ??
          group?.CourseSubjectId ??
          group?.CourseSubjectID ??
          null,
        fallbackName: Array.isArray(course?.subjects)
          ? course.subjects[index]
          : undefined,
      });
    });

    const detailSources = [
      course?.subjectDetails,
      course?.SubjectDetails,
      course?.courseSubjects,
      course?.CourseSubjects,
    ];

    detailSources.forEach((source) => {
      if (!Array.isArray(source)) {
        return;
      }

      source.forEach((entry) => {
        if (!entry || typeof entry !== "object") {
          return;
        }

        const rawId =
          entry.subjectId ??
          entry.SubjectID ??
          entry.SubjectId ??
          entry.subjectID ??
          entry.id ??
          entry.Id ??
          null;

        if (rawId === null || rawId === undefined) {
          return;
        }

        pushOption(
          rawId,
          entry.name ??
            entry.subjectName ??
            entry.SubjectName ??
            entry.title ??
            entry.Title,
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
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [course, normalizeIdString, subjectStudentGroups]);

  const courseSubjectOptionMap = useMemo(() => {
    const map = new Map();
    courseSubjectOptions.forEach((option) => {
      map.set(option.id, option);
    });
    return map;
  }, [courseSubjectOptions]);

  const studentAssignedSubjectNames = useMemo(() => {
    if (!isStudentUser) {
      return [];
    }

    const identifierSet = new Set(studentIdentifierValues);
    if (!identifierSet.size) {
      return [];
    }

    const seenLabels = new Set();
    const assignedLabels = [];

    const matchesCurrentStudent = (entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const considerValue = (value) => {
        if (value === undefined || value === null) {
          return false;
        }
        const str = String(value).trim();
        if (!str) {
          return false;
        }
        return identifierSet.has(str);
      };

      const directId = resolveStudentId(entry);
      if (directId && identifierSet.has(directId)) {
        return true;
      }

      const directFields = [
        entry.StudentID,
        entry.studentID,
        entry.studentId,
        entry.UserID,
        entry.userID,
        entry.userId,
        entry.ID,
        entry.Id,
        entry.id,
      ];

      if (directFields.some(considerValue)) {
        return true;
      }

      const nestedCandidates = [
        entry.Student,
        entry.student,
        entry.User,
        entry.user,
        entry.StudentDetails,
        entry.studentDetails,
        entry.UserDetails,
        entry.userDetails,
      ];

      for (const nested of nestedCandidates) {
        if (!nested || typeof nested !== "object") {
          continue;
        }

        const nestedId = resolveStudentId(nested);
        if (nestedId && identifierSet.has(nestedId)) {
          return true;
        }

        const nestedFields = [
          nested.StudentID,
          nested.studentID,
          nested.studentId,
          nested.UserID,
          nested.userID,
          nested.userId,
          nested.ID,
          nested.Id,
          nested.id,
        ];

        if (nestedFields.some(considerValue)) {
          return true;
        }
      }

      return false;
    };

    (subjectStudentGroups || []).forEach((group) => {
      if (!group) {
        return;
      }

      const studentsList = Array.isArray(group.students) ? group.students : [];
      if (!studentsList.some(matchesCurrentStudent)) {
        return;
      }

      const subjectIdValue =
        group.subjectId ?? group.SubjectID ?? group.SubjectId ?? null;
      const subjectKey =
        subjectIdValue !== null && subjectIdValue !== undefined
          ? String(subjectIdValue)
          : null;

      let label = "";
      if (subjectKey && courseSubjectOptionMap.has(subjectKey)) {
        label = courseSubjectOptionMap.get(subjectKey)?.label ?? "";
      }

      const nameCandidates = [
        label,
        group.subjectName,
        group.SubjectName,
        group?.Subject?.subjectName,
        group?.Subject?.SubjectName,
      ];

      const resolvedLabel =
        nameCandidates.find(
          (candidate) =>
            typeof candidate === "string" && candidate.trim().length > 0
        ) ?? (subjectKey ? `Subject ${subjectKey}` : "");

      if (!resolvedLabel) {
        return;
      }

      const normalized = resolvedLabel.trim();
      const normalizedKey = normalized.toLowerCase();
      if (!seenLabels.has(normalizedKey)) {
        seenLabels.add(normalizedKey);
        assignedLabels.push(normalized);
      }
    });

    return assignedLabels;
  }, [
    isStudentUser,
    studentIdentifierValues,
    subjectStudentGroups,
    courseSubjectOptionMap,
  ]);

  const attendanceByStudent = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(attendance)) {
      return map;
    }

    attendance.forEach((record) => {
      if (!record || typeof record !== "object") {
        return;
      }

      const rawRecord =
        record.raw && typeof record.raw === "object" ? record.raw : null;

      const idCandidates = [
        record.StudentID,
        record.studentID,
        record.studentId,
        rawRecord?.StudentID,
        rawRecord?.studentID,
        rawRecord?.studentId,
      ];

      let resolvedId = null;
      for (const candidate of idCandidates) {
        const normalized = normalizeIdString(candidate);
        if (normalized) {
          resolvedId = normalized;
          break;
        }
      }

      if (!resolvedId) {
        return;
      }

      if (!map.has(resolvedId)) {
        map.set(resolvedId, []);
      }

      map.get(resolvedId).push(record);
    });

    map.forEach((records) => {
      records.sort((a, b) => {
        const parseDate = (value) => {
          if (!value) {
            return 0;
          }
          const date = new Date(value);
          return Number.isFinite(date.getTime()) ? date.getTime() : 0;
        };

        const bTime = parseDate(b.date ?? b.Date);
        const aTime = parseDate(a.date ?? a.Date);
        return bTime - aTime;
      });
    });

    return map;
  }, [attendance, normalizeIdString]);

  const getAttendanceSubjectHints = useCallback(
    (record) => {
      const ids = new Set();
      const names = new Set();

      if (!record || typeof record !== "object") {
        return { ids, names };
      }

      const addId = (candidate) => {
        if (candidate === undefined || candidate === null) {
          return;
        }
        if (Array.isArray(candidate)) {
          candidate.forEach(addId);
          return;
        }
        if (typeof candidate === "object") {
          addId(
            candidate.SubjectID ??
              candidate.subjectID ??
              candidate.subjectId ??
              candidate.id ??
              candidate.Id
          );
          return;
        }
        const normalized = normalizeIdString(candidate);
        if (normalized) {
          ids.add(normalized);
        }
      };

      const addName = (candidate) => {
        if (!candidate) {
          return;
        }
        if (Array.isArray(candidate)) {
          candidate.forEach(addName);
          return;
        }
        if (typeof candidate === "object") {
          addName(
            candidate.SubjectName ??
              candidate.subjectName ??
              candidate.Name ??
              candidate.name ??
              candidate.Title ??
              candidate.title
          );
          return;
        }
        if (typeof candidate === "string") {
          const trimmed = candidate.trim().toLowerCase();
          if (trimmed) {
            names.add(trimmed);
          }
        }
      };

      const rawRecord =
        record.raw && typeof record.raw === "object" ? record.raw : null;
      const sessionRecord =
        record.session && typeof record.session === "object"
          ? record.session
          : null;

      const idCandidates = [
        record.SubjectID,
        record.subjectID,
        record.subjectId,
        record.CourseSubjectID,
        record.courseSubjectID,
        record.CourseSubjectId,
        record.courseSubjectId,
        record.SubjectIDs,
        record.subjectIDs,
        record.SubjectIds,
        record.subjectIds,
      ];

      const nameCandidates = [
        record.SubjectName,
        record.subjectName,
        record.CourseSubjectName,
        record.courseSubjectName,
      ];

      if (rawRecord) {
        idCandidates.push(
          rawRecord.SubjectID,
          rawRecord.subjectID,
          rawRecord.subjectId,
          rawRecord.SubjectIds,
          rawRecord.subjectIds,
          rawRecord.SubjectIDs,
          rawRecord.subjectIDs,
          rawRecord.CourseSubjectID,
          rawRecord.courseSubjectID,
          rawRecord.CourseSubjectIds,
          rawRecord.courseSubjectIds,
          rawRecord.CourseSubjectIDs,
          rawRecord.courseSubjectIDs
        );

        nameCandidates.push(
          rawRecord.SubjectName,
          rawRecord.subjectName,
          rawRecord.CourseSubjectName,
          rawRecord.courseSubjectName
        );

        const rawSubject =
          rawRecord.Subject ||
          rawRecord.subject ||
          rawRecord.CourseSubject ||
          rawRecord.courseSubject ||
          null;

        if (rawSubject && typeof rawSubject === "object") {
          idCandidates.push(
            rawSubject.SubjectID,
            rawSubject.subjectID,
            rawSubject.subjectId,
            rawSubject.id,
            rawSubject.Id
          );
          nameCandidates.push(
            rawSubject.SubjectName,
            rawSubject.subjectName,
            rawSubject.Name,
            rawSubject.name,
            rawSubject.Title,
            rawSubject.title
          );
        }
      }

      if (sessionRecord) {
        idCandidates.push(
          sessionRecord.SubjectID,
          sessionRecord.subjectID,
          sessionRecord.subjectId,
          sessionRecord.CourseSubjectID,
          sessionRecord.courseSubjectID,
          sessionRecord.CourseSubjectId,
          sessionRecord.courseSubjectId
        );

        nameCandidates.push(
          sessionRecord.SubjectName,
          sessionRecord.subjectName,
          sessionRecord.CourseSubjectName,
          sessionRecord.courseSubjectName
        );

        const sessionSubject =
          sessionRecord.Subject || sessionRecord.subject || null;
        if (sessionSubject && typeof sessionSubject === "object") {
          idCandidates.push(
            sessionSubject.SubjectID,
            sessionSubject.subjectID,
            sessionSubject.subjectId,
            sessionSubject.id,
            sessionSubject.Id
          );
          nameCandidates.push(
            sessionSubject.SubjectName,
            sessionSubject.subjectName,
            sessionSubject.Name,
            sessionSubject.name,
            sessionSubject.Title,
            sessionSubject.title
          );
        }
      }

      idCandidates.forEach(addId);
      nameCandidates.forEach(addName);

      return { ids, names };
    },
    [normalizeIdString]
  );

  const getStudentDisplayName = useCallback(
    (student) => {
      if (!student || typeof student !== "object") {
        return "Unnamed student";
      }

      const findName = (candidates = []) =>
        candidates.find(
          (value) => typeof value === "string" && value.trim().length
        );

      const first =
        findName([
          student.FirstName,
          student.firstName,
          student.GivenName,
          student.givenName,
          student?.Student?.FirstName,
          student?.Student?.firstName,
          student?.StudentDetails?.FirstName,
          student?.StudentDetails?.firstName,
        ]) || "";

      const last =
        findName([
          student.LastName,
          student.lastName,
          student.Surname,
          student.surname,
          student?.Student?.LastName,
          student?.Student?.lastName,
          student?.StudentDetails?.LastName,
          student?.StudentDetails?.lastName,
        ]) || "";

      const combined = `${first} ${last}`.replace(/\s+/g, " ").trim();
      if (combined) {
        return combined;
      }

      const fallback =
        findName([
          student.FullName,
          student.fullName,
          student.Name,
          student.name,
          student?.Student?.FullName,
          student?.Student?.fullName,
          student?.Student?.Name,
          student?.Student?.name,
        ]) || "";

      if (fallback.trim()) {
        return fallback.trim();
      }

      const email =
        findName([
          student.Email,
          student.email,
          student?.Student?.Email,
          student?.Student?.email,
        ]) || "";

      if (email.trim()) {
        return email.trim();
      }

      const studentId = resolveStudentId(student);
      if (studentId) {
        return `Student ${studentId}`;
      }

      return "Unnamed student";
    },
    [resolveStudentId]
  );

  const classStatsEntries = useMemo(() => {
    const courseSubjectNames = Array.isArray(course?.subjects)
      ? course.subjects
      : [];

    const buildSubjectMeta = (group, index) => {
      const subjectIdCandidates = [
        group.subjectId,
        group.SubjectID,
        group.SubjectId,
        group.id,
        group.Id,
      ];

      let subjectIdNormalized = null;
      for (const candidate of subjectIdCandidates) {
        const normalized = normalizeIdString(candidate);
        if (normalized) {
          subjectIdNormalized = normalized;
          break;
        }
      }

      const option =
        subjectIdNormalized && courseSubjectOptionMap.has(subjectIdNormalized)
          ? courseSubjectOptionMap.get(subjectIdNormalized)
          : null;

      const fallbackName =
        courseSubjectNames[index] ?? option?.label ?? group.displayName ?? null;

      const subjectLabel =
        (group.subjectName ?? group.SubjectName ?? fallbackName ?? "").trim() ||
        (subjectIdNormalized
          ? `Class ${subjectIdNormalized}`
          : `Class ${index + 1}`);

      const subjectCode = (
        group.subjectCode ??
        group.SubjectCode ??
        option?.code ??
        ""
      ).trim();

      const entryKey = subjectIdNormalized ?? `subject-${index}`;

      return { subjectIdNormalized, subjectLabel, subjectCode, entryKey };
    };

    const resolveStatusInfo = (record) => {
      const candidates = [
        record?.status,
        record?.Status,
        record?.attendanceStatus,
        record?.AttendanceStatus,
        record?.raw?.Status,
        record?.raw?.status,
      ];

      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
          const label = candidate.trim();
          return { statusLabel: label, statusKey: label.toLowerCase() };
        }
      }

      return { statusLabel: "No record", statusKey: "no-record" };
    };

    const resolveRecordDate = (record) => {
      const candidates = [
        record?.date,
        record?.Date,
        record?.attendanceDate,
        record?.AttendanceDate,
        record?.session?.SessionDate,
        record?.session?.sessionDate,
        record?.raw?.SessionDate,
        record?.raw?.sessionDate,
        record?.raw?.date,
        record?.raw?.Date,
      ];

      for (const candidate of candidates) {
        if (!candidate) {
          continue;
        }
        const asDate = new Date(candidate);
        if (Number.isFinite(asDate.getTime())) {
          return asDate.toISOString();
        }
      }

      return null;
    };

    const summarizeRecords = (records, entryKey) => {
      if (!Array.isArray(records) || !records.length) {
        return {
          summaries: [],
          presentCount: 0,
          latestAttendanceDate: null,
        };
      }

      const summaries = [];
      let presentCount = 0;
      let latestAttendanceDate = null;

      records.forEach((record, recordIndex) => {
        const { statusLabel, statusKey } = resolveStatusInfo(record);
        if (statusKey === "present" || statusKey === "late") {
          presentCount += 1;
        }

        const recordDate = resolveRecordDate(record);
        if (recordDate) {
          const timestamp = new Date(recordDate).getTime();
          if (Number.isFinite(timestamp)) {
            if (!latestAttendanceDate) {
              latestAttendanceDate = new Date(timestamp).toISOString();
            } else {
              const current = new Date(latestAttendanceDate).getTime();
              if (timestamp > current) {
                latestAttendanceDate = new Date(timestamp).toISOString();
              }
            }
          }
        }

        summaries.push({
          id:
            record?.id ??
            record?.AttendanceID ??
            record?.attendanceId ??
            `${entryKey}-record-${recordIndex}`,
          title:
            record?.session?.Name ??
            record?.session?.name ??
            record?.session?.Title ??
            record?.session?.title ??
            record?.raw?.SessionName ??
            record?.raw?.sessionName ??
            `Session ${recordIndex + 1}`,
          date: recordDate,
          statusLabel,
          statusKey,
        });
      });

      return { summaries, presentCount, latestAttendanceDate };
    };

    if (isStudentUser) {
      const studentIds = studentIdentifierValues
        .map((value) => normalizeIdString(value))
        .filter(Boolean);
      const studentIdSet = new Set(studentIds);

      if (!studentIds.length) {
        return [];
      }

      const gatherRecordsForSubject = (
        subjectIdNormalized,
        subjectLabelLower
      ) => {
        const recordMap = new Map();

        studentIds.forEach((studentId) => {
          const records = attendanceByStudent.get(studentId);
          if (!Array.isArray(records)) {
            return;
          }

          records.forEach((record) => {
            const hints = getAttendanceSubjectHints(record);
            if (subjectIdNormalized && hints.ids.size) {
              if (!hints.ids.has(subjectIdNormalized)) {
                return;
              }
            } else if (subjectLabelLower && hints.names.size) {
              if (!hints.names.has(subjectLabelLower)) {
                return;
              }
            } else if (subjectIdNormalized || subjectLabelLower) {
              return;
            }

            const key =
              record?.id ??
              record?.AttendanceID ??
              record?.attendanceId ??
              `${subjectIdNormalized || subjectLabelLower || "record"}-${
                recordMap.size
              }`;
            if (!recordMap.has(key)) {
              recordMap.set(key, record);
            }
          });
        });

        return Array.from(recordMap.values());
      };

      const entryMap = new Map();

      if (
        Array.isArray(subjectGroupsWithStatus) &&
        subjectGroupsWithStatus.length
      ) {
        subjectGroupsWithStatus.forEach((group, index) => {
          const groupStudents = Array.isArray(group.students)
            ? group.students
            : [];
          const matchedStudent = groupStudents.find((candidate) => {
            const candidateId = normalizeIdString(resolveStudentId(candidate));
            return candidateId && studentIdSet.has(candidateId);
          });

          if (!matchedStudent) {
            return;
          }

          const { subjectIdNormalized, subjectLabel, subjectCode, entryKey } =
            buildSubjectMeta(group, index);

          const labelLower = subjectLabel.trim().toLowerCase();
          const recordsForSubject = gatherRecordsForSubject(
            subjectIdNormalized,
            labelLower
          );

          const { summaries, presentCount, latestAttendanceDate } =
            summarizeRecords(recordsForSubject, entryKey);

          const totalSessions = summaries.length;
          const absentCount = Math.max(0, totalSessions - presentCount);

          entryMap.set(entryKey, {
            key: entryKey,
            subjectId: subjectIdNormalized,
            label: subjectLabel,
            code: subjectCode,
            total: totalSessions,
            present: presentCount,
            absent: absentCount,
            students: [],
            records: summaries,
            latestAttendanceDate,
          });
        });
      }

      const ensureEntryForLabel = (label, identifier, index) => {
        const trimmedLabel = (label || "").trim();
        if (!trimmedLabel) {
          return;
        }

        const labelLower = trimmedLabel.toLowerCase();
        const existing = Array.from(entryMap.values()).find(
          (entry) => entry.label.toLowerCase() === labelLower
        );
        if (existing) {
          return;
        }

        const recordsForSubject = gatherRecordsForSubject(null, labelLower);
        const { summaries, presentCount, latestAttendanceDate } =
          summarizeRecords(recordsForSubject, `student-class-${index}`);

        const totalSessions = summaries.length;
        const absentCount = Math.max(0, totalSessions - presentCount);

        entryMap.set(`student-class-${index}`, {
          key: `student-class-${index}`,
          subjectId: identifier ? normalizeIdString(identifier) : null,
          label: trimmedLabel,
          code: "",
          total: totalSessions,
          present: presentCount,
          absent: absentCount,
          students: [],
          records: summaries,
          latestAttendanceDate,
        });
      };

      if (studentAssignedSubjectNames.length) {
        studentAssignedSubjectNames.forEach((name, index) =>
          ensureEntryForLabel(name, name, index)
        );
      }

      return Array.from(entryMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );
    }

    const entries = [];

    if (
      Array.isArray(subjectGroupsWithStatus) &&
      subjectGroupsWithStatus.length
    ) {
      subjectGroupsWithStatus.forEach((group, index) => {
        const { subjectIdNormalized, subjectLabel, subjectCode, entryKey } =
          buildSubjectMeta(group, index);

        const studentsList = Array.isArray(group.students)
          ? group.students
          : [];
        let presentCount = 0;
        let latestAttendanceDate = null;

        const subjectNameKey = subjectLabel.toLowerCase();

        const studentSummaries = studentsList.map((student, studentIndex) => {
          const studentId = normalizeIdString(resolveStudentId(student));
          const attendanceRecords =
            studentId && attendanceByStudent.has(studentId)
              ? attendanceByStudent.get(studentId)
              : [];

          let matchedRecord = null;

          if (attendanceRecords && attendanceRecords.length) {
            for (const record of attendanceRecords) {
              const hints = getAttendanceSubjectHints(record);
              if (
                (subjectIdNormalized && hints.ids.has(subjectIdNormalized)) ||
                (subjectNameKey && hints.names.has(subjectNameKey))
              ) {
                matchedRecord = record;
                break;
              }
            }

            if (!matchedRecord) {
              matchedRecord = attendanceRecords[0];
            }
          }

          const { statusLabel, statusKey } = resolveStatusInfo(
            matchedRecord || {}
          );
          const attendanceDate = matchedRecord
            ? resolveRecordDate(matchedRecord)
            : null;

          if (statusKey === "present" || statusKey === "late") {
            presentCount += 1;
          }

          if (attendanceDate) {
            const timestamp = new Date(attendanceDate).getTime();
            if (Number.isFinite(timestamp)) {
              if (!latestAttendanceDate) {
                latestAttendanceDate = new Date(timestamp).toISOString();
              } else {
                const current = new Date(latestAttendanceDate).getTime();
                if (timestamp > current) {
                  latestAttendanceDate = new Date(timestamp).toISOString();
                }
              }
            }
          }

          return {
            id: studentId ?? `student-${index}-${studentIndex}`,
            name: getStudentDisplayName(student),
            statusLabel,
            statusKey,
            attendanceDate,
          };
        });

        const totalStudents = studentsList.length;
        const absentCount = Math.max(0, totalStudents - presentCount);

        studentSummaries.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );

        entries.push({
          key: entryKey,
          subjectId: subjectIdNormalized,
          label: subjectLabel,
          code: subjectCode,
          total: totalStudents,
          present: presentCount,
          absent: absentCount,
          students: studentSummaries,
          records: [],
          latestAttendanceDate,
        });
      });
    }

    if (!entries.length) {
      const fallbackOptions = Array.isArray(courseSubjectOptions)
        ? courseSubjectOptions
        : [];

      if (fallbackOptions.length) {
        fallbackOptions.forEach((option, index) => {
          const normalizedId = normalizeIdString(option.id);
          entries.push({
            key: normalizedId ?? `fallback-${index}`,
            subjectId: normalizedId,
            label:
              (option.label || "").trim() ||
              (normalizedId ? `Class ${normalizedId}` : `Class ${index + 1}`),
            code: option.code ?? "",
            total: 0,
            present: 0,
            absent: 0,
            students: [],
            records: [],
            latestAttendanceDate: null,
          });
        });
      } else if (courseSubjectNames.length) {
        courseSubjectNames.forEach((name, index) => {
          entries.push({
            key: normalizeIdString(name) ?? `course-class-${index}`,
            subjectId: normalizeIdString(name),
            label: String(name || `Class ${index + 1}`).trim(),
            code: "",
            total: 0,
            present: 0,
            absent: 0,
            students: [],
            records: [],
            latestAttendanceDate: null,
          });
        });
      }
    }

    return entries;
  }, [
    isStudentUser,
    subjectGroupsWithStatus,
    normalizeIdString,
    courseSubjectOptionMap,
    courseSubjectOptions,
    course?.subjects,
    attendanceByStudent,
    getAttendanceSubjectHints,
    getStudentDisplayName,
    resolveStudentId,
    studentIdentifierValues,
    studentAssignedSubjectNames,
  ]);

  const selectedClassInfo = useMemo(() => {
    if (!selectedClassKey || !classStatsEntries.length) {
      return null;
    }
    const info = classStatsEntries.find((entry) => entry.key === selectedClassKey) || null;
    console.log("CourseView selectedClassInfo:", info);
    return info;
  }, [selectedClassKey, classStatsEntries]);

  const showClassStatsPanel =
    Boolean(selectedClassInfo) && Boolean(isClassStatsOpen);

  useEffect(() => {
    if (!selectedClassKey) {
      return;
    }

    const exists = classStatsEntries.some(
      (entry) => entry.key === selectedClassKey
    );

    if (!exists) {
      setIsClassStatsOpen(false);
      setSelectedClassKey(null);
    }
  }, [selectedClassKey, classStatsEntries]);

  const handleClassChipClick = useCallback(
    (entryKey) => {
      if (!entryKey) {
        return;
      }

      if (selectedClassKey === entryKey && isClassStatsOpen) {
        setIsClassStatsOpen(false);
        setSelectedClassKey(null);
      } else {
        setSelectedClassKey(entryKey);
        setIsClassStatsOpen(true);
      }
    },
    [selectedClassKey, isClassStatsOpen]
  );

  const handleCloseClassStats = useCallback(() => {
    setIsClassStatsOpen(false);
    setSelectedClassKey(null);
  }, []);

  // Alert system functions
  const showAlertMessage = (message, type = "success") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);

    setTimeout(() => {
      setShowAlert(false);
    }, 5000);
  };

  const getAlertBgColor = () => {
    switch (alertType) {
      case "success":
        return "bg-green-100 border-green-300 dark:bg-green-900/70 dark:border-green-700";
      case "error":
        return "bg-red-100 border-red-300 dark:bg-red-900/70 dark:border-red-700";
      case "warning":
        return "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/70 dark:border-yellow-700";
      case "info":
        return "bg-blue-100 border-blue-300 dark:bg-blue-900/70 dark:border-blue-700";
      default:
        return "bg-gray-100 border-gray-300 dark:bg-gray-900/70 dark:border-gray-700";
    }
  };

  const getAlertTextColor = () => {
    switch (alertType) {
      case "success":
        return "text-green-800 dark:text-green-200";
      case "error":
        return "text-red-800 dark:text-red-200";
      case "warning":
        return "text-yellow-800 dark:text-yellow-200";
      case "info":
        return "text-blue-800 dark:text-blue-200";
      default:
        return "text-gray-800 dark:text-gray-200";
    }
  };

  const getAlertIcon = () => {
    switch (alertType) {
      case "success":
        return (
          <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        );
      case "error":
        return <FiX className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case "warning":
        return (
          <FiBook className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        );
      case "info":
        return <FiUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <FiUsers className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const handleExistingStudentConfirm = async (
    selectedIds = [],
    selectedSubjectIds = []
  ) => {
    if (!Array.isArray(selectedIds) || !selectedIds.length) {
      setStudentActionError("Select at least one student to enroll.");
      return;
    }

    const uniqueIds = Array.from(
      new Set(
        selectedIds
          .map((id) => normalizeIdString(id))
          .filter((value) => Boolean(value))
      )
    );

    if (!uniqueIds.length) {
      setStudentActionError("Select at least one student to enroll.");
      return;
    }

    const requireSubjects = courseSubjectOptions.length > 0;

    const uniqueSubjectIds = Array.from(
      new Set(
        (Array.isArray(selectedSubjectIds) ? selectedSubjectIds : [])
          .map((subjectId) => normalizeIdString(subjectId))
          .filter((value) => Boolean(value))
      )
    );

    if (requireSubjects && !uniqueSubjectIds.length) {
      setStudentActionError(
        "Select at least one class to enroll the students in."
      );
      return;
    }

    const rawCourseId =
      course?.id ??
      course?.CourseID ??
      course?.courseID ??
      course?.CourseId ??
      course?.courseId ??
      id;

    if (rawCourseId === undefined || rawCourseId === null) {
      setStudentActionError("Course information is missing.");
      return;
    }

    const numericCourseId = Number(rawCourseId);
    const useNumericCourseId = !Number.isNaN(numericCourseId);
    const courseIdForApi = useNumericCourseId ? numericCourseId : rawCourseId;

    const enrollmentOptions = {
      EnrollmentDate: new Date().toISOString(),
      IsActive: true,
    };

    const toApiId = (value) => {
      if (value === null || value === undefined) {
        return value;
      }
      const numeric = Number(value);
      return Number.isNaN(numeric) ? value : numeric;
    };

    setAddingStudents(true);
    setStudentActionError("");

    try {
      if (!requireSubjects || !uniqueSubjectIds.length) {
        for (const studentId of uniqueIds) {
          const resolvedStudentId = toApiId(studentId);

          if (useNumericCourseId) {
            await createEnrollmentsForStudent(
              resolvedStudentId,
              [numericCourseId],
              enrollmentOptions
            );
          } else {
            await createEnrollment({
              StudentID: resolvedStudentId,
              CourseID: rawCourseId,
              EnrollmentDate: enrollmentOptions.EnrollmentDate,
              IsActive: enrollmentOptions.IsActive,
            });
          }
        }

        setStudentActionError("");
        setShowStudentPicker(false);
        setStudentsRefreshCounter((prev) => prev + 1);
        showAlertMessage(
          uniqueIds.length > 1
            ? `Added ${uniqueIds.length} students to the course.`
            : `Added 1 student to the course.`,
          "success"
        );
        return;
      }

      const existingEnrollmentMap = new Map();

      const registerEnrollment = (entry) => {
        if (!entry || typeof entry !== "object") {
          return;
        }

        const studentIdValue = normalizeIdString(resolveStudentId(entry));
        if (!studentIdValue) {
          return;
        }

        const subjectCandidates = [
          entry.SubjectID,
          entry.subjectID,
          entry.SubjectId,
          entry.subjectId,
          entry.CourseSubjectID,
          entry.courseSubjectID,
          entry.CourseSubjectId,
          entry.courseSubjectId,
        ];

        let subjectIdValue = null;
        for (const subjectCandidate of subjectCandidates) {
          const normalizedSubjectId = normalizeIdString(subjectCandidate);
          if (normalizedSubjectId) {
            subjectIdValue = normalizedSubjectId;
            break;
          }
        }

        if (!subjectIdValue) {
          return;
        }

        const key = `${studentIdValue}::${subjectIdValue}`;
        if (existingEnrollmentMap.has(key)) {
          return;
        }

        existingEnrollmentMap.set(key, {
          entry,
          enrollmentId: resolveEnrollmentId(entry),
          isActive: resolveEnrollmentActive(entry),
          studentId: studentIdValue,
          subjectId: subjectIdValue,
        });
      };

      (students || []).forEach(registerEnrollment);
      (subjectStudentGroups || []).forEach((group) => {
        (group?.students || []).forEach(registerEnrollment);
      });

      const plannedKeys = new Set();
      const activations = [];
      const creations = [];
      const alreadyActive = [];

      for (const studentId of uniqueIds) {
        for (const subjectId of uniqueSubjectIds) {
          const key = `${studentId}::${subjectId}`;
          if (plannedKeys.has(key)) {
            continue;
          }
          plannedKeys.add(key);

          const existing = existingEnrollmentMap.get(key);
          if (existing) {
            if (existing.isActive) {
              alreadyActive.push({ studentId, subjectId });
              continue;
            }

            if (existing.enrollmentId) {
              activations.push({
                enrollmentId: existing.enrollmentId,
                studentId,
                subjectId,
              });
              continue;
            }
          }

          const option = courseSubjectOptionMap.get(subjectId) || null;
          creations.push({
            studentId,
            subjectId,
            courseSubjectId: option?.courseSubjectId ?? null,
          });
        }
      }

      const activationResults = await Promise.allSettled(
        activations.map(({ enrollmentId, studentId, subjectId }) => {
          const option = courseSubjectOptionMap.get(subjectId) || null;
          const payload = {
            StudentID: toApiId(studentId),
            CourseID: courseIdForApi,
            SubjectID: toApiId(subjectId),
          };

          if (
            option?.courseSubjectId !== null &&
            option?.courseSubjectId !== undefined
          ) {
            payload.CourseSubjectID = toApiId(option.courseSubjectId);
          }

          return setEnrollmentActiveStatus(enrollmentId, true, payload);
        })
      );

      const creationResults = await Promise.allSettled(
        creations.map(({ studentId, subjectId, courseSubjectId }) => {
          const payload = {
            StudentID: toApiId(studentId),
            CourseID: courseIdForApi,
            SubjectID: toApiId(subjectId),
            EnrollmentDate: enrollmentOptions.EnrollmentDate,
            IsActive: enrollmentOptions.IsActive,
          };

          if (courseSubjectId !== null && courseSubjectId !== undefined) {
            payload.CourseSubjectID = toApiId(courseSubjectId);
          }

          return createEnrollment(payload);
        })
      );

      const activationFailures = activationResults.filter(
        (result) => result.status === "rejected"
      );
      const creationFailures = creationResults.filter(
        (result) => result.status === "rejected"
      );

      const reactivatedCount =
        activationResults.length - activationFailures.length;
      const createdCount = creationResults.length - creationFailures.length;
      const alreadyActiveCount = alreadyActive.length;

      if (!activationFailures.length && !creationFailures.length) {
        setStudentActionError("");
        setShowStudentPicker(false);
        setStudentsRefreshCounter((prev) => prev + 1);

        const changedCount = createdCount + reactivatedCount;
        const segments = [];
        if (createdCount) {
          segments.push(`${createdCount} new`);
        }
        if (reactivatedCount) {
          segments.push(`${reactivatedCount} reactivated`);
        }

        let toastText = "";

        if (changedCount) {
          toastText = `${segments.join(" and ")} enrollment${
            changedCount === 1 ? "" : "s"
          }.`;
          if (alreadyActiveCount) {
            toastText += ` ${alreadyActiveCount} already active.`;
          }
        } else if (alreadyActiveCount) {
          toastText = `${alreadyActiveCount} enrollment${
            alreadyActiveCount === 1 ? "" : "s"
          } already active.`;
        } else {
          toastText = "No enrollment changes were required.";
        }

        showAlertMessage(toastText, "success");
        return;
      }

      const failureMessages = [];
      if (creationFailures.length) {
        failureMessages.push(
          `${creationFailures.length} new enrollment${
            creationFailures.length === 1 ? "" : "s"
          }`
        );
      }
      if (activationFailures.length) {
        failureMessages.push(
          `${activationFailures.length} reactivation${
            activationFailures.length === 1 ? "" : "s"
          }`
        );
      }

      setStudentActionError(
        `Some enrollments could not be saved: ${failureMessages.join(
          ", "
        )}. Please try again.`
      );

      if (createdCount || reactivatedCount) {
        setStudentsRefreshCounter((prev) => prev + 1);

        const segments = [];
        if (createdCount) {
          segments.push(`${createdCount} created`);
        }
        if (reactivatedCount) {
          segments.push(`${reactivatedCount} reactivated`);
        }
        if (alreadyActiveCount) {
          segments.push(`${alreadyActiveCount} already active`);
        }

        showAlertMessage(`${segments.join(", ")}.`, "warning");
      }
    } catch (error) {
      console.error("Failed to enroll selected students", error);
      setStudentActionError(
        error?.message || "Unable to add selected students. Please try again."
      );
    } finally {
      setAddingStudents(false);
    }
  };

  const handleEnrollmentStatusChange = async (studentEntry, makeActive) => {
    const enrollmentId = resolveEnrollmentId(studentEntry);
    if (!enrollmentId) {
      showAlertMessage(
        "Unable to update enrollment. Missing identifier.",
        "error"
      );
      return;
    }

    setEnrollmentLoadingMap((prev) => ({
      ...prev,
      [enrollmentId]: true,
    }));

    try {
      const resolveSubjectId = (entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const candidates = [
          entry.SubjectID,
          entry.subjectID,
          entry.SubjectId,
          entry.subjectId,
        ];

        for (const candidate of candidates) {
          if (candidate === null || candidate === undefined) continue;
          const normalized = normalizeIdString(candidate);
          if (normalized) {
            return normalized;
          }
        }

        return null;
      };

      let resolvedSubjectId = resolveSubjectId(studentEntry);

      if (!resolvedSubjectId) {
        for (const group of subjectStudentGroups) {
          const match = (group.students || []).find((candidate) => {
            const cid = resolveEnrollmentId(candidate);
            if (cid && String(cid) === String(enrollmentId)) {
              return true;
            }
            const studentMatchId = resolveStudentId(candidate);
            const entryStudentId = resolveStudentId(studentEntry);
            return (
              studentMatchId &&
              entryStudentId &&
              studentMatchId === entryStudentId
            );
          });

          if (match) {
            resolvedSubjectId = resolveSubjectId(match);
            if (resolvedSubjectId) {
              break;
            }
          }
        }
      }

      const contextPayload = resolvedSubjectId
        ? {
            ...studentEntry,
            SubjectID: resolvedSubjectId,
            subjectId: resolvedSubjectId,
          }
        : studentEntry;

      await setEnrollmentActiveStatus(enrollmentId, makeActive, contextPayload);
      const nextStatus = makeActive ? "active" : "inactive";

      setStudents((prev) =>
        prev.map((studentItem) => {
          const currentId = resolveEnrollmentId(studentItem);
          if (currentId && String(currentId) === String(enrollmentId)) {
            return {
              ...studentItem,
              EnrollmentIsActive: makeActive,
              enrollmentIsActive: makeActive,
              EnrollmentStatus: nextStatus,
              enrollmentStatus: nextStatus,
              SubjectID:
                resolvedSubjectId ??
                studentItem.SubjectID ??
                studentItem.subjectID ??
                studentItem.subjectId ??
                studentItem.SubjectId,
              subjectID:
                resolvedSubjectId ??
                studentItem.subjectID ??
                studentItem.SubjectID,
              subjectId:
                resolvedSubjectId ??
                studentItem.subjectId ??
                studentItem.SubjectID,
            };
          }
          return studentItem;
        })
      );

      setSubjectStudentGroups((prevGroups) =>
        prevGroups.map((group) => {
          const updatedStudents = (group.students || []).map((studentItem) => {
            const currentId = resolveEnrollmentId(studentItem);
            if (currentId && String(currentId) === String(enrollmentId)) {
              return {
                ...studentItem,
                EnrollmentIsActive: makeActive,
                enrollmentIsActive: makeActive,
                EnrollmentStatus: nextStatus,
                enrollmentStatus: nextStatus,
                SubjectID:
                  resolvedSubjectId ??
                  studentItem.SubjectID ??
                  studentItem.subjectID ??
                  studentItem.subjectId ??
                  studentItem.SubjectId,
                subjectID:
                  resolvedSubjectId ??
                  studentItem.subjectID ??
                  studentItem.SubjectID,
                subjectId:
                  resolvedSubjectId ??
                  studentItem.subjectId ??
                  studentItem.SubjectID,
              };
            }
            return studentItem;
          });

          return {
            ...group,
            students: updatedStudents,
          };
        })
      );

      showAlertMessage(
        makeActive
          ? "Enrollment reactivated."
          : "Enrollment removed from course.",
        "success"
      );
    } catch (error) {
      console.error("Failed to update enrollment status:", error);
      showAlertMessage(
        makeActive
          ? "Unable to reactivate enrollment."
          : "Unable to remove enrollment.",
        "error"
      );
    } finally {
      setEnrollmentLoadingMap((prev) => {
        const next = { ...prev };
        delete next[enrollmentId];
        return next;
      });
    }
  };

  const handleRemoveEnrollment = async (studentEntry) => {
    const confirmed = window.confirm(
      "Remove this student from the course? They will remain associated but marked inactive."
    );
    if (!confirmed) return;
    await handleEnrollmentStatusChange(studentEntry, false);
  };

  const handleReactivateEnrollment = async (studentEntry) => {
    await handleEnrollmentStatusChange(studentEntry, true);
  };

  const handleDeactivateCourse = async () => {
    const confirmed = window.confirm(
      "Mark this course as inactive? This will prevent new enrollments."
    );
    if (!confirmed) return;

    const rawCourseId =
      course?.id ??
      course?.CourseID ??
      course?.courseID ??
      course?.CourseId ??
      course?.courseId ??
      id;

    if (rawCourseId === undefined || rawCourseId === null) {
      showAlertMessage("Course identifier missing.", "error");
      return;
    }

    setDeactivating(true);
    try {
      await deactivateCourse(rawCourseId);
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              isActive: false,
              IsActive: false,
              status: "inactive",
              Status: "inactive",
            }
          : prev
      );
      showAlertMessage("Course marked inactive.", "success");
    } catch (error) {
      console.error("Failed to inactivate course:", error);
      showAlertMessage(
        error?.message || "Unable to mark course inactive.",
        "error"
      );
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivateCourse = async () => {
    const rawCourseId =
      course?.id ??
      course?.CourseID ??
      course?.courseID ??
      course?.CourseId ??
      course?.courseId ??
      id;

    if (rawCourseId === undefined || rawCourseId === null) {
      showAlertMessage("Course identifier missing.", "error");
      return;
    }

    setReactivating(true);
    try {
      await reactivateCourse(rawCourseId);
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              isActive: true,
              IsActive: true,
              status: "active",
              Status: "active",
            }
          : prev
      );
      showAlertMessage("Course reactivated.", "success");
    } catch (error) {
      console.error("Failed to reactivate course:", error);
      showAlertMessage(
        error?.message || "Unable to reactivate course.",
        "error"
      );
    } finally {
      setReactivating(false);
    }
  };

  const handleStudentPickerClose = () => {
    if (!addingStudents) {
      setShowStudentPicker(false);
    }
  };

  const handleRegisterModalClose = useCallback(() => {
    if (addingStudents) {
      return;
    }
    setShowRegisterModal(false);
    setRegisterStep(1);
    setPendingRegisterCore(null);
    setRegisterSelectedSubjectIds([]);
    setRegisterSubjectError("");
    setStudentActionError("");
  }, [addingStudents]);

  const handleCreateStudent = async (formData, selectedSubjectIds = []) => {
    setStudentActionError("");

    const rawCourseId =
      course?.id ??
      course?.CourseID ??
      course?.courseID ??
      course?.CourseId ??
      course?.courseId ??
      id;

    try {
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

      const userPayload = {
        ...formData,
        UserTypeID: 3,
        IsActive: true,
        ProfilePicture:
          formData?.ProfilePicture ?? formData?.profilePicture ?? null,
      };

      const createdUser = await createUser(userPayload);

      const enrollmentDateValue =
        formData?.EnrollmentDate ?? formData?.enrollmentDate ?? null;

      const studentPayload = {
        UserID:
          createdUser?.UserID ??
          createdUser?.userID ??
          createdUser?.userId ??
          createdUser?.id ??
          formData?.UserID ??
          formData?.userID ??
          formData?.userId ??
          null,
        RollNumber:
          formData?.RollNumber ??
          formData?.rollNumber ??
          formData?.IDNumber ??
          formData?.idNumber ??
          undefined,
        EnrollmentDate: enrollmentDateValue ?? undefined,
        CurrentGrade:
          formData?.CurrentGrade ??
          formData?.currentGrade ??
          formData?.Class ??
          formData?.class ??
          undefined,
        ParentName:
          formData?.ParentName ??
          formData?.parentName ??
          formData?.GuardianName ??
          formData?.guardianName ??
          undefined,
        ParentContact:
          formData?.ParentContact ??
          formData?.parentContact ??
          formData?.GuardianPhone ??
          formData?.guardianPhone ??
          undefined,
      };

      const cleanedStudentPayload = Object.fromEntries(
        Object.entries(studentPayload).filter(
          ([, value]) => value !== undefined && value !== null
        )
      );

      const createdStudent = await createStudent(cleanedStudentPayload);

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
        if (candidate === undefined || candidate === null) continue;
        const trimmed = String(candidate).trim();
        if (!trimmed) continue;
        resolvedStudentId = Number.isNaN(Number(trimmed))
          ? trimmed
          : Number(trimmed);
        break;
      }

      if (
        resolvedStudentId !== null &&
        resolvedStudentId !== undefined &&
        rawCourseId !== undefined &&
        rawCourseId !== null
      ) {
        const numericCourseId = Number(rawCourseId);
        const useNumericCourseId = !Number.isNaN(numericCourseId);
        const courseIdForApi = useNumericCourseId
          ? numericCourseId
          : rawCourseId;

        const enrollmentDateIso =
          enrollmentDateValue || new Date().toISOString();

        if (uniqueSubjectIds.length) {
          const creationResults = await Promise.allSettled(
            uniqueSubjectIds.map((subjectId) => {
              const option = courseSubjectOptionMap.get(subjectId) || null;
              const payload = {
                StudentID: toApiId(resolvedStudentId),
                CourseID: courseIdForApi,
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
                "Failed to enroll student in the selected classes."
            );
          }
        } else {
          if (useNumericCourseId) {
            await createEnrollmentsForStudent(
              resolvedStudentId,
              [numericCourseId],
              {
                EnrollmentDate: enrollmentDateIso,
                IsActive: true,
              }
            );
          } else {
            await createEnrollment({
              StudentID: toApiId(resolvedStudentId),
              CourseID: courseIdForApi,
              EnrollmentDate: enrollmentDateIso,
              IsActive: true,
            });
          }
        }
      }

      setStudentActionError("");
      setStudentsRefreshCounter((prev) => prev + 1);
      if (uniqueSubjectIds.length) {
        const count = uniqueSubjectIds.length;
        showAlertMessage(
          `Student created and enrolled in ${count} class${
            count === 1 ? "" : "es"
          }.`,
          "success"
        );
      } else {
        showAlertMessage(
          "Student created and enrolled in the course.",
          "success"
        );
      }
    } catch (error) {
      console.error("Failed to create student", error);
      const message =
        error?.message || "Failed to create student. Please try again.";
      setStudentActionError(message);
      throw error;
    }
  };

  const handleRegisterStudentSubmit = async (formData) => {
    if (registerStep === 1) {
      setPendingRegisterCore({ ...formData });
      setRegisterStep(2);
      setStudentActionError("");
      setRegisterSubjectError("");
      return;
    }

    const mergedData = {
      ...(pendingRegisterCore || {}),
      ...formData,
    };

    if (
      mergedData.UserTypeID === undefined &&
      mergedData.userTypeID === undefined &&
      mergedData.userTypeId === undefined
    ) {
      mergedData.UserTypeID = 3;
    }

    const requiresSubjectSelection = courseSubjectOptions.length > 0;
    const normalizedSubjectSelection = Array.from(
      new Set(
        (registerSelectedSubjectIds || [])
          .map((value) => normalizeIdString(value))
          .filter(Boolean)
      )
    );

    if (requiresSubjectSelection && !normalizedSubjectSelection.length) {
      setRegisterSubjectError(
        "Select at least one class to enroll the student in."
      );
      return;
    }

    setRegisterSubjectError("");

    try {
      setAddingStudents(true);
      setStudentActionError("");
      await handleCreateStudent(mergedData, normalizedSubjectSelection);
      setShowRegisterModal(false);
      setRegisterStep(1);
      setPendingRegisterCore(null);
      setRegisterSelectedSubjectIds([]);
    } catch (error) {
      // Errors are surfaced through studentActionError inside handleCreateStudent
      if (normalizedSubjectSelection.length) {
        setRegisterSubjectError(
          error?.message ||
            "Unable to enroll the student in the selected classes."
        );
      }
    } finally {
      setAddingStudents(false);
    }
  };

  const handleMaterialSubmit = (newMaterial) => {
    setMaterials([newMaterial, ...materials]);
    setShowMaterialModal(false);
  };

  // Filter students based on search term
  const getStudentGroupKey = useCallback(
    (student) => {
      const enrollmentId = resolveEnrollmentId(student);
      if (enrollmentId) {
        return `enrollment:${enrollmentId}`;
      }

      const studentId = resolveStudentId(student);
      if (studentId) {
        return `student:${studentId}`;
      }

      const email = (student.Email || student.email || "").trim().toLowerCase();
      if (email) {
        return `email:${email}`;
      }

      const rollNumber = (student.RollNumber || student.rollNumber || "")
        .trim()
        .toLowerCase();
      if (rollNumber) {
        return `roll:${rollNumber}`;
      }

      const nameKey = `${student.FirstName || student.firstName || ""} ${
        student.LastName || student.lastName || ""
      }`
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      if (nameKey) {
        const enrollmentDate = String(
          student.EnrollmentDate || student.enrollmentDate || ""
        ).trim();
        return `name:${nameKey}:${enrollmentDate}`;
      }

      return "";
    },
    [resolveEnrollmentId, resolveStudentId]
  );

  const filteredStudentGroups = useMemo(() => {
    const groups = [];
    const usedKeys = new Set();

    const addGroup = (groupMeta, list) => {
      if (!Array.isArray(list) || !list.length) {
        return;
      }

      for (const student of list) {
        const key = getStudentGroupKey(student);
        if (key) {
          usedKeys.add(key);
        }
      }

      const rawNameValue =
        groupMeta.subjectName ??
        groupMeta.SubjectName ??
        groupMeta.name ??
        groupMeta.Name ??
        null;
      const rawName =
        rawNameValue !== null && rawNameValue !== undefined
          ? String(rawNameValue).trim()
          : "";

      const rawCodeValue =
        groupMeta.subjectCode ??
        groupMeta.SubjectCode ??
        groupMeta.code ??
        null;
      const subjectCode =
        rawCodeValue !== null && rawCodeValue !== undefined
          ? String(rawCodeValue).trim()
          : "";

      let displayName = rawName;
      if (!displayName) {
        if (subjectCode) {
          displayName = subjectCode;
        } else if (
          (groupMeta.subjectId !== null && groupMeta.subjectId !== undefined) ||
          (groupMeta.SubjectID !== null && groupMeta.SubjectID !== undefined) ||
          (groupMeta.SubjectId !== null && groupMeta.SubjectId !== undefined)
        ) {
          const subjectIdentifier =
            groupMeta.subjectId ?? groupMeta.SubjectID ?? groupMeta.SubjectId;
          displayName = `Class ${subjectIdentifier}`;
        } else {
          displayName = "Unassigned Class";
        }
      }

      const subjectIdentifier =
        groupMeta.subjectId ??
        groupMeta.SubjectID ??
        groupMeta.SubjectId ??
        null;

      groups.push({
        id:
          subjectIdentifier !== null && subjectIdentifier !== undefined
            ? subjectIdentifier
            : displayName,
        displayName,
        subjectCode,
        students: list,
      });
    };

    if (
      Array.isArray(subjectGroupsWithStatus) &&
      subjectGroupsWithStatus.length
    ) {
      for (const group of subjectGroupsWithStatus) {
        const baseList =
          studentTab === "active"
            ? group.activeStudents
            : group.inactiveStudents;

        if (!Array.isArray(baseList) || !baseList.length) {
          continue;
        }

        const filteredList = baseList.filter(matchesSearchTerm);
        if (!filteredList.length) {
          continue;
        }

        addGroup(group, filteredList);
      }
    }

    // Do not show students that could not be matched to a subject group
    // (remove the previous 'Unassigned Class' bucket per request).

    return groups;
  }, [
    subjectGroupsWithStatus,
    studentTab,
    matchesSearchTerm,
    activeStudents,
    inactiveStudents,
    getStudentGroupKey,
  ]);

  const totalFilteredStudents = useMemo(
    () =>
      filteredStudentGroups.reduce(
        (total, group) => total + group.students.length,
        0
      ),
    [filteredStudentGroups]
  );

  if (loading || !course) {
    return <Loader className="py-12" />;
  }

  const subjects = Array.isArray(course.subjects)
    ? course.subjects
    : course.subject
    ? [course.subject]
    : [];
  const visibleSubjects = isStudentUser
    ? studentAssignedSubjectNames
    : subjects;
  const formattedSubjects = visibleSubjects.join(", ");
  const classesCount =
    classStatsEntries.length ||
    (isStudentUser
      ? studentAssignedSubjectNames.length
      : visibleSubjects.length);
  const courseTeacherId = course?.teacherId;
  const hasTeacherAssignment =
    courseTeacherId !== undefined &&
    courseTeacherId !== null &&
    String(courseTeacherId).trim() !== "";
  const teacherDisplayName = teacher
    ? [teacher.firstName, teacher.lastName].filter(Boolean).join(" ").trim() ||
      teacher.username ||
      teacher.email
    : "";
  const teacherProfileId =
    teacher?.userID ??
    teacher?.UserID ??
    teacher?.id ??
    teacher?.userId ??
    courseTeacherId ??
    null;
  const isAdmin = user?.userType === "admin";
  const canModifyStudents = user?.userType === "teacher" || isAdmin;
  const enrolledStudentIds = Array.from(
    new Set(
      (students || [])
        .map((student) => resolveStudentId(student))
        .filter(Boolean)
    )
  );

  return (
    <div
      className={`relative flex flex-col p-1 md:p-1 rounded-xl shadow-md h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}
    >
      {/* Alert System */}
      {showAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in-down w-full max-w-md px-2 sm:px-0">
          <div
            className={`flex items-center justify-between p-3 sm:p-4 rounded-xl shadow-lg border ${getAlertBgColor()} ${getAlertTextColor()} mx-2`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {getAlertIcon()}
              <p className="font-medium text-sm sm:text-base">{alertMessage}</p>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className="hover:opacity-70 transition-opacity"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Conditionally render appropriate ClassStatsPanel based on user role */}
      {isStudentUser ? (
        <StudentClassStatsPanel
          open={showClassStatsPanel}
          classInfo={selectedClassInfo}
          onClose={handleCloseClassStats}
          studentId={studentIdentifierValues[0] || user?.StudentID || user?.studentID || user?.studentId || user?.id}
        />
      ) : (
        <TeacherClassStatsPanel
          open={showClassStatsPanel}
          classInfo={selectedClassInfo}
          onClose={handleCloseClassStats}
        />
      )}

      {/* Header Section */}
      <div className="mt-2 mb-3 md:mb-5">
        <div className="flex items-center justify-between mb-1 md:mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow">
              <FiBook className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {course.name}
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {course.code} {formattedSubjects && `• ${formattedSubjects}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm"
                >
                  <FiEdit className="w-4 h-4" /> Edit Course
                </button>
                {isCourseActive ? (
                  <button
                    onClick={handleDeactivateCourse}
                    disabled={deactivating}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm ml-2 disabled:opacity-60"
                  >
                    <FiTrash2 className="w-4 h-4" /> Inactivate
                  </button>
                ) : (
                  <button
                    onClick={handleReactivateCourse}
                    disabled={reactivating}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm ml-2 disabled:opacity-60"
                  >
                    <FiRefreshCw className="w-4 h-4" /> Reactivate
                  </button>
                )}
              </>
            )}
            <span className={statusBadgeClassName}>{statusBadgeLabel}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2 mb-1 md:mb-2">
          <div className="rounded-lg p-2 shadow border bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Students
                </p>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {students.length}
                </p>
              </div>
              <FiUsers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="rounded-lg p-2 shadow border bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  {activeStudents.length}
                </p>
              </div>
              <FiUserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="rounded-lg p-2 shadow border bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Inactive
                </p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  {inactiveStudents.length}
                </p>
              </div>
              <FiUserX className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="rounded-lg p-2 shadow border bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Classes
                </p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {classesCount}
                </p>
              </div>
              <FiBook className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        {/* Course Details */}
        <div className="rounded-lg p-3 border bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 mb-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Description
              </p>
              <p className="text-gray-900 dark:text-white">
                {course.description || "No description"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Academic Year
              </p>
              <p className="text-gray-900 dark:text-white">
                {course.academicYear || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Assigned Teacher
              </p>
              <p className="text-gray-900 dark:text-white">
                {teacherLoading
                  ? "Loading..."
                  : hasTeacherAssignment
                  ? teacher
                    ? teacherDisplayName
                    : "Teacher not available"
                  : "No teacher assigned"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Classes
              </p>
              {classStatsEntries.length ? (
                <div className="flex flex-wrap gap-2">
                  {classStatsEntries.map((entry) => {
                    const isActiveChip =
                      showClassStatsPanel && selectedClassKey === entry.key;
                    return (
                      <button
                        key={entry.key}
                        type="button"
                        onClick={() => handleClassChipClick(entry.key)}
                        aria-pressed={isActiveChip}
                        className={`px-2 py-1 text-xs font-medium rounded-full border transition-colors duration-150 transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-indigo-500 ${
                          isActiveChip
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <FiLayers
                            className={`w-3 h-3 ${
                              isActiveChip
                                ? "text-white"
                                : "text-indigo-600 dark:text-indigo-300"
                            }`}
                            aria-hidden="true"
                          />
                          <span>{entry.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {formattedSubjects && String(formattedSubjects).trim()
                    ? formattedSubjects
                    : "No classes assigned"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Do not show enrolled students list to student users */}
      {user?.userType !== "student" && (
        <>
          {/* Students Management Section */}
          <div className="flex-grow overflow-y-auto mb-1 md:mb-2">
            <div className="rounded-lg p-1 md:p-2 h-full overflow-y-auto bg-gray-100 dark:bg-gray-700/30">
              {/* Header with Search and Actions */}
              <div className="flex flex-col md:flex-row gap-1 md:gap-2 mb-1 md:mb-2">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search students by name, email, or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* Enrollment Tabs */}
                <div className="flex flex-wrap gap-1">
                  {["active", "inactive"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStudentTab(tab)}
                      className={`px-2 py-1.5 text-xs rounded-lg font-medium ${
                        studentTab === tab
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {tab === "active" ? "Active" : "Inactive"}
                    </button>
                  ))}
                </div>

                {/* Add Student Button */}
                {canModifyStudents && (
                  <div className="relative" ref={studentMenuRef}>
                    <button
                      onClick={() => setShowStudentMenu((s) => !s)}
                      disabled={addingStudents}
                      className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      <FiPlus className="w-4 h-4" /> Add Student
                    </button>
                    {showStudentMenu && (
                      <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-20 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setShowStudentMenu(false);
                            setStudentActionError("");
                            setShowStudentPicker(true);
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FiUsers className="w-4 h-4 mr-3" />
                          Add Existing Student
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowStudentMenu(false);
                            setStudentActionError("");
                            setRegisterStep(1);
                            setPendingRegisterCore(null);
                            setRegisterSelectedSubjectIds([]);
                            setRegisterSubjectError("");
                            setShowRegisterModal(true);
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FiUserCheck className="w-4 h-4 mr-3" />
                          Register New Student
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {studentsError && (
                <div className="mt-3 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                  {studentsError}
                </div>
              )}
              {studentActionError && (
                <div className="mt-3 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                  {studentActionError}
                </div>
              )}

              {/* Students Table */}
              <div className="rounded-xl border overflow-hidden bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600">
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-8 rounded-xl h-full">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 border-4 rounded-full animate-spin border-indigo-200 dark:border-indigo-800"></div>
                        <div className="absolute inset-0 w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Loading students...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider">
                              Student
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider hidden md:table-cell">
                              Email
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider hidden lg:table-cell">
                              Roll Number
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold tracking-wider hidden lg:table-cell">
                              Enrollment Date
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-semibold tracking-wider">
                              Status
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-semibold tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredStudentGroups.map((group) => {
                            const groupLabel = group.subjectCode
                              ? `${group.displayName} (${group.subjectCode})`
                              : group.displayName;

                            return (
                              <Fragment key={`group-${group.id}`}>
                                <tr className="bg-gray-100 dark:bg-gray-800/40">
                                  <td
                                    colSpan={6}
                                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>{groupLabel}</span>
                                      <span className="text-[0.65rem] font-normal text-gray-500 dark:text-gray-400">
                                        {group.students.length} student
                                        {group.students.length === 1 ? "" : "s"}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {group.students.map((student, index) => {
                                  const enrollmentId =
                                    resolveEnrollmentId(student);
                                  const loading = enrollmentId
                                    ? Boolean(
                                        enrollmentLoadingMap[enrollmentId]
                                      )
                                    : false;
                                  const detailPath =
                                    getStudentDetailsPath(student);
                                  const name =
                                    `${
                                      student.FirstName ||
                                      student.firstName ||
                                      ""
                                    } ${
                                      student.LastName || student.lastName || ""
                                    }`
                                      .replace(/\s+/g, " ")
                                      .trim() || "Unnamed Student";
                                  const email =
                                    student.Email ||
                                    student.email ||
                                    "No email";
                                  const rollNumber =
                                    student.RollNumber ||
                                    student.rollNumber ||
                                    "N/A";
                                  const enrollmentDate = formatEnrollmentDate(
                                    student.EnrollmentDate ??
                                      student.enrollmentDate
                                  );
                                  const isActive =
                                    resolveEnrollmentActive(student);
                                  const rowKey = `${group.id ?? "group"}-${
                                    enrollmentId ||
                                    resolveStudentId(student) ||
                                    index
                                  }`;

                                  return (
                                    <tr
                                      key={rowKey}
                                      className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    >
                                      <td className="px-3 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                          <Avatar
                                            name={name}
                                            size="sm"
                                            user={student}
                                            src={
                                              student?.ProfilePicture ??
                                              student?.profilePicture ??
                                              student?.User?.ProfilePicture ??
                                              student?.User?.profilePicture ??
                                              student?.UserDetails
                                                ?.ProfilePicture ??
                                              student?.UserDetails
                                                ?.profilePicture ??
                                              student?.User
                                                ?.ProfilePictureUrl ??
                                              student?.User
                                                ?.profilePictureUrl ??
                                              student?.User
                                                ?.profilePictureURL ??
                                              student?.UserDetails
                                                ?.ProfilePictureUrl ??
                                              student?.UserDetails
                                                ?.profilePictureUrl ??
                                              student?.UserDetails
                                                ?.profilePictureURL ??
                                              student?.ProfilePictureUrl ??
                                              student?.profilePictureUrl ??
                                              student?.profilePictureURL ??
                                              null
                                            }
                                          />
                                          <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                              {detailPath ? (
                                                <Link
                                                  to={detailPath}
                                                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                                                >
                                                  {name}
                                                </Link>
                                              ) : (
                                                name
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden md:table-cell">
                                        {email}
                                      </td>
                                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
                                        {rollNumber}
                                      </td>
                                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
                                        {enrollmentDate}
                                      </td>
                                      <td className="px-3 py-3 whitespace-nowrap text-center">
                                        <span
                                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                            isActive
                                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                                          }`}
                                        >
                                          {isActive ? (
                                            <>
                                              <FiUserCheck className="w-3 h-3" />
                                              <span className="hidden xs:inline">
                                                Active
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <FiUserX className="w-3 h-3" />
                                              <span className="hidden xs:inline">
                                                Inactive
                                              </span>
                                            </>
                                          )}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3 whitespace-nowrap text-center">
                                        {canModifyStudents && (
                                          <button
                                            onClick={() =>
                                              isActive
                                                ? handleRemoveEnrollment(
                                                    student
                                                  )
                                                : handleReactivateEnrollment(
                                                    student
                                                  )
                                            }
                                            disabled={loading || !enrollmentId}
                                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                                              loading || !enrollmentId
                                                ? "opacity-50 cursor-not-allowed text-gray-400"
                                                : isActive
                                                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-800/50"
                                                : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-800/50"
                                            }`}
                                          >
                                            {loading
                                              ? "Processing..."
                                              : isActive
                                              ? "Remove"
                                              : "Activate"}
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>

                      {totalFilteredStudents === 0 && (
                        <div className="text-center py-8 h-full flex items-center justify-center">
                          <div>
                            <FiUsers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              No students found
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Try adjusting your search or filters
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <StudentPickerModal
        isOpen={showStudentPicker}
        onClose={handleStudentPickerClose}
        onConfirm={handleExistingStudentConfirm}
        initialSelected={[]}
        excludedIds={enrolledStudentIds}
        subjectOptions={courseSubjectOptions}
        title="Add Existing Students"
        saving={addingStudents}
        errorMessage={studentActionError}
      />

      {/* Register New Student Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-2">
          <div className="rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
            <div className="relative">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <FiUserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-bold">Register New Student</h2>
                </div>
                <button
                  onClick={handleRegisterModalClose}
                  className="p-1 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FiX className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4">
                <UserForm
                  onSubmit={handleRegisterStudentSubmit}
                  loading={registerStep === 2 && addingStudents}
                  forceUserType={3}
                  showCoreFields={registerStep === 1}
                  showRoleFields={registerStep === 2}
                  submitLabel={registerStep === 1 ? "Next" : "Create Student"}
                  additionalRoleContent={({ userTypeID }) => {
                    if (String(userTypeID) !== "3") {
                      return null;
                    }

                    if (!courseSubjectOptions.length) {
                      return (
                        <div className="mt-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          This course does not have any linked classes. The
                          student will be enrolled at the course level.
                        </div>
                      );
                    }

                    return (
                      <div className="mt-6 space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Select classes for this student
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                            {registerSelectedSubjectIds.length} selected
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {courseSubjectOptions.map((option) => {
                            const optionId = String(option.id);
                            const checked =
                              registerSelectedSubjectIds.includes(optionId);
                            return (
                              <label
                                key={`reg-subject-${optionId}`}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                                  checked
                                    ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
                                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={checked}
                                  disabled={
                                    registerStep === 2 && addingStudents
                                  }
                                  onChange={(event) => {
                                    const { checked: isChecked } = event.target;
                                    setRegisterSelectedSubjectIds((prev) => {
                                      const next = new Set(
                                        prev.map((id) => String(id))
                                      );
                                      if (isChecked) {
                                        next.add(optionId);
                                      } else {
                                        next.delete(optionId);
                                      }
                                      setRegisterSubjectError("");
                                      return Array.from(next);
                                    });
                                  }}
                                />
                                <span className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {option.label}
                                  </span>
                                  {option.code ? (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {option.code}
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {registerSubjectError ? (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {registerSubjectError}
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage("")}
      />

      {/* Edit Course Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit course — ${course.name}`}
        size="lg"
      >
        <CourseForm
          initialData={{
            name: course.name,
            code: course.code,
            description: course.description,
            academicYear: course.academicYear,
            subjectId: course.subjectId,
            subjects: Array.isArray(course.subjects)
              ? course.subjects
              : course.subject
              ? [course.subject]
              : [],
            teacherId: course.teacherId,
          }}
          onCancel={() => setShowEditModal(false)}
          loading={savingEdit}
          onSubmit={async (values) => {
            setSavingEdit(true);
            try {
              const subjectsList = Array.isArray(values.subjects)
                ? values.subjects
                : [];

              const courseIdValue = course?.id ?? course?.CourseID ?? id;
              const courseNameValue = course?.name ?? course?.CourseName ?? "";
              const courseCodeValue = course?.code ?? course?.CourseCode ?? "";

              const normalizeValue = (value) => String(value ?? "").trim();
              const normalizeKey = (value) =>
                normalizeValue(value).toLowerCase();

              const subjectsByName = new Map();
              const subjectsById = new Map();

              const registerSubjectLookup = (subject) => {
                if (!subject) return;
                const idCandidate =
                  subject?.id ??
                  subject?.SubjectID ??
                  subject?.subjectId ??
                  subject?.subjectID ??
                  null;
                const nameKey = normalizeKey(
                  subject?.name ??
                    subject?.subjectName ??
                    subject?.SubjectName ??
                    subject?.title ??
                    subject?.Title
                );
                if (idCandidate !== null && idCandidate !== undefined) {
                  const idKey = String(idCandidate);
                  if (!subjectsById.has(idKey)) {
                    subjectsById.set(idKey, subject);
                  }
                }
                if (nameKey && !subjectsByName.has(nameKey)) {
                  subjectsByName.set(nameKey, subject);
                }
              };

              try {
                const existingSubjects = await getAllSubjects();
                for (const entry of existingSubjects || []) {
                  registerSubjectLookup(entry);
                }
              } catch (lookupError) {
                console.warn(
                  "Unable to prefetch subjects before course update",
                  lookupError
                );
              }

              let primarySubjectId =
                values.subjectId ??
                values.SubjectID ??
                values.subjectID ??
                course?.subjectId ??
                course?.SubjectID ??
                null;

              for (const [index, subjectEntry] of subjectsList.entries()) {
                try {
                  const nameRaw =
                    typeof subjectEntry === "string"
                      ? subjectEntry
                      : subjectEntry?.name ??
                        subjectEntry?.subjectName ??
                        subjectEntry?.SubjectName ??
                        "";
                  const trimmedName = normalizeValue(nameRaw);
                  if (!trimmedName) continue;

                  let subjectId =
                    subjectEntry?.id ??
                    subjectEntry?.SubjectID ??
                    subjectEntry?.subjectId ??
                    subjectEntry?.subjectID ??
                    subjectEntry?.draft?.id ??
                    subjectEntry?.draft?.SubjectID ??
                    subjectEntry?.draft?.subjectId ??
                    null;

                  let subjectRecord = null;
                  if (subjectId !== null && subjectId !== undefined) {
                    subjectRecord =
                      subjectsById.get(String(subjectId)) ??
                      subjectEntry?.draft ??
                      null;
                  }

                  if (!subjectRecord) {
                    const match = subjectsByName.get(normalizeKey(trimmedName));
                    if (match) {
                      subjectRecord = match;
                      if (subjectId === null || subjectId === undefined) {
                        subjectId =
                          match?.id ??
                          match?.SubjectID ??
                          match?.subjectId ??
                          match?.subjectID ??
                          null;
                      }
                    }
                  }

                  const baseSource =
                    subjectRecord ?? subjectEntry?.draft ?? subjectEntry;

                  if (subjectId === null || subjectId === undefined) {
                    const creationPayload = {
                      name: trimmedName,
                      subjectName: trimmedName,
                    };
                    const codeCandidate =
                      baseSource?.subjectCode ??
                      baseSource?.SubjectCode ??
                      baseSource?.code ??
                      baseSource?.Code;
                    if (codeCandidate) {
                      creationPayload.subjectCode = codeCandidate;
                    }
                    const descriptionCandidate =
                      baseSource?.description ?? baseSource?.Description;
                    if (descriptionCandidate) {
                      creationPayload.description = descriptionCandidate;
                    }

                    const created = await createSubject(creationPayload);
                    subjectId =
                      created?.id ??
                      created?.SubjectID ??
                      created?.subjectId ??
                      created?.subjectID ??
                      null;
                    subjectRecord = {
                      ...creationPayload,
                      ...created,
                      id: subjectId,
                      name: created?.name ?? trimmedName,
                    };
                    registerSubjectLookup(subjectRecord);
                  }

                  if (subjectId !== null && subjectId !== undefined) {
                    const payload = {
                      name:
                        baseSource?.name ??
                        baseSource?.subjectName ??
                        baseSource?.SubjectName ??
                        trimmedName,
                      subjectName:
                        baseSource?.subjectName ??
                        baseSource?.SubjectName ??
                        baseSource?.name ??
                        trimmedName,
                      SubjectName:
                        baseSource?.subjectName ??
                        baseSource?.SubjectName ??
                        baseSource?.name ??
                        trimmedName,
                      subjectCode:
                        baseSource?.subjectCode ??
                        baseSource?.SubjectCode ??
                        baseSource?.code ??
                        baseSource?.Code ??
                        subjectRecord?.subjectCode ??
                        subjectRecord?.SubjectCode ??
                        subjectRecord?.code ??
                        subjectRecord?.Code,
                      SubjectCode:
                        baseSource?.subjectCode ??
                        baseSource?.SubjectCode ??
                        baseSource?.code ??
                        baseSource?.Code ??
                        subjectRecord?.subjectCode ??
                        subjectRecord?.SubjectCode ??
                        subjectRecord?.code ??
                        subjectRecord?.Code,
                      description:
                        baseSource?.description ??
                        baseSource?.Description ??
                        subjectRecord?.description ??
                        subjectRecord?.Description,
                      Description:
                        baseSource?.description ??
                        baseSource?.Description ??
                        subjectRecord?.description ??
                        subjectRecord?.Description,
                      courseId: courseIdValue,
                      CourseID: courseIdValue,
                      CourseId: courseIdValue,
                      courseName: courseNameValue,
                      CourseName: courseNameValue,
                      courseCode: courseCodeValue,
                      CourseCode: courseCodeValue,
                    };

                    await updateSubject(subjectId, payload);

                    registerSubjectLookup({
                      ...subjectRecord,
                      id: subjectId,
                      name: trimmedName,
                    });

                    if (index === 0 && !primarySubjectId) {
                      primarySubjectId = subjectId;
                    }
                  }
                } catch (innerErr) {
                  console.error(
                    "Failed to synchronise subject during course edit:",
                    innerErr
                  );
                }
              }

              const { subjects, ...courseValues } = values;

              // Build SubjectIDs to send to backend (after ensuring any new subjects were created above)
              const subjectIds = (subjects || [])
                .map((s) =>
                  s && typeof s === "object"
                    ? s?.id ??
                      s?.SubjectID ??
                      s?.subjectId ??
                      s?.draft?.id ??
                      null
                    : null
                )
                .filter((v) => v !== null && v !== undefined)
                .map((v) => (typeof v === "string" ? Number(v) : v));

              if (primarySubjectId !== null && primarySubjectId !== undefined) {
                courseValues.subjectId = primarySubjectId;
                courseValues.SubjectID = primarySubjectId;
                if (!subjectIds.length) subjectIds.push(primarySubjectId);
              }

              courseValues.SubjectIDs = subjectIds;

              const updated = await updateCourse(id, courseValues);
              setCourse(updated);
              setShowEditModal(false);
              showAlertMessage("Course updated successfully!", "success");
            } catch (err) {
              console.error("Failed to update course:", err);
              showAlertMessage(
                "Failed to update course. Please try again.",
                "error"
              );
            } finally {
              setSavingEdit(false);
            }
          }}
        />
      </Modal>
    </div>
  );
};

export default CourseView;
