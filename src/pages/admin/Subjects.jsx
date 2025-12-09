import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getAllSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
  updateSubject,
} from "../../services/subjectService";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Card from "../../components/common/Card";
import SubjectForm from "../../components/admin/SubjectForm";
import Loader from "../../components/common/Loader";
import CoursePickerModal from "../../components/courses/CoursePickerModal";
import { getCourseDetails, updateCourse } from "../../services/courseService";

const normalizeIdValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const str = String(value).trim();
  if (!str) return null;
  if (/^-?\d+$/.test(str) && !/^0\d+/.test(str)) {
    const parsed = Number(str);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return str;
};

const toIdKey = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value);
  }
  const str = String(value).trim();
  if (!str) return "";
  if (/^-?\d+$/.test(str) && !/^0\d+/.test(str)) {
    const parsed = Number(str);
    if (!Number.isNaN(parsed)) return String(parsed);
  }
  return str;
};

const normalizeIdArray = (values) => {
  if (!Array.isArray(values)) return [];
  const map = new Map();
  values.forEach((value) => {
    const normalized = normalizeIdValue(value);
    if (normalized === null) return;
    const key = toIdKey(normalized);
    if (!key) return;
    if (!map.has(key)) map.set(key, normalized);
  });
  return Array.from(map.values());
};

const deriveCourseMeta = (course, fallbackId) => {
  if (!course) return null;

  const normalizedId =
    normalizeIdValue(
      course.id ??
        course.CourseID ??
        course.courseID ??
        course.CourseId ??
        course.courseId ??
        fallbackId
    ) ?? null;
  const idKey =
    normalizedId !== null && normalizedId !== undefined
      ? toIdKey(normalizedId)
      : toIdKey(fallbackId);

  if (!idKey) return null;

  const name = course.name ?? course.courseName ?? course.CourseName ?? "";
  const code = course.code ?? course.courseCode ?? course.CourseCode ?? "";

  const subjectIds = normalizeIdArray(
    Array.isArray(course.SubjectIDs)
      ? course.SubjectIDs
      : Array.isArray(course.subjectIds)
      ? course.subjectIds
      : []
  );

  const primarySubjectId =
    normalizeIdValue(
      course.subjectId ??
        course.SubjectID ??
        (subjectIds.length ? subjectIds[0] : null)
    ) ?? null;

  return {
    id: normalizedId ?? normalizeIdValue(idKey),
    idKey,
    name,
    code,
    subjectIds,
    subjectId: primarySubjectId,
    course,
  };
};

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewSubject, setViewSubject] = useState(null);
  const [editSubject, setEditSubject] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [subjectDraftData, setSubjectDraftData] = useState(null);
  const [subjectInProgress, setSubjectInProgress] = useState(null);
  const [isDraftNewSubject, setIsDraftNewSubject] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [linkingCourse, setLinkingCourse] = useState(false);
  const [courseStepError, setCourseStepError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const all = await getAllSubjects();
      setSubjects(all || []);
    } catch (err) {
      console.error("AdminSubjects.load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubjectDetailsSubmit = async (data) => {
    setCreatingSubject(true);
    try {
      const created = await createSubject(data);
      const createdId =
        created?.id ??
        created?.SubjectID ??
        created?.subjectId ??
        data?.id ??
        data?.SubjectID ??
        data?.subjectId ??
        null;

      const payloadWithIds = {
        ...data,
        ...(createdId !== null && createdId !== undefined
          ? {
              id: createdId,
              SubjectID: createdId,
              subjectId: createdId,
            }
          : {}),
      };

      setSubjectDraftData(payloadWithIds);
      setSubjectInProgress(created);
      setIsDraftNewSubject(true);
      setSelectedCourseIds([]);
      setCourseStepError("");
      setShowAdd(false);
      setShowCoursePicker(true);
    } catch (err) {
      console.error("AdminSubjects.create:", err);
    } finally {
      setCreatingSubject(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this class?")) return;
    try {
      const ok = await deleteSubject(id);
      if (ok) setSubjects((s) => s.filter((x) => String(x.id) !== String(id)));
    } catch (err) {
      console.error("AdminSubjects.delete:", err);
    }
  };

  const handleLinkCourse = async (selectedIds) => {
    // defensive: ensure we have draft subject to attach courses to
    if (!subjectInProgress) {
      const msg = "Class details are missing. Please start again.";
      console.error("AdminSubjects.linkCourse:", msg, { selectedIds });
      setCourseStepError(msg);
      return;
    }

    const previousSelectionKeys = Array.isArray(selectedCourseIds)
      ? selectedCourseIds.map((value) => toIdKey(value)).filter(Boolean)
      : [];

    const normalizedSelection = Array.isArray(selectedIds)
      ? selectedIds
      : [selectedIds];

    const sanitizedSelectionKeys = Array.from(
      new Set(
        normalizedSelection.map((value) => toIdKey(value)).filter(Boolean)
      )
    );

    if (!sanitizedSelectionKeys.length) {
      setCourseStepError("Select at least one course to continue.");
      return;
    }

    const subjectIdValue =
      subjectInProgress?.id ??
      subjectDraftData?.id ??
      subjectDraftData?.SubjectID ??
      subjectDraftData?.subjectId ??
      null;

    const normalizedSubjectId = normalizeIdValue(subjectIdValue);
    const subjectIdKey = toIdKey(
      normalizedSubjectId !== null ? normalizedSubjectId : subjectIdValue
    );

    if (!subjectIdKey) {
      setCourseStepError("Class identifier is missing. Please try again.");
      return;
    }

    // reset any previous error and mark operation in progress
    setCourseStepError("");
    console.debug("AdminSubjects.linkCourse:start", { selectedIds });
    setLinkingCourse(true);

    try {
      const fetchCourse = async (idKey) => {
        try {
          const details = await getCourseDetails(idKey);
          return { idKey, details };
        } catch (err) {
          console.error("AdminSubjects.linkCourse:getCourseDetails", err);
          return { idKey, details: null, error: err };
        }
      };

      const courseResults = await Promise.all(
        sanitizedSelectionKeys.map((idKey) => fetchCourse(idKey))
      );

      const unresolvedSelection = courseResults.filter(
        (entry) => !entry.details
      );
      if (unresolvedSelection.length) {
        const failedKeys = unresolvedSelection.map(
          (r) => r.idKey || r.id || null
        );
        const msg = `Some selected courses could not be loaded: ${failedKeys.join(
          ", "
        )}`;
        console.error("AdminSubjects.linkCourse: unresolved courses", {
          failedKeys,
          courseResults,
        });
        setCourseStepError(msg + ". Please try again.");
        return;
      }

      const courseMetas = courseResults
        .map(({ idKey, details }) => deriveCourseMeta(details, idKey))
        .filter(Boolean);

      if (!courseMetas.length) {
        console.error("AdminSubjects.linkCourse: no course metas", {
          courseResults,
          sanitizedSelectionKeys,
        });
        setCourseStepError(
          "No valid courses were found for the current selection."
        );
        return;
      }

      const courseIdsForSubject = normalizeIdArray(
        courseMetas.map((meta) => meta.id ?? meta.idKey)
      );

      const courseNamesList = Array.from(
        new Set(
          courseMetas
            .map((meta) => String(meta.name || "").trim())
            .filter(Boolean)
        )
      );
      const courseCodesList = Array.from(
        new Set(
          courseMetas
            .map((meta) => String(meta.code || "").trim())
            .filter(Boolean)
        )
      );

      const primaryCourseId = courseIdsForSubject.length
        ? courseIdsForSubject[0]
        : null;
      const primaryCourseName = courseNamesList.length
        ? courseNamesList[0]
        : "";
      const primaryCourseCode = courseCodesList.length
        ? courseCodesList[0]
        : "";

      const subjectPayload = {
        ...(subjectDraftData || {}),
        id: subjectIdValue,
        SubjectID: subjectIdValue,
        subjectId: subjectIdValue,
        name:
          subjectDraftData?.name ??
          subjectDraftData?.subjectName ??
          subjectInProgress?.name ??
          "",
        subjectName:
          subjectDraftData?.subjectName ??
          subjectDraftData?.name ??
          subjectInProgress?.name ??
          "",
        SubjectName:
          subjectDraftData?.SubjectName ??
          subjectDraftData?.subjectName ??
          subjectDraftData?.name ??
          subjectInProgress?.name ??
          "",
        subjectCode:
          subjectDraftData?.subjectCode ??
          subjectDraftData?.SubjectCode ??
          subjectInProgress?.subjectCode ??
          "",
        SubjectCode:
          subjectDraftData?.SubjectCode ??
          subjectDraftData?.subjectCode ??
          subjectInProgress?.subjectCode ??
          "",
        description:
          subjectDraftData?.description ??
          subjectDraftData?.Description ??
          subjectInProgress?.description ??
          "",
        Description:
          subjectDraftData?.Description ??
          subjectDraftData?.description ??
          subjectInProgress?.description ??
          "",
        courseId: primaryCourseId,
        CourseID: primaryCourseId,
        CourseId: primaryCourseId,
        courseIds: courseIdsForSubject,
        CourseIDs: courseIdsForSubject,
        CourseIds: courseIdsForSubject,
        courseName: primaryCourseName,
        CourseName: primaryCourseName,
        courseNames: courseNamesList,
        CourseNames: courseNamesList,
        courseCode: primaryCourseCode,
        CourseCode: primaryCourseCode,
        courseCodes: courseCodesList,
        CourseCodes: courseCodesList,
      };

      const updated = await updateSubject(subjectIdValue, subjectPayload);

      const prevSelectionSet = new Set(previousSelectionKeys);
      const newSelectionSet = new Set(sanitizedSelectionKeys);
      const removedKeys = [...prevSelectionSet].filter(
        (key) => !newSelectionSet.has(key)
      );

      let removalMetas = [];
      if (removedKeys.length) {
        const removalResults = await Promise.all(
          removedKeys.map((idKey) => fetchCourse(idKey))
        );
        removalMetas = removalResults
          .filter((entry) => entry.details)
          .map(({ idKey, details }) => deriveCourseMeta(details, idKey))
          .filter(Boolean);
      }

      const subjectIdForArray =
        normalizedSubjectId !== null ? normalizedSubjectId : subjectIdKey;

      const courseOperations = [];

      courseMetas.forEach((meta) => {
        const existingSet = new Set(meta.subjectIds.map((id) => toIdKey(id)));
        const shouldAdd = subjectIdKey && !existingSet.has(subjectIdKey);
        const needsPrimary =
          (!meta.subjectId || !toIdKey(meta.subjectId)) &&
          subjectIdKey &&
          subjectIdForArray !== null;
        if (!shouldAdd && !needsPrimary) return;

        const nextIds = normalizeIdArray([
          ...meta.subjectIds,
          subjectIdForArray,
        ]);
        const updatePayload = { SubjectIDs: nextIds };
        const currentPrimaryKey = toIdKey(meta.subjectId);
        if (!currentPrimaryKey || currentPrimaryKey === subjectIdKey) {
          if (nextIds.length) updatePayload.SubjectID = nextIds[0];
        }
        courseOperations.push(
          updateCourse(meta.id ?? meta.idKey, updatePayload)
        );
      });

      removalMetas.forEach((meta) => {
        const existingSet = new Set(meta.subjectIds.map((id) => toIdKey(id)));
        if (!existingSet.has(subjectIdKey)) return;

        const remainingIds = meta.subjectIds.filter(
          (id) => toIdKey(id) !== subjectIdKey
        );
        const nextIds = normalizeIdArray(remainingIds);
        const updatePayload = { SubjectIDs: nextIds };
        const currentPrimaryKey = toIdKey(meta.subjectId);
        if (currentPrimaryKey === subjectIdKey) {
          updatePayload.SubjectID = nextIds.length ? nextIds[0] : null;
        }
        courseOperations.push(
          updateCourse(meta.id ?? meta.idKey, updatePayload)
        );
      });

      if (courseOperations.length) {
        const results = await Promise.allSettled(courseOperations);
        const rejected = results
          .map((r, i) => ({ r, i }))
          .filter((x) => x.r.status === "rejected");
        if (rejected.length) {
          console.error("AdminSubjects.linkCourse: course update failures", {
            rejected,
            sanitizedSelectionKeys,
          });
          throw (
            rejected[0].r.reason ||
            new Error("Failed to update one or more course assignments.")
          );
        }
      }

      const subjectEntry = {
        ...updated,
      };

      if (
        !Array.isArray(subjectEntry.courseIds) ||
        !subjectEntry.courseIds.length
      ) {
        subjectEntry.courseIds = courseIdsForSubject;
        subjectEntry.CourseIDs = courseIdsForSubject;
      }

      if (
        !Array.isArray(subjectEntry.courseNames) ||
        !subjectEntry.courseNames.length
      ) {
        subjectEntry.courseNames = courseNamesList;
        subjectEntry.CourseNames = courseNamesList;
      }

      if (!subjectEntry.courseName && courseNamesList.length) {
        subjectEntry.courseName = courseNamesList.join(", ");
      }

      if (!subjectEntry.CourseName && primaryCourseName) {
        subjectEntry.CourseName = primaryCourseName;
      }

      if (
        !Array.isArray(subjectEntry.courseCodes) ||
        !subjectEntry.courseCodes.length
      ) {
        subjectEntry.courseCodes = courseCodesList;
        subjectEntry.CourseCodes = courseCodesList;
      }

      if (!subjectEntry.courseCode && primaryCourseCode) {
        subjectEntry.courseCode = primaryCourseCode;
      }
      if (!subjectEntry.CourseCode && primaryCourseCode) {
        subjectEntry.CourseCode = primaryCourseCode;
      }

      if (
        subjectEntry.courseId === null ||
        subjectEntry.courseId === undefined
      ) {
        subjectEntry.courseId = primaryCourseId ?? null;
      }
      if (
        subjectEntry.CourseID === null ||
        subjectEntry.CourseID === undefined
      ) {
        subjectEntry.CourseID = primaryCourseId ?? null;
      }

      setSubjects((list) => {
        const filtered = (list || []).filter(
          (s) =>
            String(s.id ?? s.SubjectID ?? s.subjectId ?? "") !==
            String(subjectEntry.id ?? subjectIdValue ?? "")
        );
        return [subjectEntry, ...filtered];
      });

      setSelectedCourseIds(sanitizedSelectionKeys);
      setSubjectInProgress(null);
      setSubjectDraftData(null);
      setIsDraftNewSubject(false);
      setShowCoursePicker(false);
      setCourseStepError("");
    } catch (err) {
      console.error("AdminSubjects.linkCourse:", err, { selectedIds });
      // try to extract useful info from axios-style errors
      const axiosData = err?.response?.data ?? err?.message ?? String(err);
      setCourseStepError(
        (axiosData && String(axiosData)) ||
          "Unable to link the class to the selected courses. Please try again."
      );
    } finally {
      setLinkingCourse(false);
    }
  };

  const handleCoursePickerClose = async () => {
    if (linkingCourse) return;
    setShowCoursePicker(false);
    if (isDraftNewSubject && subjectInProgress?.id) {
      try {
        await deleteSubject(subjectInProgress.id);
      } catch (err) {
        console.warn("AdminSubjects.cancelNewSubject:", err);
      }
    }
    setSubjectInProgress(null);
    setSubjectDraftData(null);
    setSelectedCourseIds([]);
    setCourseStepError("");
    setIsDraftNewSubject(false);
  };

  // Open edit modal. Accept either the subject object or an id.
  const openEdit = async (idOrSubject) => {
    const subject = typeof idOrSubject === "object" ? idOrSubject : null;
    const id = subject ? subject.id : idOrSubject;

    // If no id available, use the subject object if provided and skip backend fetch
    if (id === null || id === undefined || String(id).trim() === "") {
      setEditSubject(subject || { id });
      return;
    }

    try {
      // try to fetch canonical record from backend
      const details = await getSubjectById(id);
      setEditSubject(details || subject || { id });
    } catch (err) {
      console.error("AdminSubjects.openEdit:", err);
      setEditSubject(subject || { id });
    }
  };

  const handleUpdate = async (data) => {
    try {
      const id = data.id ?? editSubject?.id;
      if (!id) throw new Error("Missing subject id");

      // Persist subject updates immediately
      const updated = await updateSubject(id, data);
      setSubjects((list) =>
        (list || []).map((s) =>
          String(s.id) === String(id) ? { ...s, ...updated } : s
        )
      );

      // After updating core subject fields, allow changing linked courses.
      // Prepare draft state and open the course picker preselected to current courses.
      const updatedCourseIds = Array.isArray(updated?.courseIds)
        ? updated.courseIds
        : Array.isArray(updated?.CourseIDs)
        ? updated.CourseIDs
        : Array.isArray(updated?.CourseIds)
        ? updated.CourseIds
        : [];

      const preselectedCourses = Array.from(
        new Set(
          (updatedCourseIds || [])
            .map((value) => toIdKey(value))
            .filter(Boolean)
        )
      );

      const fallbackCourseId =
        updated?.courseId ??
        updated?.CourseID ??
        updated?.CourseId ??
        updated?.courseID ??
        null;

      if (!preselectedCourses.length && fallbackCourseId !== null) {
        const key = toIdKey(fallbackCourseId);
        if (key) preselectedCourses.push(key);
      }

      setSubjectDraftData({ ...updated });
      setSubjectInProgress({ ...updated });
      setSelectedCourseIds(preselectedCourses);
      setIsDraftNewSubject(false);
      // Close the edit modal then open the course picker so the user can change the linked course if desired
      setEditSubject(null);
      setCourseStepError("");
      setShowCoursePicker(true);
    } catch (err) {
      console.error("AdminSubjects.update:", err);
    }
  };

  // Open view modal. Accept the subject object from the list and only call backend when id looks valid.
  const openView = async (subject) => {
    if (!subject) return;

    // show immediate list data
    setViewSubject(subject);

    const id = subject.id;
    if (id === null || id === undefined || String(id).trim() === "") {
      console.debug(
        "AdminSubjects.openView: skipping backend fetch for empty id",
        subject
      );
      return;
    }

    try {
      setViewLoading(true);
      const details = await getSubjectById(id);
      if (details) setViewSubject(details);
    } catch (err) {
      console.error("AdminSubjects.openView:", err);
    } finally {
      setViewLoading(false);
    }
  };

  const courseFormSubjectId =
    subjectInProgress?.id ??
    subjectDraftData?.id ??
    subjectDraftData?.SubjectID ??
    subjectDraftData?.subjectId ??
    "";

  if (loading) return <Loader size="md" className="py-2" />;

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Classes</h1>
          <p className="text-sm text-gray-500">
            Manage classes and link them to courses
          </p>
        </div>
        <div>
          <Button
            onClick={() => {
              setSubjectDraftData(null);
              setSubjectInProgress(null);
              setIsDraftNewSubject(false);
              setSelectedCourseIds([]);
              setCourseStepError("");
              setShowCoursePicker(false);
              setShowAdd(true);
            }}
            variant="primary"
          >
            Add Class
          </Button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create classes and assign them to courses so teachers and students can find them."
          action={
            <Button
              variant="primary"
              onClick={() => {
                setSubjectDraftData(null);
                setSubjectInProgress(null);
                setIsDraftNewSubject(false);
                setSelectedCourseIds([]);
                setCourseStepError("");
                setShowCoursePicker(false);
                setShowAdd(true);
              }}
            >
              Add Class
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.map((s) => {
            const courseNames = Array.isArray(s.courseNames)
              ? s.courseNames
              : String(s.courseName || "")
                  .split(",")
                  .map((name) => name.trim())
                  .filter(Boolean);
            const hasCourses = courseNames.length > 0;
            const courseLabel = hasCourses
              ? `${
                  courseNames.length > 1 ? "Courses" : "Course"
                }: ${courseNames.join(", ")}`
              : "";

            return (
              <Card
                key={s.id}
                className="p-4 cursor-pointer hover:shadow-lg"
                onClick={() => {
                  const ident =
                    s?.id ?? s?.SubjectID ?? s?.subjectId ?? s?.name;
                  const target = ident ? encodeURIComponent(ident) : "";
                  if (target) {
                    // navigate to the shared subject view route
                    navigate(`/subjects/${target}`, {
                      state: { backgroundLocation: location },
                    });
                  } else {
                    // fallback to opening the modal when no identifier exists
                    openView(s);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-indigo-700 dark:text-white">
                      {s.name}
                    </h3>
                    {hasCourses ? (
                      <div className="text-sm text-gray-500">{courseLabel}</div>
                    ) : null}
                    {s.description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {s.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(s);
                      }}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(s.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showAdd}
        onClose={() => {
          if (creatingSubject) return;
          setShowAdd(false);
          setSubjectDraftData(null);
        }}
        title="Step 1 of 2 — Add Class"
      >
        <SubjectForm
          step={1}
          onSubmit={handleSubjectDetailsSubmit}
          onCancel={() => {
            if (creatingSubject) return;
            setShowAdd(false);
            setSubjectDraftData(null);
          }}
          loading={creatingSubject}
        />
      </Modal>

      <Modal
        isOpen={!!viewSubject}
        onClose={() => setViewSubject(null)}
        title={viewSubject?.name || "Class Details"}
      >
        {viewSubject
          ? (() => {
              const courseNames = Array.isArray(viewSubject.courseNames)
                ? viewSubject.courseNames
                : String(viewSubject.courseName || "")
                    .split(",")
                    .map((name) => name.trim())
                    .filter(Boolean);
              return (
                <div className="space-y-2">
                  <div>
                    <strong>ID:</strong> {viewSubject.id ?? "-"}
                  </div>
                  <div>
                    <strong>Code:</strong> {viewSubject.subjectCode ?? "-"}
                  </div>
                  <div>
                    <strong>Name:</strong> {viewSubject.name}
                  </div>
                  <div>
                    <strong>
                      {courseNames.length > 1 ? "Courses" : "Course"}:
                    </strong>{" "}
                    {courseNames.length ? courseNames.join(", ") : "-"}
                  </div>
                  <div>
                    <strong>Description:</strong>{" "}
                    {viewSubject.description ?? "-"}
                  </div>
                </div>
              );
            })()
          : viewLoading && <Loader size="sm" className="py-2" />}
      </Modal>

      <Modal
        isOpen={!!editSubject}
        onClose={() => setEditSubject(null)}
        title={`Edit Class`}
      >
        {editSubject ? (
          <SubjectForm
            initial={editSubject}
            onSubmit={handleUpdate}
            onCancel={() => setEditSubject(null)}
          />
        ) : (
          viewLoading && <Loader size="sm" className="py-2" />
        )}
      </Modal>

      <CoursePickerModal
        isOpen={showCoursePicker}
        onClose={handleCoursePickerClose}
        initialSelected={selectedCourseIds}
        onProceed={handleLinkCourse}
        title="Step 2 of 2 — Assign Courses"
        description="Select one or more courses to link with this class or add a new one."
        multiSelect
        saving={linkingCourse}
        proceedLabel="Assign Courses"
        errorMessage={courseStepError}
        courseFormDefaults={
          courseFormSubjectId
            ? { subjectId: String(courseFormSubjectId) }
            : { subjectId: "" }
        }
      />
    </div>
  );
};

export default AdminSubjects;
