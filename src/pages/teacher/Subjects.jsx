import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getTeacherCourses } from "../../services/courseService";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";

const collectSubjectsFromCourses = (courses = []) => {
  const seen = new Set();
  const result = [];

  for (const course of courses) {
    // course.subjects may be an array of strings, or course.subject / course.subjectDetails may exist
    const subjectsArr = Array.isArray(course.subjects)
      ? course.subjects
      : course.subject
      ? [course.subject]
      : course.subjectDetails && course.subjectDetails.name
      ? [course.subjectDetails.name]
      : [];

    for (const s of subjectsArr) {
      if (!s) continue;
      const key = String(s).trim();
      if (!key) continue;
      const lc = key.toLowerCase();
      if (seen.has(lc)) continue;
      seen.add(lc);
      result.push({
        name: key,
        // prefer subject id if available on subjectDetails
        id:
          course?.subjectDetails?.id ??
          course?.subjectId ??
          course?.subjectID ??
          course?.subject?.id ??
          null,
      });
    }
  }

  return result;
};

const TeacherSubjects = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);

  const teacherId =
    user?.id ??
    user?.UserID ??
    user?.userID ??
    user?.teacherId ??
    user?.TeacherId ??
    null;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!teacherId) {
        setCourses([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getTeacherCourses(teacherId);
        if (!active) return;
        setCourses(data || []);
      } catch (e) {
        console.error("Failed to load teacher courses", e);
        if (!active) return;
        setError("Failed to load classes");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [teacherId]);

  const subjects = useMemo(
    () => collectSubjectsFromCourses(courses),
    [courses]
  );

  if (loading) return <Loader className="py-12" />;

  if (error)
    return (
      <EmptyState
        title="Error"
        description={error}
        action={{
          label: "Back to dashboard",
          onClick: () => window.history.back(),
        }}
      />
    );

  if (!subjects.length)
    return (
      <EmptyState
        title="No classes found"
        description="There are no classes associated with your courses yet."
        action={
          <Button variant="primary">
            <Link to="/teacher/courses">View my courses</Link>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-indigo-700 to-violet-700 dark:from-white dark:via-indigo-300 dark:to-violet-300">
        My Classes
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub) => (
          <Card key={sub.id ?? sub.name} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-indigo-700 dark:text-white">
                  {sub.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Classes coming from your courses
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link
                  to={`/subjects/${encodeURIComponent(sub.id ?? sub.name)}`}
                  state={{ backgroundLocation: location }}
                >
                  <Button variant="primary">Details</Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TeacherSubjects;
