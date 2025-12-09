import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "./Button";

// import Modal from "./Modal";

import Modal from "./Modal2";

import Loader from "./Loader";
import UserForm from "../users/UserForm";
import { getAllUsers, createUser } from "../../services/userService";
import { createTeacher } from "../../services/teacherService";

const resolveTeacherId = (candidate) => {
  if (!candidate || typeof candidate !== "object") {
    return "";
  }

  const possible = [
    candidate.teacherId,
    candidate.TeacherID,
    candidate.teacherID,
    candidate.id,
    candidate.Id,
    candidate.userId,
    candidate.UserId,
    candidate.userID,
    candidate.UserID,
  ];

  const found = possible.find((value) => {
    if (value === undefined || value === null) return false;
    const str = String(value).trim();
    return str.length > 0;
  });

  return found !== undefined && found !== null ? String(found).trim() : "";
};

const formatTeacherOption = (user) => {
  if (!user) return null;

  const id = resolveTeacherId(user);
  if (!id) return null;

  const firstName =
    user.firstName ?? user.FirstName ?? user.raw?.FirstName ?? "";
  const lastName = user.lastName ?? user.LastName ?? user.raw?.LastName ?? "";
  const username = user.username ?? user.Username ?? "";

  const labelParts = [
    `${firstName} ${lastName}`.trim(),
    username ? `(${username})` : "",
  ].filter(Boolean);

  return {
    id,
    label: labelParts.length ? labelParts.join(" ") : `Teacher #${id}`,
  };
};

const TeacherPicker = ({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = "Select a teacher",
  allowClear = true,
  showRefresh = true,
}) => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [pendingCoreData, setPendingCoreData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const normalizedValue = useMemo(() => {
    if (value === undefined || value === null) return "";
    const str = String(value).trim();
    return str;
  }, [value]);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const users = await getAllUsers();
      const teacherUsers = (users || []).filter((user) => {
        const typeName = String(user?.userType || "").toLowerCase();
        if (typeName === "teacher") return true;

        const typeId = String(
          user?.UserTypeID ?? user?.userTypeID ?? user?.userTypeId ?? ""
        ).trim();
        return typeId === "2"; // 2 == teacher role
      });

      const options = teacherUsers
        .map((user) => {
          const option = formatTeacherOption(user);
          if (!option) return null;
          return {
            ...option,
            raw: user,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.label.localeCompare(b.label));

      setTeachers(options);
    } catch (err) {
      console.error("Failed to load teachers", err);
      setError(
        err?.message || "Unable to load teachers. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleSelectChange = (event) => {
    const nextValue = event.target.value;
    if (!nextValue && allowClear) {
      onChange?.("");
      return;
    }
    onChange?.(nextValue);
  };

  const openModal = () => {
    setIsModalOpen(true);
    setCreateStep(1);
    setPendingCoreData(null);
    setFormError("");
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setCreateStep(1);
    setPendingCoreData(null);
    setFormError("");
  };

  const handleFormCancel = () => {
    if (isSubmitting) return;
    if (createStep === 2) {
      setCreateStep(1);
      return;
    }
    closeModal();
  };

  const handleTeacherCreated = (option) => {
    setTeachers((prev) => {
      const exists = prev.some((item) => item.id === option.id);
      if (exists) return prev;
      return [...prev, option].sort((a, b) => a.label.localeCompare(b.label));
    });
    onChange?.(option.id);
  };

  const handleTeacherSubmit = async (formData) => {
    if (createStep === 1) {
      setPendingCoreData(formData);
      setCreateStep(2);
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      const merged = {
        ...(pendingCoreData || {}),
        ...formData,
        UserTypeID: 2,
        IsActive: true,
      };

      if (!merged.Username) {
        throw new Error("Username is required to create a teacher");
      }

      // Ensure new teacher follows the same auto-increment user id logic as Admin > Users flow
      try {
        const existing = await getAllUsers();
        const nums = (existing || []).map((u) => {
          const id = u?.UserID ?? u?.id ?? u?.userID ?? u?.userId ?? 0;
          const n = Number(id);
          return Number.isNaN(n) ? 0 : n;
        });
        const max = nums.length ? Math.max(...nums) : 0;
        const nextId = max + 1;
        // Do not override if provided already
        merged.UserID = merged.UserID ?? nextId;
        merged.userID = merged.userID ?? nextId;
        merged.id = merged.id ?? nextId;
      } catch (genErr) {
        // proceed without injected id if anything fails
        console.warn("Failed to auto-generate next user id:", genErr);
      }

      const createdUser = await createUser(merged);

      // Use the actual id returned by the server for the created user as the authoritative link
      const createdUserId = resolveTeacherId(createdUser);
      const teacherPayload = {
        TeacherID:
          createdUserId ||
          merged.TeacherID ||
          merged.teacherID ||
          merged.teacherId,
        EmployeeID: merged.EmployeeID ?? undefined,
        Department: merged.Department ?? undefined,
        Qualification: merged.Qualification ?? undefined,
        JoiningDate:
          merged.JoiningDate ??
          merged.joiningDate ??
          merged.JoinDate ??
          undefined,
        Bio: merged.Bio ?? undefined,
      };

      // Require joining date when creating a teacher
      const joiningValue =
        merged.JoiningDate ?? merged.joiningDate ?? merged.JoinDate ?? null;
      if (!joiningValue) {
        setFormError("Joining date is required to create a teacher");
        setIsSubmitting(false);
        return;
      }

      const createdTeacher = await createTeacher(
        Object.fromEntries(
          Object.entries(teacherPayload).filter(([, v]) => v !== undefined)
        )
      );

      const teacherId = resolveTeacherId({
        ...createdUser,
        ...createdTeacher,
        TeacherID: createdTeacher?.TeacherID ?? teacherPayload.TeacherID,
      });

      // Purposefully skip course assignment in this flow to avoid triggering updateCourse during teacher creation.

      // Refresh list to include the new teacher.
      await fetchTeachers();

      if (teacherId) {
        const labelOption = formatTeacherOption({
          ...createdUser,
          TeacherID: teacherId,
        }) || {
          id: teacherId,
          label: `Teacher #${teacherId}`,
        };
        handleTeacherCreated(labelOption);
      }

      // Persist newly created teacher selection so downstream flows (like
      // Assign Courses) can pick up the created teacher automatically.
      try {
        const persisted = {
          id: String(teacherId || createdUser?.UserID || createdUser?.id || ""),
          name:
            (createdUser?.FirstName || createdUser?.firstName || "") +
            (createdUser?.LastName || createdUser?.lastName
              ? ` ${createdUser?.LastName || createdUser?.lastName}`
              : ""),
        };
        if (persisted.id) {
          window.localStorage.setItem(
            "selected_teacher_for_course",
            JSON.stringify(persisted)
          );
        }
      } catch (e) {
        // ignore localStorage failures
      }

      setIsSubmitting(false);
      closeModal();
    } catch (err) {
      console.error("Failed to create teacher", err);
      setFormError(err?.message || "Failed to create teacher. Please retry.");
      setIsSubmitting(false);
    }
  };

  const optionList = useMemo(() => {
    if (!teachers || !teachers.length) return teachers;
    return [...teachers].sort((a, b) => a.label.localeCompare(b.label));
  }, [teachers]);

  const hasValueOption =
    normalizedValue && optionList.some((opt) => opt.id === normalizedValue);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <select
            value={normalizedValue}
            onChange={handleSelectChange}
            onBlur={onBlur}
            disabled={disabled || loading || !!error}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">{placeholder}</option>
            {optionList.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
            {normalizedValue && !hasValueOption ? (
              <option
                value={normalizedValue}
              >{`Teacher #${normalizedValue}`}</option>
            ) : null}
          </select>
        </div>
        <div className="flex flex-col  gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="secondary"
            onClick={openModal}
            disabled={disabled || loading}
            className="w-full h-10 justify-center   sm:w-auto"
          >
            +New
          </Button>
          {showRefresh && (
            <button
              type="button"
              onClick={fetchTeachers}
              disabled={loading}
              className="w-full rounded-md border border-transparent bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 shadow-sm transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:bg-indigo-900/30 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader size="sm" />
          <span>Loading teachers...</span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          <div className="flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchTeachers}
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={createStep === 1 ? "Add Teacher" : "Teacher Details"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Step {createStep} of 2</span>
            {createStep === 2 && (
              <button
                type="button"
                onClick={() => setCreateStep(1)}
                className="text-indigo-600 hover:underline"
              >
                Back to account
              </button>
            )}
          </div>

          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {formError}
            </div>
          )}

          <UserForm
            onSubmit={handleTeacherSubmit}
            loading={isSubmitting}
            userTypes={[{ id: 2, name: "Teacher" }]}
            forceUserType={2}
            onCancel={handleFormCancel}
            showCoreFields={createStep === 1}
            showRoleFields={createStep === 2}
            submitLabel={
              createStep === 1
                ? "Next"
                : isSubmitting
                ? "Creating..."
                : "Create Teacher"
            }
          />
        </div>
      </Modal>
    </div>
  );
};

export default TeacherPicker;
