import { useEffect, useMemo, useState } from "react";

// import Modal from "../common/Modal";
// =======
import Modal from "../common/Modal2";

import Button from "../common/Button";

const ClassPickerModal = ({
  isOpen,
  onClose,
  options = [],
  onProceed,
  initialSelected = [],
  title = "Select Class",
  description = "Choose the class for the student.",
  saving = false,
  loading = false,
  errorMessage = "",
  multiSelect = false,
  requireSelection = true,
  proceedLabel = "Enroll",
  cancelLabel = "Back",
}) => {
  const normalizedInitial = useMemo(
    () => (initialSelected || []).map((value) => String(value)),
    [initialSelected]
  );
  const [selectedIds, setSelectedIds] = useState(normalizedInitial);
  const [selectionError, setSelectionError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSelectedIds(normalizedInitial);
    setSelectionError("");
  }, [isOpen, normalizedInitial]);

  const handleToggle = (id) => {
    const stringId = String(id);
    if (multiSelect) {
      setSelectedIds((prev) =>
        prev.includes(stringId)
          ? prev.filter((value) => value !== stringId)
          : [...prev, stringId]
      );
    } else {
      setSelectedIds((prev) =>
        prev.length === 1 && prev[0] === stringId ? [] : [stringId]
      );
    }
  };

  const handleProceed = () => {
    if (saving) {
      return;
    }

    if (requireSelection && options.length && !selectedIds.length) {
      setSelectionError("Select a class before continuing.");
      return;
    }

    setSelectionError("");

    if (typeof onProceed === "function") {
      onProceed(selectedIds);
    }
  };

  const renderOptionMeta = (option) => {
    const lines = [];
    if (option.code) {
      lines.push(option.code);
    }
    if (option.meta) {
      lines.push(option.meta);
    }
    if (!lines.length && option.scheduleIds && option.scheduleIds.length) {
      lines.push(`Includes ${option.scheduleIds.length} schedule(s)`);
    }
    return lines;
  };

  const selectionCount = selectedIds.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <div>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {description}
            </p>
          )}
          {errorMessage ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          ) : null}
          {selectionError ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {selectionError}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <span>Available Classes</span>
          <span className="text-gray-400">{selectionCount} selected</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading classes...
          </div>
        ) : options.length ? (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {options.map((option) => {
              const id = String(option.id ?? option.subjectId ?? "");
              if (!id) {
                return null;
              }
              const isSelected = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/80 dark:border-indigo-400 dark:bg-indigo-900/30"
                      : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-indigo-500/40 dark:hover:bg-gray-800/70"
                  }`}
                >
                  <input
                    type={multiSelect ? "checkbox" : "radio"}
                    className="mt-1 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={isSelected}
                    onChange={() => handleToggle(id)}
                  />
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {option.label || `Class ${id}`}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No classes are currently linked to this course. You can continue
            without selecting a class.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={handleProceed}
            disabled={
              saving ||
              (requireSelection && !selectedIds.length && options.length)
            }
          >
            {saving ? "Saving..." : proceedLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ClassPickerModal;
