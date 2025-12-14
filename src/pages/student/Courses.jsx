import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getStudentCourses } from "../../services/courseService";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";

const StudentCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const studentId =
          user?.StudentID ??
          user?.studentID ??
          user?.studentId ??
          user?.UserID ??
          user?.userID ??
          user?.userId ??
          user?.id;

        if (!studentId) {
          setCourses([]);
          return;
        }
        const data = await getStudentCourses(studentId);
        setCourses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching student courses:", error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  if (loading) {
    return <Loader className="py-12" />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tab Navigation */}
        {/* <div className="w-full flex justify-center mb-8">
          <nav className="bg-blue-600 rounded-lg shadow flex">
            <button
              className={`px-8 py-3 text-lg font-semibold focus:outline-none transition-colors duration-200 rounded-l-lg ${
                activeTab === "details"
                  ? "bg-white dark:bg-gray-900 text-blue-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              onClick={() => setActiveTab("details")}
            >
              Class Details
            </button>
            <button
              className={`px-8 py-3 text-lg font-semibold focus:outline-none transition-colors duration-200 ${
                activeTab === "marks"
                  ? "bg-white dark:bg-gray-900 text-blue-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              onClick={() => setActiveTab("marks")}
            >
              Subject Marks
            </button>
            <button
              className={`px-8 py-3 text-lg font-semibold focus:outline-none transition-colors duration-200 rounded-r-lg ${
                activeTab === "chart"
                  ? "bg-white dark:bg-gray-900 text-blue-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              onClick={() => setActiveTab("chart")}
            >
              Marks Chart
            </button>
          </nav>
        </div> */}

        {/* Tab Content */}
        {activeTab === "details" && (
          <>
            <div className="mb-6 text-center sm:mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
                Course Details
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                Review the classes you are enrolled in and tap to view the full
                syllabus.
              </p>
            </div>
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => {
                  const courseInitial = (
                    course?.name?.charAt(0) ||
                    course?.code?.charAt(0) ||
                    "?"
                  ).toUpperCase();

                  return (
                    <Link
                      key={course.id}
                      to={`/student/courses/${course.id}`}
                      className="group block h-full no-underline"
                    >
                      <div className="flex h-full flex-col gap-4 rounded-xl border border-gray-200 bg-white/90 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500 text-lg font-semibold text-white shadow-sm">
                            {courseInitial}
                          </div>
                          <div className="flex-1">
                            <div className="text-base font-semibold text-gray-900 transition-colors duration-200 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300 sm:text-lg">
                              {course.name || "Unnamed Course"}
                            </div>
                            {course.code ? (
                              <div className="text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                                {course.code}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {course.description ? (
                          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 overflow-hidden">
                            {course.description}
                          </p>
                        ) : null}
                        <div className="mt-auto text-sm font-medium text-indigo-600 transition-colors duration-200 group-hover:text-indigo-700 dark:text-indigo-300">
                          View course details
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No courses enrolled"
                description="You are not enrolled in any courses yet."
                action={
                  <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-white transition-colors duration-200 rounded-md bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    Browse Courses
                  </button>
                }
              />
            )}
          </>
        )}
        {activeTab === "marks" && (
          <div className="mb-8 flex w-full flex-col items-center">
            <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
              Class Marks
            </h1>
            <p className="text-center text-base font-medium text-gray-600 dark:text-gray-300">
              Marks for each class will be shown here.
            </p>
            {/* TODO: Replace with actual marks table or component */}
            <div className="mt-8 flex w-full justify-center">
              <div className="w-full max-w-sm rounded-lg bg-gray-100 p-6 text-center text-gray-700 shadow dark:bg-gray-900 dark:text-gray-200">
                <span>Class marks data goes here.</span>
              </div>
            </div>
          </div>
        )}
        {activeTab === "chart" && (
          <div className="mb-8 flex w-full flex-col items-center">
            <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
              Marks Chart
            </h1>
            <p className="text-center text-base font-medium text-gray-600 dark:text-gray-300">
              Visual chart of marks will be shown here.
            </p>
            {/* TODO: Replace with actual chart component */}
            <div className="mt-8 flex w-full justify-center">
              <div className="w-full max-w-sm rounded-lg bg-gray-100 p-6 text-center text-gray-700 shadow dark:bg-gray-900 dark:text-gray-200">
                <span>Marks chart visualization goes here.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCourses;
