import React from "react";
import { createPortal } from "react-dom";

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-3xl",
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  contentClassName = "bg-blue-50 dark:bg-gray-800 p-4 rounded-md",
  ariaLabel,
}) => {
  if (!isOpen) return null;

  const widthClass = sizeClasses[size] || sizeClasses.md;
  const showTitle = title !== null && title !== undefined && title !== "";
  const computedAriaLabel = showTitle ? undefined : ariaLabel || "Dialog";

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6 fade-in">
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={computedAriaLabel}
        className={`relative bg-white dark:bg-gray-800 rounded-lg p-5 sm:p-6 ${widthClass} w-full shadow-xl ring-1 ring-gray-200 dark:ring-0 scale-in soft-shadow-md max-h-[calc(100dvh-3rem)] overflow-y-auto`}
      >
        <div
          className={`flex items-start gap-3 ${
            showTitle ? "justify-between mb-4" : "justify-end mb-2"
          }`}
        >
          {showTitle ? (
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          ) : null}
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>
        <div className="text-gray-900 dark:text-white">
          {/* content wrapper gives form inputs a subtle off-white background in light mode
              so inputs and borders are visible against the modal surface */}
          <div className={contentClassName}>{children}</div>
        </div>
      </div>
    </div>
  );

  // render modal into document body so nested modals stack correctly
  if (typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }

  // fallback for environments without document
  return modal;
};

export default Modal;
