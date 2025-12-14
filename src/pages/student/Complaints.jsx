import ComplaintForm from "../../components/complaints/ComplaintForm";
import { useAuth } from "../../contexts/AuthContext";
import { createComplaint } from "../../services/complaintService";

const StudentComplaints = () => {
  const { user } = useAuth();

  const handleAdd = async (payload) => {
    const studentId =
      user?.userID || user?.id || user?.StudentID || user?.studentId;
    const studentName =
      user?.name ||
      user?.fullName ||
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    // Optional: If student selects a course/teacher later, pass teacherId too
    await createComplaint({ ...payload, studentId, studentName });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Complaints
      </h1>
      <ComplaintForm onAdd={handleAdd} />
    </div>
  );
};

export default StudentComplaints;
