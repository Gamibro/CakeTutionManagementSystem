import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCourseDetails } from "../../services/courseService";
import {
  getStudentMaterials,
  getCourseMaterialsBySubject,
} from "../../services/materialService";
import { getStudentCourses } from "../../services/courseService";
import MaterialList from "../../components/materials/MaterialList";
import Loader from "../../components/common/Loader";
import MaterialForm from "../../components/materials/MaterialForm";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import {
  ArrowUpTrayIcon,
  FunnelIcon,
  TrashIcon,
  PlusIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const DEFAULT_SUBJECT_LABEL = "Uncategorized Subject";
const SUBJECT_UNKNOWN_KEY = "__unknown_subject__";

const resolveSubjectId = (material) => {
  const candidate =
    material?.subjectId ??
    material?.SubjectID ??
    material?.SubjectId ??
    material?.subjectID ??
    material?.raw?.SubjectID ??
    material?.raw?.SubjectId ??
    material?.raw?.subjectID ??
    material?.raw?.subjectId ??
    material?.raw?.Subject?.SubjectID ??
    material?.raw?.Subject?.SubjectId ??
    material?.raw?.Subject?.subjectID ??
    material?.raw?.Subject?.subjectId ??
    null;

  if (candidate === null || candidate === undefined) return null;
  const asString = String(candidate).trim();
  return asString ? asString : null;
};

const resolveSubjectName = (material) => {
  const candidateStrings = [
    material?.subjectName,
    material?.SubjectName,
    material?.subjectTitle,
    material?.SubjectTitle,
    material?.subjectLabel,
    material?.SubjectLabel,
    material?.subjectDescription,
    material?.SubjectDescription,
    material?.subjectCode,
    material?.SubjectCode,
    material?.raw?.SubjectName,
    material?.raw?.subjectName,
  ];

  for (const value of candidateStrings) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }

  const subjectObjects = [
    material?.subject,
    material?.Subject,
    material?.raw?.Subject,
    material?.raw?.subject,
    material?.raw?.SubjectDetails,
    material?.raw?.subjectDetails,
    material?.raw?.Class,
    material?.raw?.class,
  ];

  for (const subject of subjectObjects) {
    if (typeof subject === "string") {
      const trimmed = subject.trim();
      if (trimmed) return trimmed;
      continue;
    }

    if (subject && typeof subject === "object") {
      const nestedCandidates = [
        subject.SubjectName,
        subject.subjectName,
        subject.Name,
        subject.name,
        subject.Title,
        subject.title,
        subject.Label,
        subject.label,
        subject.Description,
        subject.description,
        subject.Code,
        subject.code,
      ];
      for (const value of nestedCandidates) {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed) return trimmed;
        }
      }
    }
  }

  return "";
};

const groupMaterialsBySubject = (materials = []) => {
  const list = Array.isArray(materials) ? materials : [];
  if (!list.length) return [];

  const groups = new Map();

  for (const material of list) {
    if (!material) continue;
    const subjectId = resolveSubjectId(material);
    const resolvedName = resolveSubjectName(material);
    const subjectName =
      resolvedName ||
      (subjectId ? `Subject ${subjectId}` : DEFAULT_SUBJECT_LABEL);
    const key = subjectId
      ? `id:${subjectId}`
      : resolvedName
      ? `name:${resolvedName.toLowerCase()}`
      : SUBJECT_UNKNOWN_KEY;

    if (!groups.has(key)) {
      groups.set(key, {
        subjectId: subjectId,
        subjectName,
        subjectKey: key,
        materials: [],
      });
    }

    groups.get(key).materials.push(material);
  }

  const compareGroups = (a, b) => {
    const isAUnknown = a.subjectKey === SUBJECT_UNKNOWN_KEY;
    const isBUnknown = b.subjectKey === SUBJECT_UNKNOWN_KEY;
    if (isAUnknown && !isBUnknown) return 1;
    if (!isAUnknown && isBUnknown) return -1;
    const nameA = (a.subjectName || DEFAULT_SUBJECT_LABEL).toLowerCase();
    const nameB = (b.subjectName || DEFAULT_SUBJECT_LABEL).toLowerCase();
    return nameA.localeCompare(nameB);
  };

  return Array.from(groups.values()).sort(compareGroups);
};

const StudentMaterials = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [groupedMaterials, setGroupedMaterials] = useState([]); // [{ course, materials: [] }]
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          // For a single course view, try to fetch materials per-subject when subjects exist
          const courseData = await getCourseDetails(id).catch(() => null);
          setCourse(courseData);

          const subjectIds =
            (courseData &&
              (courseData.subjectIds ??
                courseData.SubjectIDs ??
                courseData.SubjectIds ??
                courseData.subjectIDs)) ||
            [];

          let merged = [];

          if (Array.isArray(subjectIds) && subjectIds.length) {
            const subjectIdStrings = subjectIds.map((s) => String(s));
            const fetches = subjectIdStrings.map((sid) =>
              getCourseMaterialsBySubject(id, sid).catch(() => [])
            );

            const perSubjectArrays = await Promise.all(fetches).catch(() => []);

            const seen = new Set();
            for (const arr of perSubjectArrays) {
              for (const m of Array.isArray(arr) ? arr : []) {
                const mid = m?.id ?? m?.MaterialID ?? m?.materialId ?? null;
                const key = mid != null ? String(mid) : JSON.stringify(m);
                if (!seen.has(key)) {
                  seen.add(key);
                  merged.push(m);
                }
              }
            }
          } else {
            // No subject ids available; do not call course-level API per requirements.
            merged = [];
          }

          setMaterials(merged);
        } else {
          // No specific course id: load materials grouped by the logged-in student's courses
          const studentId =
            user?.StudentID ??
            user?.studentID ??
            user?.studentId ??
            user?.UserID ??
            user?.userID ??
            user?.userId ??
            user?.id ??
            null;

          if (studentId) {
            // Try to get enrolled courses first
            const courses = await getStudentCourses(studentId);

            if (Array.isArray(courses) && courses.length) {
              // Initialize grouped state to show skeletons and allow per-course loading
              setGroupedMaterials(
                courses.map((c) => ({
                  course: c,
                  materials: [],
                  loading: true,
                  expanded: false,
                }))
              );

              // Fetch materials per-course and update state as they resolve.
              // Try per-subject API when course subjects are available.
              courses.forEach(async (c) => {
                const courseId = c.id ?? c.CourseID ?? c.courseId;
                try {
                  let merged = [];

                  // fetch course details to discover subjects
                  const details = await getCourseDetails(
                    String(courseId)
                  ).catch(() => null);
                  const subjectIds =
                    (details &&
                      (details.subjectIds ??
                        details.SubjectIDs ??
                        details.SubjectIds ??
                        details.subjectIDs)) ||
                    [];

                  if (Array.isArray(subjectIds) && subjectIds.length) {
                    const subjectIdStrings = subjectIds.map((s) => String(s));
                    const fetches = subjectIdStrings.map((sid) =>
                      getCourseMaterialsBySubject(String(courseId), sid).catch(
                        () => []
                      )
                    );

                    const perSubjectArrays = await Promise.all(fetches).catch(
                      () => []
                    );

                    const seen = new Set();
                    for (const arr of perSubjectArrays) {
                      for (const m of Array.isArray(arr) ? arr : []) {
                        const mid =
                          m?.id ?? m?.MaterialID ?? m?.materialId ?? null;
                        const key =
                          mid != null ? String(mid) : JSON.stringify(m);
                        if (!seen.has(key)) {
                          seen.add(key);
                          merged.push(m);
                        }
                      }
                    }
                  } else {
                    // No subject ids available; do not call course-level API per requirements.
                    merged = [];
                  }

                  setGroupedMaterials((prev) =>
                    prev.map((g) =>
                      String(
                        g.course?.id ?? g.course?.CourseID ?? g.course?.courseId
                      ) === String(courseId)
                        ? {
                            ...g,
                            materials: Array.isArray(merged) ? merged : [],
                            loading: false,
                          }
                        : g
                    )
                  );
                } catch (e) {
                  setGroupedMaterials((prev) =>
                    prev.map((g) =>
                      String(
                        g.course?.id ?? g.course?.CourseID ?? g.course?.courseId
                      ) === String(courseId)
                        ? { ...g, materials: [], loading: false }
                        : g
                    )
                  );
                }
              });

              // Clear flat materials and course detail
              setMaterials([]);
              setCourse(null);
            } else {
              // Fallback: fetch student materials if courses cannot be determined
              const studentMats = await getStudentMaterials(studentId);
              setMaterials(Array.isArray(studentMats) ? studentMats : []);
              setGroupedMaterials([]);
              setCourse(null);
            }
          } else {
            setMaterials([]);
            setGroupedMaterials([]);
            setCourse(null);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleMaterialSubmit = (newMaterial) => {
    setMaterials((prev) => [newMaterial, ...prev]);
    setShowUploadModal(false);
  };

  const handleFilterClick = () => {
    console.info("Filter action clicked - hook up filter logic here.");
    setFabOpen(false);
  };

  const handleBulkDelete = () => {
    console.info("Bulk delete action clicked - hook up delete logic here.");
    setFabOpen(false);
  };

  const ActionIconButton = ({
    icon: Icon,
    label,
    onClick,
    intent = "default",
  }) => {
    const baseStyles =
      "flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:h-12 sm:w-12";
    const palette = {
      default:
        "bg-white text-gray-700 hover:bg-gray-100 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
      primary:
        "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
      danger:
        "bg-white text-red-600 hover:bg-red-50 focus:ring-red-500 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700",
    };

    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        className={`${baseStyles} ${palette[intent] || palette.default}`}
      >
        <Icon className="h-6 w-6" />
      </button>
    );
  };

  if (loading) {
    return <Loader className="py-12" />;
  }

  // if (!id) {
  //   return (
  //     <div className="space-y-6">
  //       <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  //         Study Materials
  //       </h1>
  //       <EmptyState
  //         title="Select a course"
  //         description="Please select a course to view study materials."
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 sm:space-y-8">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
          Study Hub
        </p>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
          {id
            ? `Materials for ${course?.name ?? "Selected Course"}`
            : "Your Study Materials"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Access shared resources, download attachments, and stay up to date.
        </p>
      </header>

      <section className="relative rounded-2xl border border-dashed border-gray-200 bg-white/95 px-4 py-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-900/60 sm:px-8 sm:py-8">
        {id ? (
          // Single course view: group materials by subject similar to teacher view
          materials.length > 0 ? (
            (() => {
              const subjectGroups = groupMaterialsBySubject(materials);
              return subjectGroups.length ? (
                <div className="space-y-4 sm:space-y-6">
                  {subjectGroups.map((group) => (
                    <div key={group.subjectKey} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {group.subjectName}
                        </h3>
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                          {group.materials.length} material
                          {group.materials.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <MaterialList
                        materials={group.materials}
                        compact={false}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <MaterialList
                  materials={materials}
                  className="bg-transparent"
                />
              );
            })()
          ) : (
            <EmptyState
              title="No Materials Available"
              description={
                "There are no study materials available for this course yet."
              }
            />
          )
        ) : groupedMaterials.length ? (
          // Render grouped materials by course (collapsible cards)
          <div className="space-y-4 sm:space-y-6">
            {groupedMaterials.map(
              ({ course: c, materials: mats, loading, expanded }) => {
                const key =
                  c?.id ?? c?.CourseID ?? c?.courseId ?? Math.random();
                const courseTitle =
                  c?.name ?? c?.CourseName ?? "Untitled Course";
                const courseSubtitle =
                  c?.subject ||
                  c?.subjectDetails?.name ||
                  c?.code ||
                  "Course materials";
                const teacherName =
                  c?.teacher?.firstName || c?.teacher?.lastName
                    ? `${c?.teacher?.firstName ?? ""} ${
                        c?.teacher?.lastName ?? ""
                      }`.trim()
                    : null;

                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                          {courseTitle}
                        </h3>
                        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                          {courseSubtitle}
                          {teacherName ? ` • ${teacherName}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-sm">
                          {loading
                            ? "Loading…"
                            : `${mats.length} ${
                                mats.length === 1 ? "material" : "materials"
                              }`}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setGroupedMaterials((prev) =>
                              prev.map((g) =>
                                String(
                                  g.course?.id ??
                                    g.course?.CourseID ??
                                    g.course?.courseId
                                ) ===
                                String(c?.id ?? c?.CourseID ?? c?.courseId)
                                  ? { ...g, expanded: !g.expanded }
                                  : g
                              )
                            )
                          }
                          className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-expanded={expanded}
                          aria-label={
                            expanded
                              ? `Collapse ${courseTitle}`
                              : `Expand ${courseTitle}`
                          }
                        >
                          <ChevronDownIcon
                            className={`h-5 w-5 transform transition-transform ${
                              expanded ? "rotate-180" : "rotate-0"
                            } text-gray-600 dark:text-gray-300`}
                          />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="px-4 pb-4 sm:px-6">
                        {loading ? (
                          <div className="flex justify-center py-6">
                            <Loader />
                          </div>
                        ) : (
                          (() => {
                            const subjectGroups = groupMaterialsBySubject(
                              mats || []
                            );
                            return subjectGroups.length ? (
                              <div className="space-y-3">
                                {subjectGroups.map((group) => (
                                  <div
                                    key={group.subjectKey}
                                    className="space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {group.subjectName}
                                      </h4>
                                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                                        {group.materials.length} material
                                        {group.materials.length === 1
                                          ? ""
                                          : "s"}
                                      </span>
                                    </div>
                                    <MaterialList
                                      materials={group.materials}
                                      compact={true}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <MaterialList materials={mats} compact={true} />
                            );
                          })()
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        ) : materials.length > 0 ? (
          // Fallback: flat list of student materials
          <MaterialList materials={materials} className="bg-transparent" />
        ) : (
          <EmptyState
            title="No Materials Available"
            description={
              "There are no study materials available for your courses yet."
            }
          />
        )}

        {/* Students shouldn't upload materials; show FAB only when viewing a specific course */}
        {id && (
          <div className="absolute bottom-4 right-4 flex items-center sm:bottom-6 sm:right-6">
            <div
              className={`mr-2 flex items-center gap-2 origin-right transform transition-all duration-200 ease-out sm:mr-4 sm:gap-3 ${
                fabOpen
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-4 pointer-events-none"
              }`}
            >
              <ActionIconButton
                icon={TrashIcon}
                label="Bulk delete materials"
                onClick={handleBulkDelete}
                intent="danger"
              />
              <ActionIconButton
                icon={ArrowUpTrayIcon}
                label="Upload new material"
                onClick={() => {
                  setShowUploadModal(true);
                  setFabOpen(false);
                }}
                intent="primary"
              />
              <ActionIconButton
                icon={FunnelIcon}
                label="Filter materials"
                onClick={handleFilterClick}
              />
            </div>

            <button
              type="button"
              aria-label={fabOpen ? "Close actions" : "Open actions"}
              onClick={() => setFabOpen((s) => !s)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:h-14 sm:w-14"
            >
              <PlusIcon
                className={`h-6 w-6 transform transition-transform ${
                  fabOpen ? "rotate-45" : "rotate-0"
                }`}
              />
            </button>
          </div>
        )}
      </section>

      {id && (
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Upload Study Material"
        >
          <MaterialForm
            courseId={id}
            onSuccess={handleMaterialSubmit}
            onCancel={() => setShowUploadModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default StudentMaterials;
