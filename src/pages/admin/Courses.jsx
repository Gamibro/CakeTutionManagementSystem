import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getAllCourses, createCourse } from "../../services/courseService";
import SubjectForm from "../../components/admin/SubjectForm";
import { createSubject } from "../../services/subjectService";
import CourseList from "../../components/courses/CourseList";
import Modal from "../../components/common/Modal2";
import CourseForm from "../../components/courses/CourseForm";
import TeacherPicker from "../../components/common/TeacherPicker";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";

const AdminCourses = () => {
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); // Course form modal
  const [showTeacherModal, setShowTeacherModal] = useState(false); // select teacher first
  const [selectedTeacherForNewCourse, setSelectedTeacherForNewCourse] = useState("");
  const [showSubjectModal, setShowSubjectModal] = useState(false); // Subject form modal
  // createdSubject stores an already-persisted subject (with id) when available.
  const [createdSubject, setCreatedSubject] = useState(null);
  // tempSubjectPayload holds the subject data submitted in step 1 but not yet persisted.
  const [tempSubjectPayload, setTempSubjectPayload] = useState(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [activeTab, setActiveTab] = useState(() =>
    location.state?.tab === "inactive" ? "inactive" : "active"
  );

  const locationTab = location.state?.tab;

  useEffect(() => {
    if (!locationTab) return;
    const normalized = locationTab === "inactive" ? "inactive" : "active";
    setActiveTab(normalized);
  }, [location.key, locationTab]);

  const { activeCourses, inactiveCourses } = useMemo(() => {
    const activeList = [];
    const inactiveList = [];

    courses.forEach((course) => {
      if (!course) return;

      const normalizedStatus =
        typeof course.status === "string"
          ? course.status.trim().toLowerCase()
          : typeof course.Status === "string"
          ? course.Status.trim().toLowerCase()
          : null;

      const rawActive =
        course.isActive ??
        course.IsActive ??
        course.is_active ??
        course.Is_active ??
        (normalizedStatus === null
          ? undefined
          : normalizedStatus !== "inactive");

      const isActive =
        rawActive === undefined || rawActive === null
          ? normalizedStatus === null
            ? true
            : normalizedStatus !== "inactive"
          : Boolean(rawActive);

      if (isActive) {
        activeList.push(course);
      } else {
        inactiveList.push(course);
      }
    });

    return { activeCourses: activeList, inactiveCourses: inactiveList };
  }, [courses]);

  const displayedCourses =
    activeTab === "inactive" ? inactiveCourses : activeCourses;

  const tabs = [
    { id: "active", name: "Active", count: activeCourses.length },
    { id: "inactive", name: "Inactive", count: inactiveCourses.length },
  ];

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getAllCourses();
        setCourses(data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [location.key]);

  const handleCourseSubmit = async (formValues) => {
    // Persist the subject first (if we only have a temp payload), then create the course.
    // If course creation fails, attempt to delete the newly created subject (rollback).
    setSavingCourse(true);
    let persistedSubject = null;
    try {
      if (tempSubjectPayload && !tempSubjectPayload.id) {
        setSavingSubject(true);
        persistedSubject = await createSubject(tempSubjectPayload);
        setSavingSubject(false);
      } else if (createdSubject && createdSubject.id) {
        persistedSubject = createdSubject;
      }

      // Prefer the subject we just persisted (if any). Fall back to any value the user entered.
      const subjectIdToUse =
        persistedSubject?.id ??
        persistedSubject?.SubjectID ??
        persistedSubject?.subjectId ??
        formValues.subjectId ??
        undefined;

      // Prefer SubjectIDs array if provided by the form. Fall back to single subjectId
      const payload = {
        ...formValues,
        subjectId: subjectIdToUse,
        SubjectIDs:
          Array.isArray(formValues?.SubjectIDs) && formValues.SubjectIDs.length
            ? formValues.SubjectIDs
            : subjectIdToUse !== undefined && subjectIdToUse !== null
            ? [subjectIdToUse]
            : undefined,
      };

      const created = await createCourse(payload);

      setCourses((prev) => [...prev, created]);
      setShowModal(false);
      setCreatedSubject(null);
      setTempSubjectPayload(null);
    } catch (err) {
      console.error(
        "Error creating course (subject persisted may be rolled back):",
        err
      );
      // rollback subject if it was persisted above
      try {
        if (persistedSubject && persistedSubject.id) {
          const subjectService = await import("../../services/subjectService");
          await subjectService.deleteSubject(persistedSubject.id);
        }
      } catch (delErr) {
        console.warn("Failed to rollback created subject:", delErr);
      }
    } finally {
      setSavingCourse(false);
      setSavingSubject(false);
    }
  };

  const handleSubjectSubmit = async (subjectData) => {
    // Do NOT persist subject immediately. Keep payload in temp state and open the course form.
    setTempSubjectPayload(subjectData);
    setCreatedSubject(null);
    setShowSubjectModal(false);
    setShowModal(true);
  };

  if (loading) {
    return <Loader className="py-12" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Courses
        </h1>
        <Button
          variant="primary"
          onClick={() => {
            setCreatedSubject(null);
            // open teacher selection first
            setSelectedTeacherForNewCourse("");
            setShowTeacherModal(true);
          }}
          disabled={savingCourse}
        >
          {savingCourse ? "Saving..." : "Add Course"}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav
            className="-mb-px flex space-x-6"
            aria-label="Course status filters"
          >
            {tabs.map((tab) => {
              const isCurrent = activeTab === tab.id;
              const tabClassName = isCurrent
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-300"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200";
              const badgeClassName = isCurrent
                ? "inline-flex min-w-[1.75rem] justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                : "inline-flex min-w-[1.75rem] justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800/60 dark:text-gray-300";

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium focus:outline-none transition-colors ${tabClassName}`}
                >
                  <span>{tab.name}</span>
                  <span className={badgeClassName}>{tab.count}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <CourseList
          courses={displayedCourses}
          basePath="/admin/courses"
          emptyState={
            <EmptyState
              title={
                activeTab === "active"
                  ? "No active courses"
                  : "No inactive courses"
              }
              description={
                activeTab === "active"
                  ? "Create a course to make it available to students."
                  : "Deactivated courses will be listed here."
              }
            />
          }
        />
      </div>

      {/* Teacher selection modal (step 1) */}
      <Modal
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        title="Assign Teacher"
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select a teacher</label>
          <TeacherPicker
            value={selectedTeacherForNewCourse}
            onChange={(val) => setSelectedTeacherForNewCourse(val ?? "")}
            showRefresh={true}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowTeacherModal(false)}
              disabled={savingCourse}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                // require selection before proceeding
                if (!selectedTeacherForNewCourse) return;
                setShowTeacherModal(false);
                // open Course modal and pass selected teacher via initialData
                setShowModal(true);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </Modal>

      {/* Course form modal (single-step) */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setCreatedSubject(null);
        }}
        title="Add Course"
      >
        <CourseForm
          step={1}
          onSubmit={handleCourseSubmit}
          onCancel={() => {
            setShowModal(false);
            setCreatedSubject(null);
          }}
          loading={savingCourse}
          initialData={{
            subjectId:
              createdSubject?.id ??
              createdSubject?.SubjectID ??
              createdSubject?.subjectId ??
              "",
            teacherId: selectedTeacherForNewCourse || "",
          }}
          hideAssignTeacher={true}
        />
      </Modal>
    </div>
  );
};

export default AdminCourses;
