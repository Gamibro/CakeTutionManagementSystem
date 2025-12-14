import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
];
const parseTimestamp = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (value > 1e12) return value; // already in milliseconds
    if (value > 1e9) return value * 1000; // likely in seconds
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
const resolveCourseTimestamp = (course) => {
  if (!course) return 0;
  const candidates = [
    course.createdTimestamp,
    course.createdAt,
    course.CreatedAt,
    course.created_at,
    course.createdOn,
    course.CreatedOn,
    course.creationDate,
    course.CreationDate,
    course.dateCreated,
    course.DateCreated,
    course.updatedAt,
    course.UpdatedAt,
  ];
  for (const candidate of candidates) {
    const parsed = parseTimestamp(candidate);
    if (parsed !== null) return parsed;
  }
  const idCandidate =
    course.id ?? course.CourseID ?? course.courseId ?? course.CourseId ?? null;
  const parsedId = parseTimestamp(idCandidate);
  if (parsedId !== null) return parsedId;
  return 0;
};
const CourseList = ({
  courses = [],
  basePath = "/teacher/courses",
  emptyState,
  defaultSort = "newest",
}) => {
  const [sortOrder, setSortOrder] = useState(defaultSort);
  const sortedCourses = useMemo(() => {
    if (!Array.isArray(courses)) return [];
    const decorated = courses.map((course, index) => ({
      course,
      index,
      timestamp: resolveCourseTimestamp(course),
      name: String(
        course?.name ?? course?.courseName ?? course?.CourseName ?? ""
      ),
    }));
    const compareByName = (a, b) => {
      const localeCompare = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      });
      if (localeCompare !== 0) return localeCompare;
      return a.index - b.index;
    };
    const compare = (a, b) => {
      switch (sortOrder) {
        case "oldest":
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
          return a.index - b.index;
        case "name-asc":
          return compareByName(a, b);
        case "name-desc":
          return compareByName(b, a);
        case "newest":
        default: {
          if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
          return b.index - a.index;
        }
      }
    };
    return decorated.sort(compare).map((entry) => entry.course);
  }, [courses, sortOrder]);
  const hasCourses = sortedCourses.length > 0;
  const showSortControls = sortedCourses.length > 1;
  return (
    <div className="space-y-6">
      {hasCourses ? (
        <div className="space-y-4">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {/* <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                My Courses
              </h2> */}
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {sortedCourses.length} {sortedCourses.length === 1 ? "course" : "courses"} total
              </p>
            </div>
            {showSortControls && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort by:
                </span>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCourses.map((course) => (
              <Link
                key={course.id}
                to={`${basePath}/${course.id}`}
                className="group block"
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 hover:shadow-lg hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-500 transition-all duration-300 h-full overflow-hidden">
                  {/* Course Header with Gradient */}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-100 transition-colors">
                        {course.name}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                        {course.code}
                      </span>
                    </div>
                    {course.subject && (
                      <p className="mt-2 text-sm text-indigo-100">
                        {course.subject}
                      </p>
                    )}
                  </div>
                  {/* Course Content */}
                  <div className="p-6">
                    <div className="space-y-3">
                      {course.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        {course.academicYear && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {course.academicYear}
                          </span>
                        )}
                        {/* Stats or additional info can go here */}
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Updated recently
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Hover Indicator */}
                  <div className="px-6 pb-4">
                    <div className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">
                      View course
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        emptyState ?? (
          <div className="text-center py-12">
            <EmptyState
              title="No courses found"
              description="You don't have any courses yet. Create your first course to get started."
            />
          </div>
        )
      )}
    </div>
  );
};
export default CourseList;
