import { useNavigate, useLocation } from "react-router-dom";
import { useRef } from "react";
import Modal from "../components/common/Modal";
import Profile from "./Profile";

const ProfileModal = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // // If the modal was opened with a background location (via state.backgroundLocation)
  // // navigate back to that exact pathname when closing. This avoids history -1 which
  // // in some cases causes the profile modal to re-open immediately.
  const closingRef = useRef(false);
  const backgroundRef = useRef(
    location.state && location.state.backgroundLocation
  );

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    const background = backgroundRef.current;
    if (background) {
      navigate(
        {
          pathname: background.pathname,
          search: background.search,
          hash: background.hash,
        },
        {
          replace: true,
          state: background.state,
        }
      );
      return;
    }

    const canGoBack =
      typeof window !== "undefined" &&
      window.history &&
      typeof window.history.state === "object" &&
      window.history.state &&
      typeof window.history.state.idx === "number" &&
      window.history.state.idx > 0;

    if (canGoBack) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <Modal isOpen={true} onClose={handleClose}>
      <Profile />
    </Modal>
  );
};

export default ProfileModal;
