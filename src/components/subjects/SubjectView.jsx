import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getSubjectById, getAllSubjects } from "../../services/subjectService";
import { getAllCourses } from "../../services/courseService";
import { getAllStudents } from "../../services/studentService";
import Loader from "../common/Loader";
import EmptyState from "../common/EmptyState";
import Card from "../common/Card";
import Button from "../common/Button";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../common/Avatar";

const normalize = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().toLowerCase();
};

const getCourseKeys = (course) => {
  const id = normalize(
    course?.id ?? course?.courseId ?? course?.CourseID ?? course?.ID
  );
  const code = normalize(
    course?.code ?? course?.CourseCode ?? course?.courseCode
  );
  const name = normalize(
    course?.name ?? course?.courseName ?? course?.CourseName
  );
  return {
    id,
    code,
    name,
    ref: id || code || name,
    displayName:
      course?.name ||
      course?.courseName ||
      course?.CourseName ||
      "Untitled course",
    rawCode: course?.code || course?.CourseCode || course?.courseCode || "",
  };
};

const studentBelongsToCourse = (student, courseKeys) => {
  const studentId = normalize(
    student?.courseId ??
      student?.CourseID ??
      student?.CourseId ??
      student?.course_id ??
      student?.Course?.id ??
      student?.course?.id ??
      student?.EnrollmentCourseID ??
      student?.enrollmentCourseId ??
      student?.__courseRef
  );
  const studentCode = normalize(student?.courseCode ?? student?.CourseCode);
  const studentName = normalize(
    student?.courseName ??
      student?.CourseName ??
      student?.Course?.name ??
      student?.course?.name ??
      student?.__courseName
  );

  if (courseKeys.id && studentId && studentId === courseKeys.id) return true;
  if (courseKeys.code && studentCode && studentCode === courseKeys.code)
    return true;
  if (courseKeys.name && studentName && studentName === courseKeys.name)
    return true;

  return false;
};

const getStudentKey = (student) => {
  const key =
    student?.id ??
    student?.studentId ??
    student?.StudentID ??
    student?.UserID ??
    student?.userId ??
    student?.Email ??
    student?.email ??
    student?.RollNumber ??
    student?.rollNumber;
  return key ? String(key) : undefined;
};

/**
 * SubjectView — full-page subject details with tabs and improved UI
 */
const SubjectView = ({ variant = "page", onClose }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isModal = variant === "modal";
  const fallbackSubjectsListRoute =
    user?.userType === "teacher"
      ? "/teacher/subjects"
      : user?.userType === "student"
      ? "/student/courses"
      : "/admin/subjects";
  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
      return;
    }
    navigate(-1);
  };
  const handleBackToSubjects = () => {
    if (isModal) {
      handleClose();
      return;
    }
    navigate(fallbackSubjectsListRoute);
  };

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [studentsFromCourses, setStudentsFromCourses] = useState([]); // hydrated from courses when available
  const [allStudents, setAllStudents] = useState([]); // fallback pool
  const [hydrating, setHydrating] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [query, setQuery] = useState("");

  // Load subject and supporting data
  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try direct lookup by id first
        let subjectData = null;
        try {
          subjectData = await getSubjectById(id);
        } catch (e) {
          // ignore and fallback
        }

        // If not found, search by name/code among all subjects
        if (!subjectData) {
          const all = await getAllSubjects();
          const needle = String(decodeURIComponent(id || "")).toLowerCase();
          subjectData = (all || []).find((s) => {
            const name = String(s?.name || "").toLowerCase();
            const code = String(s?.subjectCode || s?.code || "").toLowerCase();
            const sid = String(s?.id || "").toLowerCase();
            return name === needle || code === needle || sid === needle;
          });
        }

        if (!active) return;

        if (!subjectData) {
          setSubject(null);
          setError("Subject not found");
          return;
        }

        setSubject(subjectData);

        const courseList = await getAllCourses();
        if (!active) return;
        setCourses(courseList || []);

        const studentList = await getAllStudents();
        if (!active) return;
        setAllStudents(studentList || []);
      } catch (e) {
        if (!active) return;
        console.error(e);
        setError("Failed to load subject details.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  // derive related courses
  const relatedCourses = useMemo(() => {
    if (!subject) return [];
    const nameKey = String(subject.name || "").toLowerCase();
    const codeKey = String(
      subject.subjectCode || subject.code || ""
    ).toLowerCase();
    const courseIdSet = new Set(
      (Array.isArray(subject.courseIds)
        ? subject.courseIds
        : Array.isArray(subject.CourseIDs)
        ? subject.CourseIDs
        : Array.isArray(subject.CourseIds)
        ? subject.CourseIds
        : []
      )
        .map((id) =>
          String(id || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    );
    return (courses || []).filter((c) => {
      const subjectsArr = Array.isArray(c.subjects)
        ? c.subjects
        : c.subject
        ? [c.subject]
        : [];
      const hasName = subjectsArr.some(
        (s) => String(s).toLowerCase() === nameKey
      );
      const hasCode =
        codeKey &&
        String(c.code || c.CourseCode || "").toLowerCase() === codeKey;
      const courseIdKey = String(
        c.id ?? c.CourseID ?? c.courseID ?? c.CourseId ?? c.courseId ?? ""
      )
        .trim()
        .toLowerCase();
      const matchesId = courseIdSet.size && courseIdSet.has(courseIdKey);
      return hasName || hasCode || matchesId;
    });
  }, [courses, subject]);

  // hydrate students if courses embed them
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      if (!relatedCourses.length) {
        setStudentsFromCourses([]);
        return;
      }
      setHydrating(true);
      try {
        const collected = [];
        const seen = new Set();
        for (const course of relatedCourses) {
          const courseKeys = getCourseKeys(course);
          const embedded = course.Students || course.students || [];
          for (const st of embedded) {
            const idCandidate = getStudentKey(st);
            const fallbackKey = `${courseKeys.ref || courseKeys.displayName}-${
              collected.length
            }`;
            const key = idCandidate || fallbackKey;
            if (seen.has(key)) continue;
            seen.add(key);
            collected.push({
              ...st,
              __courseRef:
                courseKeys.id ||
                courseKeys.code ||
                courseKeys.name ||
                courseKeys.ref,
              __courseName: courseKeys.displayName,
            });
          }
        }
        if (active) setStudentsFromCourses(collected);
      } catch (e) {
        if (active) console.warn("Student hydration failed", e);
      } finally {
        if (active) setHydrating(false);
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, [relatedCourses]);

  // fallback derived students
  const derivedStudents = useMemo(() => {
    const list = [];
    const seen = new Set();
    const addStudent = (student, overrides = {}) => {
      if (!student) return;
      const keyCandidate =
        getStudentKey(student) ||
        (student?.Email || student?.email
          ? `${normalize(student.Email || student.email)}-${normalize(
              student.RollNumber || student.rollNumber
            )}`
          : undefined);
      const key =
        keyCandidate ||
        `${normalize(
          overrides.__courseRef || student?.__courseRef || "anon"
        )}-${list.length}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push({
        ...student,
        __courseRef: overrides.__courseRef ?? student?.__courseRef,
        __courseName: overrides.__courseName ?? student?.__courseName,
      });
    };

    studentsFromCourses.forEach((st) => addStudent(st));

    if (!subject) return list;

    const nameKey = normalize(subject.name || subject.SubjectName || "");
    const codeKey = normalize(
      subject.subjectCode || subject.code || subject.SubjectCode
    );

    (allStudents || [])
      .filter((st) => {
        const courseName = normalize(
          st.CourseName || st.courseName || st.Course?.name || st.course?.name
        );
        const courseCode = normalize(st.CourseCode || st.courseCode);
        const subjectsHint = [
          st.subject,
          st.Subject,
          st.subjectName,
          st.SubjectName,
        ]
          .filter(Boolean)
          .map((v) => normalize(v));
        const matchesSubject = nameKey && subjectsHint.includes(nameKey);
        const matchesCode = codeKey && subjectsHint.includes(codeKey);
        return (
          matchesSubject ||
          matchesCode ||
          (courseName && courseName.includes(nameKey))
        );
      })
      .forEach((st) => {
        const fallbackCourseName =
          st.CourseName ||
          st.courseName ||
          st.Course?.name ||
          st.course?.name ||
          null;
        addStudent(st, {
          __courseName: fallbackCourseName || st.__courseName,
          __courseRef: normalize(fallbackCourseName) || st.__courseRef,
        });
      });

    return list;
  }, [studentsFromCourses, allStudents, subject]);

  const courseStudents = useMemo(() => {
    if (!relatedCourses.length) return [];
    return relatedCourses.map((course) => {
      const courseKeys = getCourseKeys(course);
      const seen = new Set();
      const studentsForCourse = [];

      derivedStudents.forEach((st) => {
        if (!studentBelongsToCourse(st, courseKeys)) return;
        const key = `${
          getStudentKey(st) || normalize(st.email || st.Email || "")
        }-${courseKeys.ref}`;
        if (seen.has(key)) return;
        seen.add(key);
        studentsForCourse.push({
          ...st,
          __courseRef: st.__courseRef || courseKeys.ref,
          __courseName: st.__courseName || courseKeys.displayName,
        });
      });

      return {
        course,
        courseKeys,
        students: studentsForCourse,
      };
    });
  }, [relatedCourses, derivedStudents]);

  const totalStudentsCount = useMemo(
    () => courseStudents.reduce((acc, entry) => acc + entry.students.length, 0),
    [courseStudents]
  );

  const filteredCourseStudents = useMemo(() => {
    const q = normalize(query);
    const matchesQuery = (st) => {
      if (!q) return true;
      const name = normalize(
        `${st.firstName || st.FirstName || ""} ${
          st.lastName || st.LastName || ""
        }`
      );
      const email = normalize(st.email || st.Email || "");
      const roll = normalize(st.rollNumber || st.RollNumber || "");
      return name.includes(q) || email.includes(q) || roll.includes(q);
    };

    return courseStudents.map((entry) => ({
      ...entry,
      filteredStudents: entry.students.filter(matchesQuery),
      total: entry.students.length,
    }));
  }, [courseStudents, query]);

  const courseCardsForDisplay = useMemo(() => {
    if (!query) return filteredCourseStudents;
    return filteredCourseStudents.filter(
      (entry) => entry.filteredStudents.length
    );
  }, [filteredCourseStudents, query]);

  if (loading) return <Loader className="py-16" />;

  if (error)
    return (
      <EmptyState
        title="Error"
        description={error}
        action={{ label: isModal ? "Close" : "Back", onClick: handleClose }}
      />
    );

  if (!subject)
    return (
      <EmptyState
        title="Subject not found"
        description="The requested subject does not exist."
        action={{
          label: isModal ? "Close" : "All Subjects",
          onClick: handleBackToSubjects,
        }}
      />
    );

  const canEdit = user?.userType === "admin" || user?.userType === "teacher";
  const subjectCourseNames = Array.isArray(subject.courseNames)
    ? subject.courseNames
    : String(subject.courseName || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
  const routePrefix =
    user && user.userType === "teacher"
      ? "/teacher"
      : user && user.userType === "admin"
      ? "/admin"
      : "/student";

  const wrapperClass = isModal ? "space-y-5 sm:space-y-6 pr-1" : "space-y-8";
  const heroPaddingClass = isModal ? "p-5 sm:p-6 md:p-8" : "p-6 md:p-8 lg:p-10";
  const heroTitleClass = isModal
    ? "text-xl sm:text-2xl font-extrabold tracking-tight text-white dark:text-white"
    : "text-2xl md:text-3xl font-extrabold tracking-tight text-white dark:text-white";
  const heroSubtextClass = isModal
    ? "mt-1 text-xs sm:text-sm opacity-90"
    : "mt-1 text-sm opacity-90";
  const heroActionsClass = isModal
    ? "flex flex-wrap sm:flex-nowrap sm:items-center justify-end gap-2 sm:gap-3"
    : "flex gap-3 items-center";

  return (
    <div className={wrapperClass}>
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-600 to-indigo-400 text-white shadow-lg">
        <div
          className={`${heroPaddingClass} flex flex-col md:flex-row md:items-center md:justify-between gap-6`}
        >
          <div className="flex items-center gap-4">
            <div>
              <h1 className={heroTitleClass}>{subject.name}</h1>
              <p className={heroSubtextClass}>
                {subject.subjectCode || subject.code || "No code"}
              </p>
              <p className={heroSubtextClass}>
                {subjectCourseNames.length
                  ? `${
                      subjectCourseNames.length > 1 ? "Courses" : "Course"
                    }: ${subjectCourseNames.join(", ")}`
                  : ""}
              </p>
            </div>
          </div>
          <div className={heroActionsClass}>
            {/* <div className="text-right">
              <div className="text-xs opacity-90">Students</div>
              <div className="text-lg font-semibold">{totalStudentsCount}</div>
            </div> */}
            <div className="text-right">
              <div className="text-xs sm:text-sm opacity-90">
                Related Courses
              </div>
              <div className="text-base sm:text-lg font-semibold">
                {relatedCourses.length}
              </div>
            </div>
            {/* <div>
              <Button
                variant="primary"
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                {isModal ? "Close" : "Back"}
              </Button>
            </div> */}
          </div>
        </div>
        {subject.description && (
          <div
            className={`${
              isModal ? "px-5 sm:px-6 pb-5" : "px-6 pb-6"
            } text-white/90 text-sm sm:text-base`}
          >
            <p className="max-w-4xl">{subject.description}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        className={`${
          isModal
            ? "bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            : "bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex items-center justify-between"
        }`}
      >
        <div className="flex items-center space-x-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              activeTab === "overview"
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            Overview
          </button>
          {/* <button
            onClick={() => setActiveTab("students")}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              activeTab === "students"
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            Students
          </button> */}
          <button
            onClick={() => setActiveTab("courses")}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              activeTab === "courses"
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            Courses
          </button>
        </div>
        {activeTab === "students" && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students by name, email or roll"
              className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white w-full sm:w-64"
            />
            <Button variant="primary" onClick={() => setQuery("")}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          <Card className={`${isModal ? "p-5 sm:p-6" : "p-6"} lg:col-span-2`}>
            <h3 className="text-lg font-semibold mb-2">About this subject</h3>
            <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-sm sm:text-base">
              {subject.description || "No description provided."}
            </p>
          </Card>
          <Card className={isModal ? "p-5 sm:p-6" : "p-6"}>
            {/* <h4 className="text-sm text-gray-500">Meta</h4> */}
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Code</span>
                <span className="font-medium">
                  {subject.subjectCode || subject.code || "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Courses</span>
                <span className="font-medium">{relatedCourses.length}</span>
              </div>
              {/* <div className="flex justify-between text-sm">
                <span className="text-gray-600">Students</span>
                <span className="font-medium">{totalStudentsCount}</span>
              </div> */}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "courses" && (
        <div>
          {relatedCourses.length ? (
            <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedCourses.map((c) => (
                <Card
                  key={c.id || c.code}
                  className="p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {c.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-3">
                        {c.description || "No description"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Link
                        to={`${routePrefix}/courses/${
                          c.id || c.CourseID || c.courseId || ""
                        }`}
                        className="text-indigo-600"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No related courses"
              description="This subject isn't linked to any course yet."
            />
          )}
        </div>
      )}

      {activeTab === "students" && (
        <div className="space-y-4">
          {hydrating && <Loader className="py-6" />}
          {!hydrating &&
            (relatedCourses.length ? (
              query && !courseCardsForDisplay.length ? (
                <EmptyState
                  title="No students match"
                  description="Try adjusting your search to find students in these courses."
                />
              ) : (
                <div className="space-y-4">
                  {courseCardsForDisplay.map(
                    ({ course, courseKeys, filteredStudents, total }) => {
                      const courseId =
                        course?.id ??
                        course?.courseId ??
                        course?.CourseID ??
                        course?.ID ??
                        courseKeys.ref ??
                        courseKeys.displayName;
                      const courseLinkId =
                        course?.id || course?.CourseID || course?.courseId;
                      return (
                        <Card key={courseId} className="p-5 space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {courseKeys.displayName}
                              </h3>
                              {courseKeys.rawCode && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Code: {courseKeys.rawCode}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">
                                {query ? "Matches" : "Students"}
                              </div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {query ? filteredStudents.length : total}
                              </div>
                              {query && filteredStudents.length !== total && (
                                <div className="text-xs text-gray-400">
                                  of {total}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              Course overview
                            </span>
                            {courseLinkId && (
                              <Link
                                to={`${routePrefix}/courses/${courseLinkId}`}
                                className="text-indigo-600"
                              >
                                Open course
                              </Link>
                            )}
                          </div>
                          {filteredStudents.length ? (
                            <div className="space-y-3">
                              {filteredStudents.map((st, index) => {
                                const displayName =
                                  [
                                    st.firstName || st.FirstName,
                                    st.lastName || st.LastName,
                                  ]
                                    .filter(Boolean)
                                    .join(" ") ||
                                  st.username ||
                                  st.email ||
                                  `Student #${index + 1}`;
                                const studentKey =
                                  getStudentKey(st) ||
                                  `${courseId}-${index}-${normalize(
                                    st.email || st.Email || ""
                                  )}`;
                                const roll =
                                  st.rollNumber || st.RollNumber || "—";
                                const email = st.email || st.Email || "";
                                const manageId =
                                  st.id ||
                                  st.StudentID ||
                                  st.studentId ||
                                  st.UserID ||
                                  st.userId;
                                return (
                                  <div
                                    key={studentKey}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Avatar name={displayName} user={st} />
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {displayName}
                                        </div>
                                        {email && (
                                          <div className="text-xs text-gray-500">
                                            {email}
                                          </div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                          Roll: {roll}
                                        </div>
                                      </div>
                                    </div>
                                    {canEdit && manageId && (
                                      <Link
                                        to={`/admin/users/${manageId}`}
                                        className="text-indigo-600 text-sm"
                                      >
                                        Manage
                                      </Link>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 text-sm text-gray-500">
                              {query
                                ? "No students match your search for this course."
                                : "No students have been linked to this course yet."}
                            </div>
                          )}
                        </Card>
                      );
                    }
                  )}
                </div>
              )
            ) : (
              <EmptyState
                title="No related courses"
                description="This subject is not linked to any courses yet."
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default SubjectView;
