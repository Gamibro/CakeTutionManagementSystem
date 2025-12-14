import React, { useState, cloneElement } from "react";
import Button from "./Button";
import Modal from "./Modal";
import UserForm from "../users/UserForm";

const UserFormDialog = ({
  onSave,
  initialData = null,
  triggerButton,
  forceUserType,
  title = "Add New User",
  // When true, use a two-step create flow: step 1 = core fields, step 2 = role-specific
  multiStep = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // multi-step state
  const isCreate = !initialData || !initialData.id;
  const [step, setStep] = useState(isCreate ? 1 : 2);
  const [pendingData, setPendingData] = useState(initialData || null);

  const handleOpen = () => {
    setFormError("");
    setIsOpen(true);
    setStep(isCreate ? 1 : 2);
    setPendingData(initialData || null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsSubmitting(false);
    setFormError("");
    setStep(1);
    setPendingData(null);
  };

  const handleSubmit = async (formData) => {
    // If multi-step create and we're on step 1, store and advance
    if (multiStep && isCreate && step === 1) {
      setPendingData(formData);
      setStep(2);
      return;
    }

    if (typeof onSave !== "function") return;

    setIsSubmitting(true);
    setFormError("");
    try {
      const payload = {
        ...(pendingData || {}),
        ...(formData || {}),
      };
      await onSave(payload);
      handleClose();
    } catch (error) {
      console.error("Error saving user:", error);
      setFormError(error?.message || "Failed to save user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // If in step 2 of multi-step create, go back to step 1 instead of closing
    if (multiStep && isCreate && step === 2) {
      setStep(1);
      return;
    }
    handleClose();
  };

  const renderTrigger = () => {
    if (triggerButton) {
      try {
        return cloneElement(triggerButton, { onClick: handleOpen });
      } catch (e) {
        return <div onClick={handleOpen}>{triggerButton}</div>;
      }
    }

    return (
      <Button onClick={handleOpen} variant="primary">
        {title}
      </Button>
    );
  };

  const modalTitle =
    initialData && initialData.id
      ? "Edit User"
      : multiStep && isCreate
      ? step === 1
        ? "Create User — Step 1"
        : "Create User — Step 2"
      : title;

  return (
    <>
      {renderTrigger()}
      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        title={modalTitle}
        size="lg"
      >
        {formError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {formError}
          </div>
        )}
        <UserForm
          onSubmit={handleSubmit}
          initialData={
            multiStep && isCreate && step === 2
              ? pendingData || {}
              : initialData
          }
          loading={isSubmitting}
          onCancel={handleCancel}
          forceUserType={forceUserType}
          showCoreFields={multiStep && isCreate ? step === 1 : true}
          showRoleFields={multiStep && isCreate ? step === 2 : true}
          submitLabel={
            initialData && initialData.id
              ? step === 1
                ? "Next"
                : "Update"
              : multiStep && isCreate
              ? step === 1
                ? "Next"
                : "Create"
              : undefined
          }
        />
      </Modal>
    </>
  );
};

export default UserFormDialog;
