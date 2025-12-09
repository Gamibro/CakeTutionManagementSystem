import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCourseDetails,
  getTeacherCourses,
} from "../../services/courseService";
import {
  getCourseMaterialsAll,
  getCourseMaterialsBySubject,
  updateMaterial,
  getMaterialById,
} from "../../services/materialService";
import MaterialList from "../../components/materials/MaterialList";
import Modal from "../../components/common/Modal";
import MaterialForm from "../../components/materials/MaterialForm";
import EmptyState from "../../components/common/EmptyState";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const resolveCourseId = (course) => {
  const candidate =
    course?.id ??
    course?.CourseID ??
    course?.CourseId ??
    course?.courseID ??
    course?.courseId ??
    null;
  return candidate != null ? String(candidate) : "";
};

const resolveMaterialId = (material) => {
  const candidate =
    material?.MaterialID ??
    material?.materialID ??
    material?.materialId ??
    material?.id ??
    null;
  return candidate != null ? String(candidate) : null;
};

const resolveCourseIdFromMaterial = (material) => {
  const candidate =
    material?.courseId ??
    material?.CourseID ??
    material?.CourseId ??
    material?.courseID ??
    material?.raw?.CourseID ??
    material?.raw?.courseID ??
    material?.raw?.Course?.CourseID ??
    material?.raw?.Course?.CourseId ??
    material?.raw?.Course?.courseID ??
    material?.raw?.Course?.courseId ??
    null;
  return candidate != null ? String(candidate) : null;
};

const isMaterialActive = (material) => {
  const flag =
    material?.isVisible ??
    material?.IsVisible ??
    material?.visible ??
    material?.Visible ??
    true;
  return flag !== false;
};

const computeMaterialCounts = (materials = []) => {
  const list = Array.isArray(materials) ? materials : [];
  let active = 0;
  for (const item of list) {
    if (isMaterialActive(item)) {
      active += 1;
    }
  }
  const inactive = Math.max(list.length - active, 0);
  return { active, inactive };
};

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
    material?.raw?.Class?.SubjectID ??
    material?.raw?.Class?.SubjectId ??
    material?.raw?.Class?.subjectID ??
    material?.raw?.Class?.subjectId ??
    material?.raw?.SubjectDetails?.SubjectID ??
    material?.raw?.SubjectDetails?.SubjectId ??
    material?.raw?.SubjectDetails?.subjectID ??
    material?.raw?.SubjectDetails?.subjectId ??
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

const DEFAULT_SUBJECT_LABEL = "Uncategorized Subject";
const SUBJECT_UNKNOWN_KEY = "__unknown_subject__";

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

const TeacherMaterials = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalCourseId, setModalCourseId] = useState(null);
  const [coursesWithMaterials, setCoursesWithMaterials] = useState([]);
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [courseLoading, setCourseLoading] = useState({});
  const [activeTab, setActiveTab] = useState("active");
  const [courseTabs, setCourseTabs] = useState({});
  const [removingIds, setRemovingIds] = useState(new Set());
  const [removeError, setRemoveError] = useState(null);
  const [restoringIds, setRestoringIds] = useState(new Set());
  const [restoreError, setRestoreError] = useState(null);

  const activeMaterials = useMemo(
    () => (materials || []).filter((m) => isMaterialActive(m)),
    [materials]
  );

  const inactiveMaterials = useMemo(
    () => (materials || []).filter((m) => !isMaterialActive(m)),
    [materials]
  );

  const singleCounts = useMemo(
    () => computeMaterialCounts(materials || []),
    [materials]
  );

  const groupedSingleMaterials = useMemo(
    () => ({
      active: groupMaterialsBySubject(activeMaterials),
      inactive: groupMaterialsBySubject(inactiveMaterials),
    }),
    [activeMaterials, inactiveMaterials]
  );

  const displayedSingleMaterials =
    activeTab === "active" ? activeMaterials : inactiveMaterials;
  const displayedSingleGroups = groupedSingleMaterials[activeTab] ?? [];

  const renderSingleMaterialActions = (material) => {
    const materialId = resolveMaterialId(material);
    if (activeTab === "active") {
      const removing = isRemoving(materialId);
      return (
        <button
          type="button"
          onClick={() => handleRemoveMaterial(material, id)}
          disabled={removing}
          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            removing
              ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60"
          }`}
        >
          {removing ? "Removing..." : "Remove"}
        </button>
      );
    }

    const restoring = isRestoring(materialId);
    return (
      <button
        type="button"
        onClick={() => handleRestoreMaterial(material, id)}
        disabled={restoring}
        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          restoring
            ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60"
        }`}
      >
        {restoring ? "Restoring..." : "Restore"}
      </button>
    );
  };

  const setRemovingFlag = (materialId, value) => {
    if (!materialId) return;
    setRemovingIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(materialId);
      else next.delete(materialId);
      return next;
    });
  };

  const isRemoving = (materialId) => {
    if (!materialId) return false;
    return removingIds.has(materialId);
  };

  const setRestoringFlag = (materialId, value) => {
    if (!materialId) return;
    setRestoringIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(materialId);
      else next.delete(materialId);
      return next;
    });
  };

  const isRestoring = (materialId) => {
    if (!materialId) return false;
    return restoringIds.has(materialId);
  };

  const setCourseTab = (courseId, tab) => {
    if (!courseId) return;
    setCourseTabs((prev) => ({ ...prev, [String(courseId)]: tab }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const [materialsData, courseData] = await Promise.all([
            getCourseMaterialsAll(id),
            getCourseDetails(id),
          ]);
          const visible = Array.isArray(materialsData) ? materialsData : [];
          // load persisted removed ids and fetch their details to include inactive materials
          let merged = [...visible];
          try {
            const storedRaw = localStorage.getItem("removedMaterials");
            const store = storedRaw ? JSON.parse(storedRaw) : {};
            const removedForCourse = Array.isArray(store[String(id)])
              ? store[String(id)]
              : [];
            for (const rid of removedForCourse) {
              if (
                !merged.find(
                  (m) => String(resolveMaterialId(m)) === String(rid)
                )
              ) {
                try {
                  const m = await getMaterialById(rid);
                  if (m) merged.push(m);
                } catch (e) {
                  // ignore single fetch errors
                }
              }
            }
          } catch (e) {
            console.warn("Failed to hydrate removed materials from storage", e);
          }

          setMaterials(merged);
          setCourse(courseData);
        } else {
          // No specific course - load teacher's courses and their materials
          const teacherId =
            user?.TeacherID ??
            user?.teacherID ??
            user?.teacherId ??
            user?.UserID ??
            user?.userID ??
            user?.userId ??
            user?.id ??
            null;

          if (teacherId) {
            const courses = await getTeacherCourses(teacherId);

            // Do not eagerly load all materials - render collapsible cards and fetch per-course when expanded
            const grouped = (courses || []).map((c) => ({
              course: c,
              materials: null, // null means not loaded yet
              materialCounts: null, // populated with active/inactive counts when available
            }));
            setCoursesWithMaterials(grouped || []);
            // Kick off lightweight count requests so headers can show material counts immediately
            // (grouped || []).forEach(async (entry) => {
            //   const cid = String(
            //     entry.course.id ??
            //       entry.course.CourseID ??
            //       entry.course.CourseId ??
            //       entry.course.courseId ??
            //       ""
            //   );
            //   try {
            //     const mats = await getCourseMaterialsAll(cid);
            //     const counts = computeMaterialCounts(mats);
            //     setCoursesWithMaterials((prev) =>
            //       prev.map((e) => {
            //         const idStr = String(
            //           e.course.id ??
            //             e.course.CourseID ??
            //             e.course.courseId ??
            //             ""
            //         );
            //         if (idStr === cid) {
            //           // Only set the counts here; keep materials null so toggle still triggers detailed load
            //           return {
            //             ...e,
            //             materialCounts: counts,
            //           };
            //         }
            //         return e;
            //       })
            //     );
            //   } catch (err) {
            //     // ignore individual failures; count will remain null
            //     // console.debug(`Failed to fetch count for course ${cid}`, err);
            //   }
            // });
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleMaterialSubmit = (newMaterial) => {
    if (!newMaterial) {
      setShowModal(false);
      setModalCourseId(null);
      return;
    }

    setRemoveError(null);

    const normalizedMaterial = {
      ...newMaterial,
      IsVisible:
        newMaterial?.IsVisible ??
        newMaterial?.isVisible ??
        newMaterial?.Visible ??
        true,
      isVisible:
        newMaterial?.isVisible ??
        newMaterial?.IsVisible ??
        newMaterial?.Visible ??
        true,
    };
    const materialId = resolveMaterialId(normalizedMaterial);

    if (id) {
      setMaterials((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        if (materialId) {
          const existingIndex = list.findIndex(
            (item) => resolveMaterialId(item) === materialId
          );
          if (existingIndex >= 0) {
            list[existingIndex] = {
              ...list[existingIndex],
              ...normalizedMaterial,
            };
          } else {
            list.unshift(normalizedMaterial);
          }
        } else {
          list.unshift(normalizedMaterial);
        }
        return list;
      });
      setActiveTab("active");
    } else if (modalCourseId) {
      const targetCourseId = String(modalCourseId);
      setCoursesWithMaterials((prev) =>
        prev.map((entry) => {
          const cid = resolveCourseId(entry.course);
          if (cid !== targetCourseId) {
            return entry;
          }

          if (Array.isArray(entry.materials)) {
            const nextMaterials = (() => {
              if (!materialId) {
                return [normalizedMaterial, ...entry.materials];
              }
              const idx = entry.materials.findIndex(
                (item) => resolveMaterialId(item) === materialId
              );
              if (idx >= 0) {
                const copy = [...entry.materials];
                copy[idx] = { ...copy[idx], ...normalizedMaterial };
                return copy;
              }
              return [normalizedMaterial, ...entry.materials];
            })();

            return {
              ...entry,
              materials: nextMaterials,
              materialCounts: computeMaterialCounts(nextMaterials),
            };
          }

          const baseCounts = entry.materialCounts ?? { active: 0, inactive: 0 };
          const activeIncrement = isMaterialActive(normalizedMaterial) ? 1 : 0;
          const inactiveIncrement = activeIncrement ? 0 : 1;
          return {
            ...entry,
            materialCounts: {
              active: baseCounts.active + activeIncrement,
              inactive: baseCounts.inactive + inactiveIncrement,
            },
          };
        })
      );
      setCourseTab(targetCourseId, "active");
    }

    setShowModal(false);
    setModalCourseId(null);
  };

  // Refresh materials for a given course/subject when an upload occurs elsewhere
  const refreshCourseMaterialsBySubject = async (
    courseIdToRefresh,
    subjectIdToRefresh
  ) => {
    if (!courseIdToRefresh) return;
    try {
      const cid = String(courseIdToRefresh);
      let fetched = [];

      if (subjectIdToRefresh) {
        try {
          fetched = await getCourseMaterialsBySubject(cid, subjectIdToRefresh);
        } catch (err) {
          fetched = [];
        }
      } else {
        try {
          fetched = await getCourseMaterialsAll(cid);
        } catch (err) {
          fetched = [];
        }
      }

      // If viewing single course, merge into `materials`
      if (id && String(id) === String(cid)) {
        setMaterials((prev) => {
          const prevList = Array.isArray(prev) ? [...prev] : [];
          const keep = prevList.filter((m) => {
            const sid = resolveSubjectId(m) ?? null;
            return String(sid) !== String(subjectIdToRefresh);
          });

          const combined = [
            ...(Array.isArray(fetched) ? fetched : []),
            ...keep,
          ];
          const seen = new Set();
          return combined.filter((m) => {
            const mid = resolveMaterialId(m) ?? m?.id ?? null;
            const key = mid != null ? String(mid) : JSON.stringify(m);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
        return;
      }

      // For overview, update the specific course entry
      setCoursesWithMaterials((prev) =>
        prev.map((entry) => {
          const cidEntry = resolveCourseId(entry.course);
          if (String(cidEntry) !== String(cid)) return entry;

          const existing = Array.isArray(entry.materials)
            ? entry.materials
            : null;

          if (!existing) {
            return {
              ...entry,
              materials: Array.isArray(fetched) ? fetched : [],
              materialCounts: computeMaterialCounts(
                Array.isArray(fetched) ? fetched : []
              ),
            };
          }

          const kept = existing.filter((m) => {
            const sid = resolveSubjectId(m) ?? null;
            return String(sid) !== String(subjectIdToRefresh);
          });

          const combined = [
            ...(Array.isArray(fetched) ? fetched : []),
            ...kept,
          ];
          const seen = new Set();
          const dedup = combined.filter((m) => {
            const mid = resolveMaterialId(m) ?? m?.id ?? null;
            const key = mid != null ? String(mid) : JSON.stringify(m);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          return {
            ...entry,
            materials: dedup,
            materialCounts: computeMaterialCounts(dedup),
          };
        })
      );
    } catch (err) {
      console.warn(
        "Failed to refresh materials for",
        courseIdToRefresh,
        subjectIdToRefresh,
        err
      );
    }
  };

  useEffect(() => {
    const handler = (ev) => {
      try {
        const detail = ev?.detail ?? {};
        const courseId = detail.courseId;
        const subjectId = detail.subjectId;
        if (!courseId) return;
        refreshCourseMaterialsBySubject(courseId, subjectId);
      } catch (e) {
        // ignore
      }
    };

    if (typeof window !== "undefined" && window && window.addEventListener) {
      window.addEventListener("studyMaterial:uploaded", handler);
    }

    return () => {
      if (
        typeof window !== "undefined" &&
        window &&
        window.removeEventListener
      ) {
        window.removeEventListener("studyMaterial:uploaded", handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, coursesWithMaterials]);

  const toggleCourse = async (courseEntry) => {
    const cid = String(
      courseEntry.course.id ??
        courseEntry.course.CourseID ??
        courseEntry.course.CourseId ??
        courseEntry.course.courseId ??
        ""
    );

    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });

    setCourseTabs((prev) => {
      if (prev[cid]) return prev;
      return { ...prev, [cid]: "active" };
    });

    // If materials not loaded yet, fetch them. Try per-subject endpoint first when course subjects are available.
    if (!courseEntry.materials || courseEntry.materials === null) {
      setCourseLoading((s) => ({ ...s, [cid]: true }));
      try {
        // Attempt to fetch course details to discover subjects
        let courseDetails = null;
        try {
          courseDetails = await getCourseDetails(cid);
        } catch (err) {
          courseDetails = null;
        }

        const subjectIds =
          (courseDetails &&
            (courseDetails.subjectIds ??
              courseDetails.SubjectIDs ??
              courseDetails.SubjectIds ??
              courseDetails.subjectIDs)) ||
          [];

        let merged = [];

        if (Array.isArray(subjectIds) && subjectIds.length) {
          // Fetch per-subject materials in parallel
          const subjectIdStrings = subjectIds.map((s) => String(s));
          const fetches = subjectIdStrings.map((sid) =>
            getCourseMaterialsBySubject(cid, sid).catch(() => [])
          );

          // Also fetch full course materials as fallback to include un-categorized items
          const allPromise = getCourseMaterialsAll(cid).catch(() => []);

          const results = await Promise.all([Promise.all(fetches), allPromise]);
          const perSubjectArrays = results[0] || [];
          const allMaterials = Array.isArray(results[1]) ? results[1] : [];

          // Flatten subject arrays and dedupe by material id
          const seen = new Set();
          for (const arr of perSubjectArrays) {
            for (const m of Array.isArray(arr) ? arr : []) {
              const mid = resolveMaterialId(m) ?? m?.id ?? null;
              const key = mid != null ? String(mid) : JSON.stringify(m);
              if (!seen.has(key)) {
                seen.add(key);
                merged.push(m);
              }
            }
          }

          // Add any materials from allMaterials that weren't included (e.g., no SubjectID)
          for (const m of Array.isArray(allMaterials) ? allMaterials : []) {
            const mid = resolveMaterialId(m) ?? m?.id ?? null;
            const key = mid != null ? String(mid) : JSON.stringify(m);
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(m);
            }
          }
        } else {
          // No subjects known -> fallback to previous behavior
          const mats = await getCourseMaterialsAll(cid);
          merged = Array.isArray(mats) ? mats : [];
        }

        // hydrate removed materials for this course (stored locally)
        try {
          const storedRaw = localStorage.getItem("removedMaterials");
          const store = storedRaw ? JSON.parse(storedRaw) : {};
          const removedForCourse = Array.isArray(store[String(cid)])
            ? store[String(cid)]
            : [];
          for (const rid of removedForCourse) {
            if (
              !merged.find((m) => String(resolveMaterialId(m)) === String(rid))
            ) {
              try {
                const m = await getMaterialById(rid);
                if (m) merged.push(m);
              } catch (e) {
                // ignore single fetch errors
              }
            }
          }
        } catch (e) {
          console.warn("Failed to hydrate removed materials from storage", e);
        }

        const mergedCounts = computeMaterialCounts(merged);
        setCoursesWithMaterials((prev) =>
          prev.map((entry) => {
            const idStr = String(
              entry.course.id ??
                entry.course.CourseID ??
                entry.course.courseId ??
                ""
            );
            if (idStr === cid) {
              return {
                ...entry,
                materials: merged,
                materialCounts: mergedCounts,
              };
            }
            return entry;
          })
        );
      } catch (e) {
        console.error(`Failed to load materials for course ${cid}`, e);
      } finally {
        setCourseLoading((s) => ({ ...s, [cid]: false }));
      }
    }
  };

  const handleRemoveMaterial = async (material, courseIdOverride = null) => {
    const materialId = resolveMaterialId(material);
    if (!materialId) {
      console.warn("Unable to resolve material id for removal", material);
      return;
    }

    if (!isMaterialActive(material) || isRemoving(materialId)) {
      return;
    }

    setRemoveError(null);
    setRemovingFlag(materialId, true);

    try {
      const visibilityPatch = {
        ...material,
        IsVisible: false,
        isVisible: false,
        Visible: false,
      };

      const updated = await updateMaterial(materialId, visibilityPatch);
      const applied = updated ?? {
        ...material,
        IsVisible: false,
        isVisible: false,
        Visible: false,
      };

      // Persist the removed material id so we can rehydrate inactive items after reload
      try {
        const storedRaw = localStorage.getItem("removedMaterials");
        const store = storedRaw ? JSON.parse(storedRaw) : {};
        const courseIdToUse = String(
          courseIdOverride ??
            resolveCourseIdFromMaterial(material) ??
            resolveCourseIdFromMaterial(applied) ??
            ""
        );
        if (!store[courseIdToUse]) store[courseIdToUse] = [];
        if (!store[courseIdToUse].includes(String(materialId))) {
          store[courseIdToUse].push(String(materialId));
          localStorage.setItem("removedMaterials", JSON.stringify(store));
        }
      } catch (errLocal) {
        // ignore localStorage errors
        console.warn("Failed to persist removed material id", errLocal);
      }

      if (id) {
        setMaterials((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          let matched = false;
          const next = list.map((item) => {
            const itemId = resolveMaterialId(item);
            if (itemId === materialId) {
              matched = true;
              return {
                ...item,
                ...applied,
                IsVisible: false,
                isVisible: false,
                Visible: false,
              };
            }
            return item;
          });
          if (!matched) {
            return [
              ...next,
              {
                ...applied,
                IsVisible: false,
                isVisible: false,
                Visible: false,
              },
            ];
          }
          return next;
        });
      } else {
        const courseId =
          courseIdOverride ??
          resolveCourseIdFromMaterial(material) ??
          resolveCourseIdFromMaterial(applied);

        setCoursesWithMaterials((prev) =>
          prev.map((entry) => {
            const entryId = resolveCourseId(entry.course);
            if (entryId !== String(courseId ?? "")) {
              return entry;
            }

            if (Array.isArray(entry.materials)) {
              const nextMaterials = entry.materials.map((item) => {
                const itemId = resolveMaterialId(item);
                if (itemId === materialId) {
                  return {
                    ...item,
                    ...applied,
                    IsVisible: false,
                    isVisible: false,
                    Visible: false,
                  };
                }
                return item;
              });
              const counts = computeMaterialCounts(nextMaterials);
              return {
                ...entry,
                materials: nextMaterials,
                materialCounts: counts,
              };
            }

            const baseCounts =
              entry.materialCounts ??
              computeMaterialCounts(entry.materials || []);
            const updatedCounts = {
              active: Math.max(baseCounts.active - 1, 0),
              inactive: baseCounts.inactive + 1,
            };
            return {
              ...entry,
              materialCounts: updatedCounts,
            };
          })
        );
      }
    } catch (error) {
      console.error("Failed to mark material inactive", error);
      setRemoveError("Failed to remove material. Please try again.");
    } finally {
      setRemovingFlag(materialId, false);
    }
  };

  const handleRestoreMaterial = async (material, courseIdOverride = null) => {
    const materialId = resolveMaterialId(material);
    if (!materialId) {
      console.warn("Unable to resolve material id for restore", material);
      return;
    }

    if (isRestoring(materialId) || !materialId) return;

    setRestoreError(null);
    setRestoringFlag(materialId, true);

    try {
      const visibilityPatch = {
        ...material,
        IsVisible: true,
        isVisible: true,
        Visible: true,
      };

      const updated = await updateMaterial(materialId, visibilityPatch);
      const applied = updated ?? {
        ...material,
        IsVisible: true,
        isVisible: true,
        Visible: true,
      };

      // Remove persisted removed id from localStorage
      try {
        const storedRaw = localStorage.getItem("removedMaterials");
        const store = storedRaw ? JSON.parse(storedRaw) : {};
        const courseIdToUse = String(
          courseIdOverride ??
            resolveCourseIdFromMaterial(material) ??
            resolveCourseIdFromMaterial(applied) ??
            ""
        );
        if (store[courseIdToUse]) {
          const idx = store[courseIdToUse].indexOf(String(materialId));
          if (idx >= 0) {
            store[courseIdToUse].splice(idx, 1);
            if (store[courseIdToUse].length === 0) delete store[courseIdToUse];
            localStorage.setItem("removedMaterials", JSON.stringify(store));
          }
        }
      } catch (errLocal) {
        console.warn(
          "Failed to remove persisted removed material id",
          errLocal
        );
      }

      if (id) {
        // single-course view
        setMaterials((prev) => {
          const list = Array.isArray(prev) ? [...prev] : [];
          const next = list.map((item) => {
            const itemId = resolveMaterialId(item);
            if (String(itemId) === String(materialId)) {
              return {
                ...item,
                ...applied,
                IsVisible: true,
                isVisible: true,
                Visible: true,
              };
            }
            return item;
          });
          return next;
        });
      } else {
        // overview per-course
        const courseId =
          courseIdOverride ??
          resolveCourseIdFromMaterial(material) ??
          resolveCourseIdFromMaterial(applied);
        setCoursesWithMaterials((prev) =>
          prev.map((entry) => {
            const entryId = resolveCourseId(entry.course);
            if (entryId !== String(courseId ?? "")) return entry;

            if (Array.isArray(entry.materials)) {
              const nextMaterials = entry.materials.map((item) => {
                const itemId = resolveMaterialId(item);
                if (String(itemId) === String(materialId)) {
                  return {
                    ...item,
                    ...applied,
                    IsVisible: true,
                    isVisible: true,
                    Visible: true,
                  };
                }
                return item;
              });
              return {
                ...entry,
                materials: nextMaterials,
                materialCounts: computeMaterialCounts(nextMaterials),
              };
            }

            // if materials not loaded, adjust counts
            const baseCounts = entry.materialCounts ?? {
              active: 0,
              inactive: 0,
            };
            return {
              ...entry,
              materialCounts: {
                active: baseCounts.active + 1,
                inactive: Math.max(baseCounts.inactive - 1, 0),
              },
            };
          })
        );
      }
    } catch (error) {
      console.error("Failed to restore material", error);
      setRestoreError("Failed to restore material. Please try again.");
    } finally {
      setRestoringFlag(materialId, false);
    }
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
  //         description="Please select a course to view or upload materials."
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-8">
      {id ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white border-l-4 border-indigo-500/60 dark:border-indigo-400/60 pl-3">
              Materials for {course?.name}
            </h1>
            <Button
              variant="primary"
              onClick={() => {
                setModalCourseId(id);
                setShowModal(true);
              }}
              className="w-full sm:w-auto"
            >
              Upload Material
            </Button>
          </div>

          <div className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="inline-flex rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab("active")}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                    activeTab === "active"
                      ? "bg-indigo-600 text-white"
                      : "text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-800/40"
                  }`}
                >
                  Active ({singleCounts.active})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("inactive")}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                    activeTab === "inactive"
                      ? "bg-indigo-600 text-white"
                      : "text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-800/40"
                  }`}
                >
                  Inactive ({singleCounts.inactive})
                </button>
              </div>
            </div>

            {removeError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200">
                {removeError}
              </div>
            )}
            {displayedSingleGroups.length ? (
              displayedSingleGroups.map((group) => (
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
                    renderActions={renderSingleMaterialActions}
                  />
                </div>
              ))
            ) : (
              <MaterialList
                materials={displayedSingleMaterials}
                renderActions={renderSingleMaterialActions}
              />
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white border-l-4 border-indigo-500/60 dark:border-indigo-400/60 pl-3">
              Your Courses & Materials
            </h1>
          </div>

          {removeError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200">
              {removeError}
            </div>
          )}

          <div className="space-y-6">
            {coursesWithMaterials && coursesWithMaterials.length ? (
              coursesWithMaterials.map(
                ({ course: c, materials: mats, materialCounts: snapshot }) => {
                  const cid = String(
                    c.id ?? c.CourseID ?? c.CourseId ?? c.courseId ?? ""
                  );
                  const isExpanded = expandedCourses.has(cid);
                  const isLoading = Boolean(courseLoading[cid]);
                  const countsSource = Array.isArray(mats)
                    ? computeMaterialCounts(mats)
                    : snapshot ?? { active: 0, inactive: 0 };
                  const counts = {
                    active: countsSource.active ?? 0,
                    inactive: countsSource.inactive ?? 0,
                  };
                  const currentTab = courseTabs[cid] || "active";
                  const allMaterials = Array.isArray(mats) ? mats : [];
                  const activeList = allMaterials.filter((m) =>
                    isMaterialActive(m)
                  );
                  const inactiveList = allMaterials.filter(
                    (m) => !isMaterialActive(m)
                  );
                  const displayedMaterials =
                    currentTab === "inactive" ? inactiveList : activeList;
                  const renderCourseMaterialActions = (material) => {
                    const materialId = resolveMaterialId(material);
                    if (currentTab === "active") {
                      const removing = isRemoving(materialId);
                      return (
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterial(material, cid)}
                          disabled={removing}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            removing
                              ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                              : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60"
                          }`}
                        >
                          {removing ? "Removing..." : "Remove"}
                        </button>
                      );
                    }

                    const restoring = isRestoring(materialId);
                    return (
                      <button
                        type="button"
                        onClick={() => handleRestoreMaterial(material, cid)}
                        disabled={restoring}
                        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          restoring
                            ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60"
                        }`}
                      >
                        {restoring ? "Restoring..." : "Restore"}
                      </button>
                    );
                  };
                  const subjectGroups =
                    groupMaterialsBySubject(displayedMaterials);

                  return (
                    <div
                      key={cid}
                      className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-4 sm:p-6"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                        <button
                          type="button"
                          onClick={() =>
                            toggleCourse({ course: c, materials: mats })
                          }
                          className="flex items-center gap-3 text-left focus:outline-none"
                        >
                          <ChevronDownIcon
                            className={`h-5 w-5 text-indigo-600 transform transition-transform ${
                              isExpanded ? "-rotate-180" : "rotate-0"
                            }`}
                          />
                          <div>
                            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">
                              {c.name || c.CourseName || `Course ${cid}`}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {c.subject ||
                                c.subjectDetails?.name ||
                                "Course materials"}
                            </p>
                          </div>
                        </button>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <Button
                            onClick={() => {
                              setModalCourseId(cid);
                              setShowModal(true);
                            }}
                            className="w-full text-sm  justify-center items-center sm:w-auto bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white"
                          >
                            Upload for this course
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-4">
                          {isLoading ? (
                            <div className="py-6">
                              <Loader />
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="inline-flex rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 shadow-sm">
                                  <button
                                    type="button"
                                    onClick={() => setCourseTab(cid, "active")}
                                    className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-l-lg transition-colors ${
                                      currentTab === "active"
                                        ? "bg-indigo-600 text-white"
                                        : "text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-800/40"
                                    }`}
                                  >
                                    Active ({counts.active})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCourseTab(cid, "inactive")
                                    }
                                    className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-r-lg transition-colors ${
                                      currentTab === "inactive"
                                        ? "bg-indigo-600 text-white"
                                        : "text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-800/40"
                                    }`}
                                  >
                                    Inactive ({counts.inactive})
                                  </button>
                                </div>
                              </div>

                              {subjectGroups.length ? (
                                subjectGroups.map((group) => (
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
                                      renderActions={
                                        renderCourseMaterialActions
                                      }
                                    />
                                  </div>
                                ))
                              ) : (
                                <MaterialList
                                  materials={displayedMaterials}
                                  renderActions={renderCourseMaterialActions}
                                />
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )
            ) : (
              <EmptyState
                title="No courses found"
                description="You don't have any courses yet. Create a course to add materials."
              />
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setModalCourseId(null);
        }}
        title="Upload Study Material"
      >
        <MaterialForm
          courseId={modalCourseId}
          onSuccess={handleMaterialSubmit}
          onCancel={() => {
            setShowModal(false);
            setModalCourseId(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default TeacherMaterials;
