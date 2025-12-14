import { useEffect, useMemo, useState } from "react";

// import Modal from "./Modal";

import Modal from "./Modal2";

import Button from "./Button";
import Loader from "./Loader";
import Avatar from "./Avatar";
import { getAllStudents } from "../../services/studentService";

const resolveStudentId = (student) => {
  if (!student || typeof student !== "object") {
    return "";
  }

  const candidates = [
    student.StudentID,
    student.studentID,
    student.studentId,
    student.UserID,
    student.userID,
    student.userId,
    student.id,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const value = String(candidate).trim();
    if (value) return value;
  }

  return "";
};

const resolveStudentActive = (student) => {
  if (!student || typeof student !== "object") return true;

  const raw =
    student.IsActive ??
    student.isActive ??
    (student.UserDetails &&
      (student.UserDetails.IsActive ?? student.UserDetails.isActive)) ??
    null;

  if (raw === null || raw === undefined) return true;

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "active" || normalized === "true" || normalized === "1")
      return true;
    if (
      normalized === "inactive" ||
      normalized === "false" ||
      normalized === "0"
    )
      return false;
  }

  return Boolean(raw);
};

const formatName = (student) => {
  const first =
    student?.FirstName ?? student?.firstName ?? student?.UserDetails?.FirstName;
  const last =
    student?.LastName ?? student?.lastName ?? student?.UserDetails?.LastName;
  const full = `${first || ""} ${last || ""}`.trim();
  if (full) return full;
  const username = student?.Username ?? student?.username ?? "";
  if (username) return username;
  const email = student?.Email ?? student?.email ?? "";
  if (email) return email;
  const fallbackId = resolveStudentId(student);
  return fallbackId ? `Student #${fallbackId}` : "Unnamed Student";
};

const StudentPickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelected = [],
  excludedIds = [],
  subjectOptions = [],
  title = "Select Students",
  description = "Choose existing students to enroll in this course.",
  saving = false,
  errorMessage = "",
}) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selectedIds, setSelectedIds] = useState(
    (initialSelected || []).map((id) => String(id))
  );
  const [query, setQuery] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjectError, setSubjectError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const all = await getAllStudents();
        if (!mounted) return;
        setStudents(all || []);
      } catch (error) {
        console.error("Failed to load students for picker", error);
        if (!mounted) return;
        setFetchError(
          error?.message || "Unable to load students. Please try again later."
        );
        setStudents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    setSelectedIds((initialSelected || []).map((id) => String(id)));
    setSelectedSubjectIds([]);
    setSubjectError("");
  }, [initialSelected, isOpen]);

  const excludedSet = useMemo(() => {
    return new Set((excludedIds || []).map((id) => String(id)));
  }, [excludedIds]);

  const normalizedSubjectOptions = useMemo(() => {
    const seen = new Set();

    return (subjectOptions || [])
      .map((option) => {
        if (!option) {
          return null;
        }

        const rawId =
          option.id ??
          option.value ??
          option.SubjectID ??
          option.subjectID ??
          option.subjectId ??
          option.SubjectId ??
          null;

        if (rawId === null || rawId === undefined) {
          return null;
        }

        const id = String(rawId).trim();
        if (!id || seen.has(id)) {
          return null;
        }

        seen.add(id);

        const label = String(
          option.label ??
            option.name ??
            option.subjectName ??
            option.SubjectName ??
            option.title ??
            option.Title ??
            `Subject ${id}`
        ).trim();

        const code = String(
          option.code ??
            option.subjectCode ??
            option.SubjectCode ??
            option.CourseSubjectCode ??
            option.courseSubjectCode ??
            ""
        ).trim();

        return {
          id,
          label: label || `Subject ${id}`,
          code,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [subjectOptions]);

  useEffect(() => {
    if (!normalizedSubjectOptions.length) {
      setSelectedSubjectIds([]);
      setSubjectError("");
      return;
    }

    setSelectedSubjectIds((prev) =>
      prev.filter((sid) =>
        normalizedSubjectOptions.some((option) => option.id === sid)
      )
    );
  }, [normalizedSubjectOptions]);

  const filteredStudents = useMemo(() => {
    const q = String(query || "")
      .toLowerCase()
      .trim();

    return (students || [])
      .map((student) => {
        const sid = resolveStudentId(student);
        if (!sid || excludedSet.has(sid)) {
          return null;
        }
        // Exclude globally inactive users so removed students are not shown
        // (they will reappear when re-activated)
        if (!resolveStudentActive(student)) {
          return null;
        }
        const name = formatName(student).toLowerCase();
        const email = String(
          student?.Email ?? student?.email ?? ""
        ).toLowerCase();
        const roll = String(
          student?.RollNumber ?? student?.rollNumber ?? ""
        ).toLowerCase();

        if (!q || name.includes(q) || email.includes(q) || roll.includes(q)) {
          return { student, sid };
        }

        return null;
      })
      .filter(Boolean);
  }, [students, excludedSet, query]);

  const toggleSelection = (sid) => {
    setSelectedIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const handleConfirm = () => {
    if (saving) return;
    if (
      normalizedSubjectOptions.length &&
      (!selectedSubjectIds || selectedSubjectIds.length === 0)
    ) {
      setSubjectError("Select at least one class to enroll the students in.");
      return;
    }
    setSubjectError("");
    if (typeof onConfirm === "function") {
      onConfirm([...selectedIds], [...selectedSubjectIds]);
    }
  };

  const selectedCount = selectedIds.length;
  const selectedSubjectCount = selectedSubjectIds.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="relative">
              <input
                type="search"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                placeholder="Search by name, email"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            {description && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
            {errorMessage && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            )}
            {fetchError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {fetchError}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {selectedCount}
            </span>{" "}
            selected
            {normalizedSubjectOptions.length ? (
              <>
                <span className="mx-2 text-gray-300 dark:text-gray-700">|</span>
                <span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedSubjectCount}
                  </span>{" "}
                  {`class${selectedSubjectCount === 1 ? "" : "es"}`}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {normalizedSubjectOptions.length ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Classes to enroll selected students in
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {normalizedSubjectOptions.map((option) => {
                const checked = selectedSubjectIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm text-gray-700 transition hover:border-indigo-200 hover:bg-white dark:text-gray-200 dark:hover:border-indigo-500/50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={checked}
                      onChange={(event) => {
                        const { checked: isChecked } = event.target;
                        setSelectedSubjectIds((prev) => {
                          if (isChecked) {
                            return prev.includes(option.id)
                              ? prev
                              : [...prev, option.id];
                          }
                          return prev.filter((sid) => sid !== option.id);
                        });
                      }}
                    />
                    <span className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {option.label}
                      </span>
                      {option.code ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {option.code}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
            {subjectError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {subjectError}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            This course does not have any linked classes. Students will be
            enrolled at the course level.
          </div>
        )}

        <div className="max-h-80 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
              <Loader size="sm" />
              <span>Loading students…</span>
            </div>
          ) : filteredStudents.length ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.map(({ student, sid }) => {
                const name = formatName(student);
                const email = student?.Email ?? student?.email ?? "";
                const roll = student?.RollNumber ?? student?.rollNumber ?? "";
                const selected = selectedIds.includes(sid);
                return (
                  <li key={sid} className="bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} size="sm" user={student} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {name}
                          </p>
                          {email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {email}
                            </p>
                          )}
                          {roll && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Roll No: {roll}
                            </p>
                          )}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selected}
                          onChange={() => toggleSelection(sid)}
                        />
                        Select
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No students available to select.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={saving || !selectedIds.length}
          >
            {saving ? "Adding..." : "Add Students"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentPickerModal;
