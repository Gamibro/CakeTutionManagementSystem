import React, { useEffect, useState } from "react";
import { formatDate } from "../../utils/helpers";
import { getCourseDetails } from "../../services/courseService";

const AnnouncementCard = ({ announcement }) => {
  const [courseName, setCourseName] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(false);

  useEffect(() => {
    let mounted = true;

    const resolveFromRaw = (raw) => {
      if (!raw || typeof raw !== "object") return null;
      const coursePayload =
        raw.Course ||
        raw.course ||
        raw.CourseDetails ||
        raw.courseDetails ||
        null;
      if (!coursePayload) return null;
      return (
        coursePayload.name ??
        coursePayload.CourseName ??
        coursePayload.courseName ??
        coursePayload.Title ??
        coursePayload.title ??
        null
      );
    };

    const load = async () => {
      if (!announcement) return;

      // Try to resolve directly from announcement payload (avoid extra network call)
      const directName =
        announcement.name ??
        announcement.courseName ??
        announcement.CourseName ??
        resolveFromRaw(announcement.raw) ??
        resolveFromRaw(announcement);

      if (directName) {
        setCourseName(directName);
        return;
      }

      const id =
        announcement.courseId ??
        announcement.CourseID ??
        announcement.courseID ??
        announcement.courseId ??
        null;

      if (!id) return;

      setLoadingCourse(true);
      try {
        const course = await getCourseDetails(id);
        if (!mounted) return;
        const name =
          course?.name ?? course?.CourseName ?? course?.courseName ?? "";
        if (name) setCourseName(name);
      } catch (err) {
        // ignore errors and leave courseName null
        console.warn("Failed to load course details for announcement", err);
      } finally {
        if (mounted) setLoadingCourse(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [announcement]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white break-words">
              {announcement.title}
            </h3>
            {loadingCourse ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Loading course…
              </p>
            ) : courseName ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Course: {courseName}
              </p>
            ) : announcement.courseId || announcement.CourseID ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Course: Unknown
              </p>
            ) : null}
          </div>

          <p className="mt-1 sm:mt-0 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {formatDate(announcement.postDate)}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
            {announcement.content}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
