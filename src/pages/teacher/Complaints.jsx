import { useEffect, useState } from "react";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { useAuth } from "../../contexts/AuthContext";
import {
  getComplaintsForTeacher,
  replyToComplaint,
  deleteComplaint,
} from "../../services/complaintService";

const TeacherComplaints = () => {
  const { user } = useAuth();
  const teacherId =
    user?.userID || user?.id || user?.TeacherID || user?.employeeID;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [replyText, setReplyText] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const list = await getComplaintsForTeacher(teacherId);
      setItems(list);
    } catch (e) {
      setError(e?.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  const onReply = (item) => {
    setActiveComplaint(item);
    setReplyText(item.reply || "");
    setReplyOpen(true);
  };

  const submitReply = async (e) => {
    e?.preventDefault?.();
    if (!activeComplaint?.id || !replyText.trim()) return;
    await replyToComplaint(activeComplaint.id, replyText.trim());
    setReplyOpen(false);
    setActiveComplaint(null);
    setReplyText("");
    await load();
  };

  const onDelete = async (id) => {
    if (!id) return;
    // simple confirm
    if (!window.confirm("Delete this complaint?")) return;
    await deleteComplaint(id);
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Student Complaints
        </h1>
        <Button onClick={load} className="bg-indigo-600 text-white">
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No complaints yet"
          description="New complaints will appear here."
        />
      ) : (
        <Table
          headers={["Date", "Student", "Message", "Status", "Reply", "Actions"]}
        >
          {items.map((c) => (
            <tr key={c.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {c.date}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {c.studentName || c.studentId}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200 max-w-xs break-words">
                {c.message}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    c.status === "replied"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200"
                  }`}
                >
                  {c.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200 max-w-xs break-words">
                {c.reply || "—"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                <Button
                  onClick={() => onReply(c)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {c.reply ? "Update Reply" : "Reply"}
                </Button>
                <Button
                  onClick={() => onDelete(c.id)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        isOpen={replyOpen}
        onClose={() => setReplyOpen(false)}
        title={activeComplaint ? "Reply to Complaint" : "Reply"}
      >
        <form onSubmit={submitReply} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <div className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 min-h-[60px]">
              {activeComplaint?.message}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Your Reply</label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 min-h-[96px] text-gray-900 dark:text-white"
              placeholder="Type your response"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setReplyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white">
              Save Reply
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeacherComplaints;
