import { useState, useEffect, useCallback, useMemo } from "react";

// import { Link, useParams, useNavigate } from "react-router-dom";

import { Link, useParams, useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import {
  getUserById,
  updateUser,
  updateProfilePhoto,
} from "../../services/userService";
import {
  getTeacherCourses,
  getStudentCourses,
  updateCourse,
} from "../../services/courseService";
import {
  createEnrollmentsForStudent,
  getEnrollmentsByStudent,
  deleteEnrollment,
} from "../../services/enrollmentService";
import { getStudentById } from "../../services/studentService";
import {
  getTeacherById,
  updateTeacher as updateTeacherService,
} from "../../services/teacherService";
import { getEnrolledSubjectsByStudent } from "../../services/subjectService";
import UserForm from "../../components/users/UserForm";
import Card from "../../components/common/Card";
import Avatar from "../../components/common/Avatar";
import Loader from "../../components/common/Loader";
import CoursePickerModal from "../../components/courses/CoursePickerModal";
import AttendanceList from "../../components/attendance/AttendanceList";
import { getStudentAttendance } from "../../services/attendanceService";
import ClassStatsPanel from "../../components/courses/ClassStatsPanel";
import StudentClassStatsPanel from "../../components/courses/StudentClassStatsPanel";
import { FiLayers } from "react-icons/fi";
// No direct CourseCard usage here because admin links differ from teacher view

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </span>
    <span className="text-sm text-gray-900 dark:text-gray-100 break-all">
      {value ?? "-"}
    </span>
  </div>
);

const Pill = ({ children, color = "indigo" }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-800`}
  >
    {children}
  </span>
);

const normalizeKeyValue = (value) => {
  if (value === null || value === undefined) return null;
  const str =
    typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (!str) return null;
  if (/^-?\d+$/.test(str)) {
    const parsed = Number(str);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return str;
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

const UserDetailsPage = ({
  allowEdit = true,
  showManageLink = false,
  manageLinkPath = "/admin/users",
  manageLinkText = "Manage Users",
  backPath,
  heading = "User Details",
  listLabel = "Users",
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState("");
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [isAssignCoursesOpen, setIsAssignCoursesOpen] = useState(false);
  const [assigningCourses, setAssigningCourses] = useState(false);
  const [assignCoursesError, setAssignCoursesError] = useState("");
  const [selectedClassKey, setSelectedClassKey] = useState(null);
  const [isClassStatsOpen, setIsClassStatsOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollingCourses, setEnrollingCourses] = useState(false);
  const [enrollCoursesError, setEnrollCoursesError] = useState("");
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [unenrollingId, setUnenrollingId] = useState(null);
  const [unenrollError, setUnenrollError] = useState("");
  const [enrolledSubjectsByCourse, setEnrolledSubjectsByCourse] = useState([]);
  const [enrolledSubjectsLoading, setEnrolledSubjectsLoading] = useState(false);
  const [enrolledSubjectsError, setEnrolledSubjectsError] = useState("");

  const isTeacherUser = useMemo(() => {
    if (!user) return false;
    const roleId = String(user.UserTypeID || user.userTypeID || "").trim();
    if (roleId === "2") return true;
    const roleName = String(user.userType || "").toLowerCase();
    return roleName === "teacher";
  }, [user]);

  const isStudentUser = useMemo(() => {
    if (!user) return false;
    const roleId = String(user.UserTypeID || user.userTypeID || "").trim();
    if (roleId === "3") return true;
    const roleName = String(user.userType || "").toLowerCase();
    return roleName === "student";
  }, [user]);

  // const isTeacherViewer = useMemo(() => {
  //   if (!authUser) return false;
  //   const roleId = String(
  //     authUser.UserTypeID || authUser.userTypeID || ""
  //   ).trim();
  //   if (roleId === "2") return true;
  //   const roleName = String(
  //     authUser.userType || authUser.UserType || ""
  //   ).toLowerCase();
  //   return roleName === "teacher";
  // }, [authUser]);

  // const viewerTeacherId = useMemo(() => {
  //   if (!isTeacherViewer) return null;
  //   const candidates = [
  //     authUser?.TeacherID,
  //     authUser?.teacherID,
  //     authUser?.teacherId,
  //     authUser?.UserID,
  //     authUser?.userID,
  //     authUser?.userId,
  //     authUser?.id,
  //   ];

  //   for (const value of candidates) {
  //     if (value === undefined || value === null) continue;
  //     const str = String(value).trim();
  //     if (str.length) {
  //       return str;
  //     }
  //   }

  //   return null;
  // }, [authUser, isTeacherViewer]);

  const teacherIdentifier = useMemo(() => {
    const candidates = [
      user?.TeacherID,
      user?.teacherID,
      user?.teacherId,
      teacherDetails?.TeacherID,
      teacherDetails?.teacherID,
      teacherDetails?.teacherId,
      teacherDetails?.id,
      user?.UserID,
      user?.id,
    ];
    for (const value of candidates) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str.length) return str;
    }
    return "";
  }, [teacherDetails, user]);

  const resolvedTeacherId = useMemo(() => {
    if (!teacherIdentifier) return null;
    return !Number.isNaN(Number(teacherIdentifier))
      ? Number(teacherIdentifier)
      : teacherIdentifier;
  }, [teacherIdentifier]);

  const handleBackClick = () => {
    if (backPath) {
      navigate(backPath);
      return;
    }
    navigate(-1);
  };

  const startEditing = () => {
    if (!allowEdit) return;
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await getUserById(id);
        setUser(data);
      } catch (err) {
        setError("Failed to load user details");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  // When the loaded user is a teacher or student, fetch their courses for admin view

  const loadCourses = useCallback(async () => {
    if (!user) {
      setCourses([]);
      return;
    }

    try {
      setCoursesLoading(true);
      setCoursesError("");

      if (isTeacherUser) {
        if (!teacherIdentifier) {
          setCourses([]);
          return;
        }

        const normalizedTeacherId = !Number.isNaN(Number(teacherIdentifier))
          ? Number(teacherIdentifier)
          : teacherIdentifier;
        const list = await getTeacherCourses(normalizedTeacherId);
        setCourses(Array.isArray(list) ? list : []);
        return;
      }

      // if (isStudentUser) {
      //   const rawStudentId =
      //     user.StudentID ??
      //     user.studentID ??
      //     user.studentId ??
      //     user.id ??
      //     user.UserID ??
      //     user.userID ??
      //     null;

      //   if (!rawStudentId) {
      //     setCourses([]);
      //     return;
      //   }

      //   const normalizedStudentId = !Number.isNaN(Number(rawStudentId))
      //     ? Number(rawStudentId)
      //     : rawStudentId;
      //   const list = await getEnrollmentsByStudent(normalizedStudentId);

      //   // By default show all courses from the student record. If the
      //   // current viewer is a teacher, filter the shown enrolled courses to
      //   // only those that are assigned to the viewing teacher (as per the
      //   // student's course objects).
      //   let scopedCourses = Array.isArray(list) ? list : [];

      //   // If the current viewer is a teacher, only show the student's
      //   // courses that are assigned to that teacher. We compute the viewer
      //   // identity from `authUser` locally here to avoid referencing hooks
      //   // that may be declared later in the file (prevents TDZ errors).
      //   const viewerIsTeacher = (() => {
      //     if (!authUser) return false;
      //     const idVal = String(
      //       authUser.UserTypeID || authUser.userTypeID || ""
      //     ).trim();
      //     if (idVal === "2") return true;
      //     const name = String(
      //       authUser.userType || authUser.UserType || ""
      //     ).toLowerCase();
      //     return name === "teacher";
      //   })();

      //   if (viewerIsTeacher) {
      //     const viewerTeacherIdLocal = (() => {
      //       if (!authUser) return null;
      //       const candidates = [
      //         authUser?.TeacherID,
      //         authUser?.teacherID,
      //         authUser?.teacherId,
      //         authUser?.UserID,
      //         authUser?.userID,
      //         authUser?.userId,
      //         authUser?.id,
      //       ];
      //       for (const value of candidates) {
      //         if (value === undefined || value === null) continue;
      //         const str = String(value).trim();
      //         if (str.length) return str;
      //       }
      //       return null;
      //     })();

      //     if (viewerTeacherIdLocal) {
      //       const teacherIdStr = String(viewerTeacherIdLocal).trim();
      //       const matchesViewerTeacher = (course) => {
      //         if (!course) return false;
      //         const potentials = [
      //           course.teacherId,
      //           course.teacherID,
      //           course.TeacherId,
      //           course.TeacherID,
      //           course?.teacher?.teacherId,
      //           course?.teacher?.teacherID,
      //           course?.teacher?.TeacherId,
      //           course?.teacher?.TeacherID,
      //           course?.teacher?.id,
      //           course?.teacher?.Id,
      //           course?.teacher?.userId,
      //           course?.teacher?.UserID,
      //           course?.teacher?.user?.userID,
      //           course?.teacher?.user?.userId,
      //         ];

      //         return potentials.some((value) => {
      //           if (value === undefined || value === null) return false;
      //           const candidate = String(value).trim();
      //           return candidate.length && candidate === teacherIdStr;
      //         });
      //       };

      //       scopedCourses = scopedCourses.filter(matchesViewerTeacher);
      //     }
      //   }

      //   setCourses(scopedCourses);

      //   try {
      //     const enrolls = await getEnrollmentsByStudent(normalizedStudentId);
      //     setStudentEnrollments(Array.isArray(enrolls) ? enrolls : []);
      //   } catch (e) {
      //     console.warn("Failed to load student enrollments", e);
      //     setStudentEnrollments([]);
      //   }
      //   return;
      // }

      if (isStudentUser) {
        const rawStudentId =
          user.StudentID ??
          user.studentID ??
          user.studentId ??
          user.id ??
          user.UserID ??
          user.userID ??
          null;

        if (!rawStudentId) {
          setCourses([]);
          setStudentEnrollments([]);
          return;
        }

        const normalizedStudentId = !Number.isNaN(Number(rawStudentId))
          ? Number(rawStudentId)
          : rawStudentId;

        // 1) Get enrollments for this student
        const list = await getEnrollmentsByStudent(normalizedStudentId);
        const allEnrollments = Array.isArray(list) ? list : [];

        // 2) If the current viewer is a teacher, only keep enrollments whose Course belongs to that teacher
        const viewerIsTeacher = (() => {
          if (!authUser) return false;
          const idVal = String(
            authUser.UserTypeID || authUser.userTypeID || ""
          ).trim();
          if (idVal === "2") return true;
          const name = String(
            authUser.userType || authUser.UserType || ""
          ).toLowerCase();
          return name === "teacher";
        })();

        let scopedEnrollments = allEnrollments;

        if (viewerIsTeacher) {
          const viewerTeacherIdLocal = (() => {
            if (!authUser) return null;
            const candidates = [
              authUser?.TeacherID,
              authUser?.teacherID,
              authUser?.teacherId,
              authUser?.UserID,
              authUser?.userID,
              authUser?.userId,
              authUser?.id,
            ];
            for (const value of candidates) {
              if (value === undefined || value === null) continue;
              const str = String(value).trim();
              if (str.length) return str;
            }
            return null;
          })();

          if (viewerTeacherIdLocal) {
            const teacherIdStr = String(viewerTeacherIdLocal).trim();

            const matchesViewerTeacher = (enrollment) => {
              const course = enrollment?.Course || enrollment?.course;
              if (!course) return false;

              const potentials = [
                course.teacherId,
                course.teacherID,
                course.TeacherId,
                course.TeacherID,
                course?.teacher?.teacherId,
                course?.teacher?.teacherID,
                course?.teacher?.TeacherId,
                course?.teacher?.TeacherID,
                course?.teacher?.id,
                course?.teacher?.Id,
                course?.teacher?.userId,
                course?.teacher?.UserID,
                course?.teacher?.user?.userID,
                course?.teacher?.user?.userId,
              ];

              return potentials.some((value) => {
                if (value === undefined || value === null) return false;
                const candidate = String(value).trim();
                return candidate.length && candidate === teacherIdStr;
              });
            };

            scopedEnrollments = scopedEnrollments.filter(matchesViewerTeacher);
          }
        }

        // 3) Derive courses from enrollments (Course is already formatted by the service)
        const scopedCourses = scopedEnrollments
          .map((enr) => enr.Course || enr.course)
          .filter(Boolean);

        setCourses(scopedCourses);
        setStudentEnrollments(scopedEnrollments);
        return;
      }

      // Not teacher or student, skip
      setCourses([]);
    } catch (err) {
      setCoursesError(
        isTeacherUser
          ? "Failed to load teacher courses"
          : isStudentUser
          ? "Failed to load student courses"
          : "Failed to load courses"
      );
    } finally {
      setCoursesLoading(false);
    }

    // }, [
    //   isStudentUser,
    //   isTeacherUser,
    //   teacherIdentifier,
    //   user,
    //   isTeacherViewer,
    //   viewerTeacherId,
    // ]);
  }, [isStudentUser, isTeacherUser, teacherIdentifier, user, authUser]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const assignedCourseIds = useMemo(() => {
    return (courses || [])
      .map((course) => {
        const id =
          course?.id ??
          course?.CourseID ??
          course?.courseId ??
          course?.CourseId;
        if (id === undefined || id === null) return null;
        const str = String(id).trim();
        return str.length ? str : null;
      })
      .filter(Boolean);
  }, [courses]);

  const enrolledClassSummaries = useMemo(() => {
    if (!Array.isArray(enrolledSubjectsByCourse)) return [];

    return enrolledSubjectsByCourse
      .map((entry) => {
        if (!entry) return null;

        const courseIdCandidates = [
          entry.courseId,
          entry.CourseID,
          entry.courseID,
          entry.CourseId,
          entry.id,
          entry.Id,
        ];

        let courseId = null;
        for (const candidate of courseIdCandidates) {
          const normalized = normalizeKeyValue(candidate);
          if (normalized !== null) {
            courseId = normalized;
            break;
          }
        }

        const courseName = String(
          entry.courseName ?? entry.CourseName ?? entry.name ?? entry.Name ?? ""
        ).trim();

        const subjectsSource =
          entry.subjects ?? entry.Subjects ?? entry.classes ?? entry.Classes;

        const subjectsArray = Array.isArray(subjectsSource)
          ? subjectsSource
          : [];

        const seenSubjectKeys = new Set();
        const normalizedSubjects = subjectsArray
          .map((subject) => {
            if (subject === null || subject === undefined) return null;

            if (typeof subject !== "object") {
              const subjectName = String(subject || "").trim();
              if (!subjectName) return null;
              const key = `name:${subjectName.toLowerCase()}`;
              if (seenSubjectKeys.has(key)) return null;
              seenSubjectKeys.add(key);
              return {
                subjectId: null,
                subjectName,
              };
            }

            const subjectIdCandidates = [
              subject.subjectId,
              subject.SubjectID,
              subject.subjectID,
              subject.SubjectId,
              subject.id,
              subject.Id,
            ];
            let subjectId = null;
            for (const candidate of subjectIdCandidates) {
              const normalized = normalizeKeyValue(candidate);
              if (normalized !== null) {
                subjectId = normalized;
                break;
              }
            }

            const subjectName = String(
              subject.subjectName ??
                subject.SubjectName ??
                subject.name ??
                subject.Name ??
                subject.Title ??
                subject.title ??
                ""
            ).trim();
            if (!subjectName) return null;

            const key =
              subjectId !== null && subjectId !== undefined
                ? `id:${subjectId}`
                : `name:${subjectName.toLowerCase()}`;
            if (seenSubjectKeys.has(key)) return null;
            seenSubjectKeys.add(key);

            return {
              subjectId,
              subjectName,
            };
          })
          .filter(Boolean);

        if (!courseName && !normalizedSubjects.length && courseId === null) {
          return null;
        }

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
              .map((subject) =>
                subject.subjectId !== null && subject.subjectId !== undefined
                  ? `sid:${subject.subjectId}`
                  : `sname:${subject.subjectName.toLowerCase()}`
              )
              .join("|")
          );
        }

        const key =
          summaryKeyParts.length > 0
            ? summaryKeyParts.join("::")
            : courseName || undefined;

        return {
          courseId,
          courseName,
          subjects: normalizedSubjects,
          key,
        };
      })
      .filter(Boolean);
  }, [enrolledSubjectsByCourse]);

  const studentSubjects = useMemo(() => {
    if (enrolledClassSummaries.length) {
      const nameSet = new Set();
      enrolledClassSummaries.forEach((entry) => {
        entry.subjects.forEach((subject) => {
          const subjectName = String(subject.subjectName || "").trim();
          if (subjectName) {
            nameSet.add(subjectName);
          }
        });
      });
      if (nameSet.size) {
        return Array.from(nameSet);
      }
    }

    const collected = [];
    if (!Array.isArray(courses)) return collected;

    for (const c of courses) {
      if (!c) continue;
      if (Array.isArray(c.subjects) && c.subjects.length) {
        for (const s of c.subjects) {
          if (s === undefined || s === null) continue;
          const name = typeof s === "string" ? s.trim() : String(s || "");
          if (name) collected.push(name);
        }
      } else if (c.subject) {
        const name = String(c.subject || "").trim();
        if (name) collected.push(name);
      } else if (
        c.subjectDetails &&
        (c.subjectDetails.name || c.subjectDetails.SubjectName)
      ) {
        const name = (
          c.subjectDetails.name ||
          c.subjectDetails.SubjectName ||
          ""
        ).trim();
        if (name) collected.push(name);
      }
    }

    return Array.from(new Set(collected));
  }, [enrolledClassSummaries, courses]);

  const displayClassNames = useMemo(() => {
    // Prefer server-provided enrolled classes (scoped and filtered earlier).
    if (enrolledSubjectsLoading) return [];

    if (
      Array.isArray(enrolledClassSummaries) &&
      enrolledClassSummaries.length
    ) {
      const set = new Set();
      for (const entry of enrolledClassSummaries) {
        if (!entry || !Array.isArray(entry.subjects)) continue;
        for (const s of entry.subjects) {
          const name = String(
            s?.subjectName ?? s?.SubjectName ?? s?.name ?? ""
          ).trim();
          if (name) set.add(name);
        }
      }
      if (set.size) return Array.from(set);
    }

    // Fallback: use previously-derived studentSubjects
    if (Array.isArray(studentSubjects) && studentSubjects.length) {
      return Array.from(
        new Set(studentSubjects.map((s) => String(s).trim()).filter(Boolean))
      );
    }

    return [];
  }, [enrolledClassSummaries, studentSubjects, enrolledSubjectsLoading]);

  // Compute class stats entries for the ClassStatsPanel
  const classStatsEntries = useMemo(() => {
    if (
      !isStudentUser ||
      !enrolledClassSummaries ||
      enrolledClassSummaries.length === 0
    ) {
      return [];
    }

    const entries = [];

    enrolledClassSummaries.forEach((courseSummary, courseIndex) => {
      const courseId = normalizeIdString(
        courseSummary.courseId ??
          courseSummary.CourseID ??
          courseSummary.courseID ??
          courseSummary.id
      );

      const courseName = String(
        courseSummary.courseName ??
          courseSummary.CourseName ??
          courseSummary.name ??
          ""
      ).trim();

      const subjects = Array.isArray(courseSummary.subjects)
        ? courseSummary.subjects
        : [];

      subjects.forEach((subject, subjectIndex) => {
        const subjectId = normalizeIdString(
          subject.subjectId ??
            subject.SubjectID ??
            subject.subjectID ??
            subject.id
        );

        const subjectName = String(
          subject.subjectName ?? subject.SubjectName ?? subject.name ?? ""
        ).trim();

        if (!subjectName) return;

        const entryKey =
          subjectId || `${courseId || "course"}-${courseIndex}-${subjectIndex}`;
        const label = subjectName;
        const code = "";

        // Get attendance records for this subject
        const attendanceRecords = [];
        let presentCount = 0;
        let latestAttendanceDate = null;

        if (Array.isArray(studentAttendance)) {
          studentAttendance.forEach((record) => {
            // Match by subject ID or name
            const recordSubjectId = normalizeIdString(
              record.SubjectID ?? record.subjectID ?? record.subjectId
            );
            const recordSubjectName = String(
              record.SubjectName ?? record.subjectName ?? record.subject ?? ""
            )
              .trim()
              .toLowerCase();

            const matchesSubject =
              (subjectId && recordSubjectId === subjectId) ||
              (subjectName && recordSubjectName === subjectName.toLowerCase());

            if (matchesSubject) {
              const status = String(
                record.Status ?? record.status ?? ""
              ).toLowerCase();
              const statusLabel =
                status.charAt(0).toUpperCase() + status.slice(1);
              const statusKey = status;

              const attendanceDate =
                record.Date ??
                record.date ??
                record.AttendanceDate ??
                record.attendanceDate;

              if (status === "present") {
                presentCount++;
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

              attendanceRecords.push({
                id:
                  record.AttendanceID ??
                  record.attendanceID ??
                  record.attendanceId ??
                  record.id,
                title: `${courseName} - ${subjectName}`,
                date: attendanceDate,
                statusLabel,
                statusKey,
              });
            }
          });
        }

        const totalSessions = attendanceRecords.length;
        const absentCount = Math.max(0, totalSessions - presentCount);

        entries.push({
          key: entryKey,
          subjectId,
          label,
          code,
          total: totalSessions,
          present: presentCount,
          absent: absentCount,
          students: [],
          records: attendanceRecords,
          latestAttendanceDate,
        });
      });
    });

    return entries;
  }, [isStudentUser, enrolledClassSummaries, studentAttendance]);

  const selectedClassInfo = useMemo(() => {
    if (!selectedClassKey || !classStatsEntries.length) {
      return null;
    }
    return (
      classStatsEntries.find((entry) => entry.key === selectedClassKey) || null
    );
  }, [selectedClassKey, classStatsEntries]);

  const showClassStatsPanel =
    Boolean(selectedClassInfo) && Boolean(isClassStatsOpen);

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

  // <<<<<<< HEAD
  //   const studentClassName = useMemo(() => {
  //     const candidateFields = [
  //       studentDetails?.Class,
  //       studentDetails?.class,
  //       studentDetails?.CurrentGrade,
  //       studentDetails?.currentGrade,
  //     ];

  //     for (const value of candidateFields) {
  //       if (value === undefined || value === null) continue;
  //       const trimmed = String(value).trim();
  //       if (trimmed) {
  //         return trimmed;
  //       }
  //     }

  //     if (studentSubjects && studentSubjects.length) {
  //       const first = String(studentSubjects[0] || "").trim();
  //       if (first) {
  //         return first;
  //       }
  //     }

  //     if (Array.isArray(courses) && courses.length) {
  //       const firstCourse = courses.find(Boolean);
  //       if (firstCourse) {
  //         const courseCandidates = [
  //           firstCourse.className,
  //           firstCourse.ClassName,
  //           firstCourse.section,
  //           firstCourse.Section,
  //           firstCourse.name,
  //           firstCourse.CourseName,
  //           firstCourse.courseName,
  //         ];
  //         for (const value of courseCandidates) {
  //           if (value === undefined || value === null) continue;
  //           const trimmed = String(value).trim();
  //           if (trimmed) {
  //             return trimmed;
  //           }
  //         }
  //       }
  //     }

  //     return null;
  //   }, [studentDetails, studentSubjects, courses]);

  // =======

  const isAdminViewer = useMemo(() => {
    if (!authUser) return false;
    const idVal = String(
      authUser.UserTypeID || authUser.userTypeID || ""
    ).trim();
    if (idVal === "1") return true;
    const name = String(
      authUser.userType || authUser.UserType || ""
    ).toLowerCase();
    return name === "admin";
  }, [authUser]);

  const isTeacherViewer = useMemo(() => {
    if (!authUser) return false;
    const idVal = String(
      authUser.UserTypeID || authUser.userTypeID || ""
    ).trim();
    if (idVal === "2") return true;
    const name = String(
      authUser.userType || authUser.UserType || ""
    ).toLowerCase();
    return name === "teacher";
  }, [authUser]);

  const viewerTeacherId = useMemo(() => {
    if (!isTeacherViewer || !authUser) return null;
    const candidates = [
      authUser?.TeacherID,
      authUser?.teacherID,
      authUser?.teacherId,
      authUser?.UserID,
      authUser?.userID,
      authUser?.userId,
      authUser?.id,
    ];
    for (const value of candidates) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str.length) return str;
    }
    return null;
  }, [authUser, isTeacherViewer]);

  const enrollmentIdByCourseId = useMemo(() => {
    const map = new Map();
    (studentEnrollments || []).forEach((e) => {
      const cid = String(e.CourseID ?? e.courseID ?? e.courseId ?? "");
      const eid =
        e.EnrollmentID ??
        e.enrollmentID ??
        e.id ??
        e.EnrollmentId ??
        e.raw?.EnrollmentID ??
        null;
      if (cid) map.set(cid, eid);
    });
    return map;
  }, [studentEnrollments]);

  const handleUnenrollCourse = async (course) => {
    if (!isStudentUser) return;
    setUnenrollError("");

    const cid = String(
      course?.id ??
        course?.CourseID ??
        course?.courseId ??
        course?.CourseId ??
        ""
    );
    const enrollmentId = enrollmentIdByCourseId.get(cid);
    if (!enrollmentId) {
      setUnenrollError("No enrollment record found for this course.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove this course enrollment?`
    );
    if (!confirmed) return;

    setUnenrollingId(enrollmentId);
    try {
      const ok = await deleteEnrollment(enrollmentId);
      if (!ok) throw new Error("Failed to delete enrollment");
      // refresh courses/enrollments
      await loadCourses();
    } catch (err) {
      console.error("Failed to unenroll", err);
      setUnenrollError(err?.message || "Unable to remove enrollment.");
    } finally {
      setUnenrollingId(null);
    }
  };

  const handleOpenAssignCourses = () => {
    if (!isTeacherUser) return;
    setAssignCoursesError("");
    setIsAssignCoursesOpen(true);
  };

  const handleOpenEnrollCourses = () => {
    if (!isStudentUser) return;
    setEnrollCoursesError("");
    setIsEnrollOpen(true);
  };

  const handleCloseAssignCourses = () => {
    if (assigningCourses) return;
    setIsAssignCoursesOpen(false);
    setAssignCoursesError("");
  };

  const handleAssignCourses = async (selectedIds) => {
    if (!isTeacherUser) {
      setAssignCoursesError(
        "Course assignments are only available for teachers."
      );
      return;
    }

    if (resolvedTeacherId === null || resolvedTeacherId === "") {
      setAssignCoursesError(
        "Missing teacher identifier. Please reload and try again."
      );
      return;
    }

    const preparedCourseIds = [];
    for (const rawId of selectedIds || []) {
      if (rawId === undefined || rawId === null) continue;
      const str = String(rawId).trim();
      if (!str) continue;
      const alreadyPrepared = preparedCourseIds.some(
        (item) => item.key === str
      );
      if (alreadyPrepared) continue;
      const value = !Number.isNaN(Number(str)) ? Number(str) : str;
      preparedCourseIds.push({ key: str, value });
    }

    const pendingAssignments = preparedCourseIds.filter(
      (item) => !assignedCourseIds.includes(item.key)
    );

    if (!pendingAssignments.length) {
      setAssignCoursesError("Select at least one new course to assign.");
      return;
    }

    setAssigningCourses(true);
    setAssignCoursesError("");

    try {
      // for (const { value } of pendingAssignments) {
      //   await updateCourse(value, { TeacherID: resolvedTeacherId });
      // }

      setIsAssignCoursesOpen(false);
      await loadCourses();
    } catch (err) {
      console.error("Failed to assign courses to teacher", err);
      setAssignCoursesError(
        err?.message || "Failed to assign courses. Please try again."
      );
    } finally {
      setAssigningCourses(false);
    }
  };

  const studentIdentifier = useMemo(() => {
    const candidates = [
      user?.StudentID,
      user?.studentID,
      user?.studentId,
      studentDetails?.StudentID,
      studentDetails?.studentID,
      studentDetails?.studentId,
      studentDetails?.id,
      user?.UserID,
      user?.id,
    ];
    for (const value of candidates) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str.length) return str;
    }
    return "";
  }, [studentDetails, user]);

  const resolvedStudentId = useMemo(() => {
    if (!studentIdentifier) return null;
    return !Number.isNaN(Number(studentIdentifier))
      ? Number(studentIdentifier)
      : studentIdentifier;
  }, [studentIdentifier]);

  const handleCloseEnrollCourses = () => {
    if (enrollingCourses) return;
    setIsEnrollOpen(false);
    setEnrollCoursesError("");
  };

  const handleEnrollCourses = async (selectedIds) => {
    if (!isStudentUser) {
      setEnrollCoursesError(
        "Course enrollment is only available for students."
      );
      return;
    }

    if (resolvedStudentId === null || resolvedStudentId === "") {
      setEnrollCoursesError(
        "Missing student identifier. Please reload and try again."
      );
      return;
    }

    const preparedIds = (selectedIds || [])
      .map((id) => (id === undefined || id === null ? null : String(id).trim()))
      .filter(Boolean);

    const pending = preparedIds.filter((id) => !assignedCourseIds.includes(id));

    if (!pending.length) {
      setEnrollCoursesError("Select at least one new course to enroll.");
      return;
    }

    setEnrollingCourses(true);
    setEnrollCoursesError("");
    try {
      await createEnrollmentsForStudent(
        resolvedStudentId,
        pending.map((id) => (Number.isNaN(Number(id)) ? id : Number(id)))
      );
      setIsEnrollOpen(false);
      await loadCourses();
    } catch (err) {
      console.error("Failed to enroll courses for student", err);
      setEnrollCoursesError(
        err?.message || "Failed to enroll courses. Please try again."
      );
    } finally {
      setEnrollingCourses(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadEnrolledSubjects = async () => {
      if (!isStudentUser) {
        if (isMounted) {
          setEnrolledSubjectsByCourse([]);
          setEnrolledSubjectsError("");
          setEnrolledSubjectsLoading(false);
        }
        return;
      }

      const candidateIds = [
        resolvedStudentId,
        studentIdentifier,
        user?.StudentID,
        user?.studentID,
        user?.studentId,
        user?.UserID,
        user?.userID,
        user?.id,
      ];

      let normalizedId = null;
      for (const candidate of candidateIds) {
        const value = normalizeKeyValue(candidate);
        if (value !== null) {
          normalizedId = value;
          break;
        }
      }

      if (normalizedId === null || normalizedId === undefined) {
        if (isMounted) {
          setEnrolledSubjectsByCourse([]);
          setEnrolledSubjectsError("");
          setEnrolledSubjectsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setEnrolledSubjectsLoading(true);
          setEnrolledSubjectsError("");
        }
        const data = await getEnrolledSubjectsByStudent(normalizedId);
        if (!isMounted) return;

        // If the current viewer is a teacher, limit displayed enrolled
        // classes to only those that belong to the viewing teacher's courses.
        let finalList = Array.isArray(data) ? data : [];
        try {
          if (isTeacherViewer) {
            // Build sets of allowed course identifiers and names from
            // the `courses` state which is already scoped to the viewer
            // teacher when applicable.
            const allowedCourseIdSet = new Set(
              (assignedCourseIds || []).map((v) => String(v))
            );
            const allowedCourseNameSet = new Set(
              (courses || [])
                .map((c) =>
                  String(c?.CourseName ?? c?.courseName ?? c?.name ?? "").trim()
                )
                .filter(Boolean)
                .map((s) => s.toLowerCase())
            );

            finalList = finalList.filter((entry) => {
              if (!entry) return false;
              const cid =
                entry.courseId ??
                entry.CourseID ??
                entry.courseID ??
                entry.id ??
                entry.CourseId ??
                null;
              if (cid !== null && cid !== undefined) {
                if (allowedCourseIdSet.has(String(cid))) return true;
              }
              const cname = String(
                entry.courseName ?? entry.CourseName ?? entry.name ?? ""
              ).trim();
              if (cname && allowedCourseNameSet.has(cname.toLowerCase()))
                return true;
              return false;
            });
          }
        } catch (e) {
          // If filtering fails for any reason, fall back to unfiltered data
          console.warn("Failed to filter enrolled classes by teacher scope", e);
        }

        setEnrolledSubjectsByCourse(finalList);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load enrolled classes for student", err);
        setEnrolledSubjectsByCourse([]);
        setEnrolledSubjectsError(
          "Unable to load enrolled classes for this student."
        );
      } finally {
        if (isMounted) {
          setEnrolledSubjectsLoading(false);
        }
      }
    };

    loadEnrolledSubjects();

    return () => {
      isMounted = false;
    };
  }, [isStudentUser, resolvedStudentId, studentIdentifier, user, courses]);

  // Fetch teacher record (department/qualification/bio/etc.) when user is a teacher
  useEffect(() => {
    const fetchTeacher = async () => {
      if (!user) return;

      const isTeacherType =
        String(user.UserTypeID || user.userTypeID || "").trim() === "2" ||
        String((user.userType || "").toLowerCase()) === "teacher";

      if (!isTeacherType) {
        setTeacherDetails(null);
        setTeacherError("");
        return;
      }

      const teacherId =
        user.TeacherID ??
        user.teacherID ??
        user.teacherId ??
        user.UserID ??
        user.id ??
        null;

      try {
        setTeacherLoading(true);
        setTeacherError("");
        if (!teacherId) {
          setTeacherDetails(null);
          return;
        }
        const rec = await getTeacherById(teacherId);
        setTeacherDetails(rec);
      } catch (err) {
        console.warn("Failed to load teacher record", err);
        setTeacherError("Failed to load teacher details");
      } finally {
        setTeacherLoading(false);
      }
    };

    fetchTeacher();
  }, [user]);

  // Fetch student record when user is a student
  useEffect(() => {
    const fetchStudent = async () => {
      if (!user) return;

      const isStudentType =
        String(user.UserTypeID || user.userTypeID || "").trim() === "3" ||
        String((user.userType || "").toLowerCase()) === "student";

      if (!isStudentType) {
        setStudentDetails(null);
        setStudentError("");
        return;
      }

      const studentId =
        user.StudentID ??
        user.studentID ??
        user.studentId ??
        user.UserID ??
        user.id ??
        null;

      try {
        setStudentLoading(true);
        setStudentError("");
        if (!studentId) {
          setStudentDetails(null);
          return;
        }
        const rec = await getStudentById(studentId);
        setStudentDetails(rec);
      } catch (err) {
        console.warn("Failed to load student record", err);
        setStudentError("Failed to load student details");
      } finally {
        setStudentLoading(false);
      }
    };

    fetchStudent();
  }, [user]);

  // Load attendance records for the viewed student (admin/teacher view)
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!isStudentUser) {
        setStudentAttendance([]);
        setAttendanceError("");
        setAttendanceLoading(false);
        return;
      }

      // Prefer studentDetails (service-fetched) but fall back to user props
      const rawStudentId =
        studentDetails?.StudentID ??
        studentDetails?.studentID ??
        studentDetails?.studentId ??
        user?.StudentID ??
        user?.studentID ??
        user?.studentId ??
        user?.UserID ??
        user?.userID ??
        user?.id ??
        null;

      if (!rawStudentId) {
        setStudentAttendance([]);
        return;
      }

      try {
        setAttendanceLoading(true);
        setAttendanceError("");
        const records = await getStudentAttendance(rawStudentId);
        setStudentAttendance(Array.isArray(records) ? records : []);
      } catch (err) {
        console.error("Failed to load student attendance", err);
        setAttendanceError("Unable to load attendance records.");
        setStudentAttendance([]);
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchAttendance();
  }, [isStudentUser, studentDetails, user, id]);

  const handleSave = async (userData) => {
    if (!allowEdit) return;
    try {
      const updatedUser = await updateUser(id, userData);
      setUser(updatedUser);
      // If the updated user is a teacher, also persist teacher-specific fields
      try {
        const isTeacherType =
          String(
            updatedUser?.UserTypeID ?? updatedUser?.userTypeID ?? ""
          ).trim() === "2" ||
          String(updatedUser?.userType || "").toLowerCase() === "teacher";

        if (isTeacherType) {
          const teacherId =
            updatedUser?.TeacherID ??
            updatedUser?.teacherID ??
            updatedUser?.teacherId ??
            updatedUser?.UserID ??
            updatedUser?.id ??
            resolvedTeacherId ??
            null;

          if (teacherId) {
            const teacherPayload = {
              EmployeeID: userData.EmployeeID ?? userData.employeeID,
              Department: userData.Department ?? userData.department,
              Qualification: userData.Qualification ?? userData.qualification,
              JoiningDate: userData.JoiningDate ?? userData.joiningDate,
              Bio: userData.Bio ?? userData.bio,
            };

            // Only call update when there's at least one teacher field present
            const hasTeacherFields = Object.values(teacherPayload).some(
              (v) => v !== undefined && v !== null && String(v).trim() !== ""
            );

            if (hasTeacherFields) {
              try {
                await updateTeacherService(teacherId, teacherPayload);
                // merge into local teacherDetails for immediate UI update
                setTeacherDetails((prev) => ({
                  ...(prev || {}),
                  ...teacherPayload,
                }));
              } catch (e) {
                console.warn("Failed to update teacher record", e);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Teacher sync check failed", e);
      }

      setIsEditing(false);
    } catch (err) {
      setError("Failed to update user");
    }
  };

  const fullName = [
    user?.FirstName || user?.firstName,
    user?.LastName || user?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const userTypeLabel = (() => {
    const map = { 1: "Admin", 2: "Teacher", 3: "Student" };
    const idVal = String(user?.UserTypeID ?? user?.userTypeID ?? "");
    const byId = map[idVal];
    if (byId) return byId;
    const byName = String(user?.userType || "").toLowerCase();
    if (byName === "admin") return "Admin";
    if (byName === "teacher") return "Teacher";
    if (byName === "student") return "Student";
    return user?.userType || "Unknown";
  })();

  if (loading) {
    return <Loader className="h-64" />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {heading}
          </h1>
          {manageLinkPath && (
            <Link
              to={manageLinkPath}
              className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
            >
              {`Back to ${listLabel}`}
            </Link>
          )}
        </div>
        <div className="rounded-md bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!user)
    return (
      <div className="text-gray-600 dark:text-gray-300">User not found</div>
    );

  return (
    <div className="space-y-6">
      {isStudentUser ? (
        <StudentClassStatsPanel
          open={showClassStatsPanel}
          classInfo={selectedClassInfo}
          onClose={handleCloseClassStats}
          studentId={resolvedStudentId}
        />
      ) : (
        <ClassStatsPanel
          open={showClassStatsPanel}
          classInfo={selectedClassInfo}
          onClose={handleCloseClassStats}
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <button
            onClick={handleBackClick}
            className="rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {heading}
          </h1>
        </div>
        {(allowEdit || (showManageLink && manageLinkPath)) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* {allowEdit && !isEditing && (
              <button
                onClick={startEditing}
                className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
              >
                Edit
              </button>
            )} */}
            {allowEdit && isEditing && (
              <button
                onClick={cancelEditing}
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:w-auto"
              >
                Cancel
              </button>
            )}
            {!isEditing && showManageLink && manageLinkPath && (
              <Link
                to={manageLinkPath}
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:w-auto"
              >
                {manageLinkText}
              </Link>
            )}
          </div>
        )}
      </div>

      {allowEdit && isEditing ? (
        <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70 sm:p-6">
          <UserForm
            onSubmit={handleSave}
            // pass a merged initialData so teacher-specific fields (like JoiningDate)
            // from `teacherDetails` appear in the form when editing a teacher.
            initialData={
              teacherDetails ? { ...(user || {}), ...teacherDetails } : user
            }
            userTypes={[
              { id: 1, name: "Admin" },
              { id: 2, name: "Teacher" },
              { id: 3, name: "Student" },
            ]}
          />
        </div>
      ) : (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <Avatar
              key={`avatar-${user.UserID || user.id}-${
                user.ProfilePictureVersion || user.profilePictureVersion || ""
              }`}
              name={fullName || user.Username || user.username}
              size="lg"
              src={user.ProfilePicture || user.profilePicture || undefined}
              user={user}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                  {fullName || user.Username || user.username || "User"}
                </h2>
                <Pill>{userTypeLabel}</Pill>
                {user.IsActive ?? user.isActive ? (
                  <Pill color="green">Active</Pill>
                ) : (
                  <Pill color="gray">Inactive</Pill>
                )}
                {(user.TeacherID || user.teacherId) && (
                  <Pill color="purple">
                    Teacher #{user.TeacherID || user.teacherId}
                  </Pill>
                )}
                {(user.StudentID || user.studentId) && (
                  <Pill color="yellow">
                    Student #{user.StudentID || user.studentId}
                  </Pill>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-all">
                {user.Email || user.email}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow
              label="First Name"
              value={user.FirstName || user.firstName}
            />
            <InfoRow label="Last Name" value={user.LastName || user.lastName} />
            <InfoRow label="Username" value={user.Username || user.username} />
            <InfoRow label="Email" value={user.Email || user.email} />
            <InfoRow label="User Type" value={userTypeLabel} />
            {/* <InfoRow
              label="User Type ID"
              value={user.UserTypeID || user.userTypeID}
            /> */}
            {/* <InfoRow label="User ID" value={user.UserID || user.id} /> */}
            {(user.EmployeeID || user.employeeID) && (
              <InfoRow
                label="Employee ID"
                value={user.EmployeeID || user.employeeID}
              />
            )}
            {(user.RollNumber || user.rollNumber) && (
              <InfoRow
                label="Student ID"
                value={user.RollNumber || user.rollNumber}
              />
            )}
          </div>
          {/* Teacher-specific details (if present) */}
          {teacherLoading && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Loading teacher details...
            </div>
          )}
          {teacherError && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
              {teacherError}
            </div>
          )}
          {teacherDetails && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Teacher Details
              </h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(teacherDetails.Department || teacherDetails.department) && (
                  <InfoRow
                    label="Department"
                    value={
                      teacherDetails.Department || teacherDetails.department
                    }
                  />
                )}
                {(teacherDetails.Qualification ||
                  teacherDetails.qualification) && (
                  <InfoRow
                    label="Qualification"
                    value={
                      teacherDetails.Qualification ||
                      teacherDetails.qualification
                    }
                  />
                )}
                {(teacherDetails.JoiningDate || teacherDetails.joiningDate) && (
                  <InfoRow
                    label="Joining Date"
                    value={new Date(
                      teacherDetails.JoiningDate || teacherDetails.joiningDate
                    ).toLocaleDateString()}
                  />
                )}
                {(teacherDetails.EmployeeID || teacherDetails.employeeID) &&
                  !(user.EmployeeID || user.employeeID) && (
                    <InfoRow
                      label="Employee ID"
                      value={
                        teacherDetails.EmployeeID || teacherDetails.employeeID
                      }
                    />
                  )}
              </div>

              {(teacherDetails.Bio || teacherDetails.bio) && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-900/20 p-3 rounded-md text-sm text-gray-700 dark:text-gray-300">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Bio
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">
                    {teacherDetails.Bio || teacherDetails.bio}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Student-specific details (shown below main card, before courses) */}
      {studentLoading && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Loading student details...
        </div>
      )}
      {studentError && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
          {studentError}
        </div>
      )}
      {studentDetails && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Student Details
            </h2>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow
                label="Student ID"
                value={
                  studentDetails.RollNumber || studentDetails.rollNumber || "-"
                }
              />
              <InfoRow
                label="Enrollment Date"
                value={
                  studentDetails.EnrollmentDate
                    ? new Date(
                        studentDetails.EnrollmentDate
                      ).toLocaleDateString()
                    : "-"
                }
              />
              <div>
                <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Classes
                </span>
                <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 space-y-1 break-words">
                  {enrolledSubjectsLoading ? (
                    <span className="text-gray-500 dark:text-gray-400">
                      Loading classes...
                    </span>
                  ) : enrolledSubjectsError ? (
                    <span className="text-red-600 dark:text-red-400">
                      {enrolledSubjectsError}
                    </span>
                  ) : classStatsEntries.length ? (
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
                  ) : displayClassNames.length ? (
                    displayClassNames.map((subjectLabel, idx) => {
                      const key = `class-${String(subjectLabel)
                        .toLowerCase()
                        .replace(/\s+/g, "-")}-${idx}`;
                      const encodedName = encodeURIComponent(subjectLabel);
                      return (
                        <span key={key}>
                          <Link
                            to={`/subjects/${encodedName}`}
                            state={{ backgroundLocation: location }}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {subjectLabel}
                          </Link>
                          {idx < displayClassNames.length - 1 ? ", " : ""}
                        </span>
                      );
                    })
                  ) : studentSubjects && studentSubjects.length ? (
                    <span>
                      {studentSubjects.map((s, idx) => (
                        <span key={s}>
                          <Link
                            to={`/subjects/${encodeURIComponent(s)}`}
                            state={{ backgroundLocation: location }}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {s}
                          </Link>
                          {idx < studentSubjects.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                  )}
                </div>
              </div>
              <InfoRow
                label="Parent Name"
                value={
                  studentDetails.ParentName || studentDetails.parentName || "-"
                }
              />
              <InfoRow
                label="Parent Contact"
                value={
                  studentDetails.ParentContact ||
                  studentDetails.parentContact ||
                  "-"
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Attendance records for the student (visible to admin/teacher when viewing a student) */}
      {/* {isStudentUser && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Attendance Records
            </h2>
            <span className="text-sm text-gray-500">
              {attendanceLoading
                ? "Loading..."
                : `${studentAttendance.length} record(s)`}
            </span>
          </div>

          {attendanceError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
              {attendanceError}
            </div>
          )}

          {attendanceLoading ? (
            <Loader className="h-32" />
          ) : (
            <AttendanceList attendance={studentAttendance || []} />
          )}
        </div>
      )} */}

      {/* Courses section for Teacher or Student (visible to admin) */}
      {user &&
        (String(user.UserTypeID || user.userTypeID || "").trim() === "2" ||
          String((user.userType || "").toLowerCase()) === "teacher" ||
          String(user.UserTypeID || user.userTypeID || "").trim() === "3" ||
          String((user.userType || "").toLowerCase()) === "student") && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {String(user.UserTypeID || user.userTypeID || "").trim() ===
                    "2" ||
                  String((user.userType || "").toLowerCase()) === "teacher"
                    ? "Assigned Courses"
                    : "Enrolled Courses"}
                </h2>
                {isTeacherUser && (
                  <button
                    onClick={handleOpenAssignCourses}
                    className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
                  >
                    Assign Course
                  </button>
                )}
                {/* {isStudentUser && (
                  <button
                    onClick={handleOpenEnrollCourses}
                    className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
                  >
                    Enroll Course
                  </button>
                )} */}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {coursesLoading ? "Loading..." : `${courses.length} course(s)`}
              </span>
            </div>

            {coursesLoading && <Loader className="h-32" />}

            {coursesError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
                {coursesError}
              </div>
            )}

            {!coursesLoading &&
              !coursesError &&
              courses &&
              courses.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {courses.map((course) => (
                    <div
                      key={course.id || course.CourseID || course.courseId}
                      className="rounded-lg border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {course.name || course.CourseName || "Course"}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {course.code || course.CourseCode} —{" "}
                            {course.subject ||
                              (course.subjectDetails &&
                                course.subjectDetails.name) ||
                              ""}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          {(() => {
                            const prefix =
                              authUser && authUser.userType === "teacher"
                                ? "/teacher"
                                : "/admin";
                            const cid =
                              course.id || course.CourseID || course.courseId;
                            if (!cid) {
                              return (
                                <button
                                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-gray-200 text-gray-700"
                                  disabled
                                >
                                  View
                                </button>
                              );
                            }

                            return (
                              <Link
                                to={`${prefix}/courses/${cid}`}
                                className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
                              >
                                View
                              </Link>
                            );
                          })()}
                          {isStudentUser &&
                            isAdminViewer &&
                            (() => {
                              const cid = String(
                                course.id ??
                                  course.CourseID ??
                                  course.courseId ??
                                  ""
                              );
                              const eid = enrollmentIdByCourseId.get(cid);
                              return (
                                <div className="mt-2">
                                  <button
                                    onClick={() => handleUnenrollCourse(course)}
                                    disabled={!eid || unenrollingId === eid}
                                    className="inline-flex w-full items-center justify-center rounded-md bg-gray-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
                                  >
                                    {unenrollingId === eid
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>
                                </div>
                              );
                            })()}
                        </div>
                      </div>
                      {course.description && (
                        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                          {course.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {!coursesLoading &&
              !coursesError &&
              (!courses || courses.length === 0) && (
                <div className="text-gray-600 dark:text-gray-400">
                  {String(user.UserTypeID || user.userTypeID || "").trim() ===
                    "2" ||
                  String((user.userType || "").toLowerCase()) === "teacher"
                    ? "No courses assigned to this teacher."
                    : "No courses enrolled for this student."}
                </div>
              )}

            {isTeacherUser && (
              <CoursePickerModal
                isOpen={isAssignCoursesOpen}
                onClose={handleCloseAssignCourses}
                initialSelected={[]}
                title="Assign Course"
                description="Select one or more courses to assign to this teacher."
                multiSelect
                allowCreate
                teacherId={
                  resolvedTeacherId === null || resolvedTeacherId === ""
                    ? undefined
                    : resolvedTeacherId
                }
                scopeToTeacher={false}
                hideAssignedToOtherTeachers={true}
                excludedIds={assignedCourseIds}
                saving={assigningCourses}
                proceedLabel={
                  assigningCourses ? "Assigning..." : "Assign Courses"
                }
                errorMessage={assignCoursesError}
                onProceed={handleAssignCourses}
              />
            )}
            {isStudentUser && (
              <CoursePickerModal
                isOpen={isEnrollOpen}
                onClose={handleCloseEnrollCourses}
                initialSelected={[]}
                title="Enroll Courses"
                description="Select one or more courses to enroll this student in."
                multiSelect
                allowCreate
                teacherId={undefined}
                scopeToTeacher={false}
                excludedIds={assignedCourseIds}
                saving={enrollingCourses}
                proceedLabel={
                  enrollingCourses ? "Enrolling..." : "Enroll Courses"
                }
                errorMessage={enrollCoursesError}
                onProceed={handleEnrollCourses}
              />
            )}
          </div>
        )}
    </div>
  );
};

export default UserDetailsPage;
