import { useNavigate } from "react-router-dom";
import Modal from "../common/Modal";
import SubjectView from "./SubjectView";

const SubjectModal = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    try {
      navigate(-1);
    } catch (error) {
      navigate("/");
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title={null}
      size="2xl"
      contentClassName="p-0 bg-transparent dark:bg-transparent"
      ariaLabel="Subject details"
    >
      <SubjectView variant="modal" onClose={handleClose} />
    </Modal>
  );
};

export default SubjectModal;
