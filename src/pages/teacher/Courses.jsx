import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTeacherCourses,
  getCourseDetails,
  createCourse,
} from "../../services/courseService";
import CourseList from "../../components/courses/CourseList";
import CourseView from "../../components/courses/CourseView";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";

// import Modal from "../../components/common/Modal";

import Modal from "../../components/common/Modal2";

import CourseForm from "../../components/courses/CourseForm";
import Button from "../../components/common/Button";

const TeacherCourses = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const teacherId =
    user?.id ??
    user?.UserID ??
    user?.userID ??
    user?.teacherId ??
    user?.TeacherId ??
    null;

  useEffect(() => {
    const fetchCourses = async () => {
      if (!teacherId) {
        setCourses([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getTeacherCourses(teacherId);
        setCourses(data);

        if (id) {
          const course = await getCourseDetails(id);
          setSelectedCourse(course);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [teacherId, id]);

  if (loading) {
    return <Loader className="py-12" />;
  }

  if (id && selectedCourse) {
    return <CourseView course={selectedCourse} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-sans tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-indigo-700 to-violet-700 dark:from-white dark:via-indigo-300 dark:to-violet-300">
        My Courses
      </h1>

      {courses.length > 0 ? (
        <CourseList courses={courses} />
      ) : (
        <EmptyState
          title="No courses assigned"
          description="You don't have any courses assigned to you yet."
          action={
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Request New Course
            </Button>
          }
        />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Request New Course"
      >
        <CourseForm
          onSubmit={async (data) => {
            try {
              const newCourse = await createCourse({
                ...data,
                teacherId,
              });
              setCourses((prev) => [...prev, newCourse]);
              setShowModal(false);
            } catch (err) {
              console.error("Failed to create course", err);
            }
          }}
          onCancel={() => setShowModal(false)}
          hideAssignTeacher={true}
        />
      </Modal>
    </div>
  );
};

export default TeacherCourses;
