import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Loader from "../../components/common/Loader";

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch (e) {
    return iso;
  }
};

const StatusBadge = ({ status }) => {
  const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold";
  if (status === "PAID") return <span className={`${base} bg-green-600 text-white`}>PAID</span>;
  if (status === "PARTIAL") return <span className={`${base} bg-yellow-500 text-white`}>PARTIAL</span>;
  return <span className={`${base} bg-red-600 text-white`}>{status}</span>;
};

const PaymentCard = ({ p, expanded, onToggle }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{p.studentName}</h3>
            <StatusBadge status={p.status} />
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            <div>Enrollment ID: <span className="font-semibold">{p.enrollmentID}</span></div>
            <div>Teacher: <span className="font-semibold">{p.teacherName}</span></div>
            <div>Parent: <span className="font-semibold">{p.parentName} ({p.parentContact})</span></div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
          <div className="text-xl font-semibold text-gray-800 dark:text-gray-100">LKR { p.totalAmount?.toFixed(2)}</div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Paid / Balance</div>
          <div className="text-sm mt-1">
            <span className="font-semibold">LKR {p.paidAmount?.toFixed(2)}</span>
            <span className="text-gray-400 mx-2">/</span>
            <span className="font-semibold text-red-400">LKR {p.balanceAmount?.toFixed(2)}</span>
          </div>
          <div className="mt-3">
            <button
              onClick={() => onToggle(p.paymentID)}
              className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
            >
              {expanded ? "Hide History" : "View History"}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">Payment History</div>
          <div className="space-y-3">
            {p.history && p.history.length ? (
              p.history
                .slice()
                .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
                .map((h) => (
                  <div key={h.paymentHistoryID} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-700 dark:text-gray-200">{formatDate(h.paymentDate)}</div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">LKR {h.amountPaid?.toFixed(2)}</div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <div>Method: {h.paymentMethod}</div>
                      <div>Txn: {h.referenceNo}</div>
                      <div>Remarks: {h.remarks}</div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-sm text-gray-500">No payment history available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentView = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      try {
        const studentId = (user && (user.id || user.userID || user.studentID)) || 10;
        const url = `http://localhost:50447/api/Payments/student/${studentId}`;
        const token = window.localStorage.getItem("token");
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e.message || "Failed to fetch");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user]);

  const toggle = (id) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Payments</h2>
          <p className="text-sm text-gray-500">View your course payments and history</p>
        </div>

        {loading && <Loader />}
        {error && <div className="text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="space-y-4">
            {data && data.length ? (
              data.map((p) => (
                <PaymentCard
                  key={p.paymentID}
                  p={p}
                  expanded={expandedId === p.paymentID}
                  onToggle={toggle}
                />
              ))
            ) : (
              <div className="text-center py-10 text-gray-500">No payments found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentView;
