import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card from "../../components/common/Card";
import AnnouncementForm from "../../components/announcements/AnnouncementForm";
import AnnouncementList from "../../components/announcements/AnnouncementList";
import Button from "../../components/common/Button";
import {
  createAnnouncement,
  getAnnouncementsByTeacher,
} from "../../services/announcementService";
import { getTeacherCourses } from "../../services/courseService";

const TeacherNoticesPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const teacherId = useMemo(() => {
    if (!user) return "";
    const candidates = [
      user?.TeacherID,
      user?.teacherID,
      user?.teacherId,
      user?.UserID,
      user?.userID,
      user?.userId,
      user?.id,
    ];
    const found = candidates.find(
      (value) => value !== undefined && value !== null && value !== ""
    );
    return found != null ? String(found) : "";
  }, [user]);
  const defaultCourseId = useMemo(
    () => (courses[0]?.id ? String(courses[0].id) : ""),
    [courses]
  );
  const [selectedCourseId, setSelectedCourseId] = useState("");

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [cs, anns] = await Promise.all([
          getTeacherCourses(teacherId),
          getAnnouncementsByTeacher(teacherId),
        ]);
        setCourses(cs);
        setAnnouncements(anns);
        setError("");
      } catch (err) {
        console.error("Failed to load teacher notices", err);
        setCourses([]);
        setAnnouncements([]);
        const message =
          err?.response?.data?.message || err?.message || "Network error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teacherId]);

  useEffect(() => {
    // initialize selected course once courses are loaded
    if (!selectedCourseId && defaultCourseId) {
      setSelectedCourseId(defaultCourseId);
    }
  }, [defaultCourseId, selectedCourseId]);

  const onSubmit = async (data) => {
    // data has title, content from AnnouncementForm; augment with courseId and teacherId
    try {
      setSubmitting(true);
      const courseId =
        selectedCourseId || defaultCourseId || (courses[0]?.id ?? "");
      if (!courseId) {
        alert("Please select a course to post the notice.");
        return;
      }
      if (!teacherId) {
        alert(
          "Unable to determine the logged in teacher. Please sign in again."
        );
        return;
      }
      const created = await createAnnouncement({
        courseId: Number(courseId),
        teacherId: Number(teacherId),
        title: data.title,
        content: data.content,
      });
      if (!created) {
        alert("Failed to save the announcement. Please try again.");
        return;
      }
      setAnnouncements((prev) => [created, ...prev]);
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Notices
        </h1>
        <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "New Notice"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Course
              </label>
              <select
                className="mt-1 px-2 py-2 text-sm block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                name="courseId"
                id="courseId"
              >
                <option value="">Select a course</option>
                {courses.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <AnnouncementForm onSubmit={onSubmit} loading={submitting} />
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-sm text-red-600">
            {error}. Please verify the backend service is reachable.
          </div>
        ) : (
          <AnnouncementList
            announcements={[...announcements]
              .filter(Boolean)
              .sort((a, b) => new Date(b.postDate) - new Date(a.postDate))}
          />
        )}
      </Card>
    </div>
  );
};

export default TeacherNoticesPage;
