

// // export default PaymentHistory;
// import { useEffect, useState } from "react";
// import axios from "axios";

// // Small date formatter to avoid extra dependency on date-fns
// const formatDate = (d) => {
//   try {
//     const dt = d ? new Date(d) : new Date();
//     return dt.toLocaleDateString("en-US", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });
//   } catch (e) {
//     return String(d || "");
//   }
// };

// const Badge = ({ status }) => {
//   const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
//   if (!status) return null;
//   switch (String(status).toUpperCase()) {
//     case "PAID":
//       return <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200`}>PAID</span>;
//     case "PARTIAL":
//       return <span className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200`}>PARTIAL</span>;
//     case "PENDING":
//       return <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200`}>PENDING</span>;
//     default:
//       return <span className={`${base} bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200`}>{status}</span>;
//   }
// };

// const PaymentHistory = () => {
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [openMap, setOpenMap] = useState({});

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const apiUrl = "http://localhost:50447/api/Payments/All";
//         const headers = {};
//         try {
//           const rawToken = window.localStorage.getItem("token") || window.sessionStorage.getItem("token");
//           if (rawToken) {
//             const token = String(rawToken).replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
//             headers["Authorization"] = `Bearer ${token}`;
//           }
//         } catch (e) {}

//         const resp = await axios.get(apiUrl, { headers });
//         if (Array.isArray(resp.data)) setItems(resp.data);
//         else setItems(resp.data?.items ?? []);
//       } catch (err) {
//         console.error("Failed to load payments history", err);
//         setError(err?.response?.data || err?.message || "Failed to load");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   const toggle = (id) => setOpenMap((m) => ({ ...m, [id]: !m[id] }));

//   const formatCurrency = (amount) => {
//     return Number(amount).toLocaleString("en-US", {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     });
//   };

//   return (
//     <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment History</h1>
//           <p className="text-gray-600 dark:text-gray-400">Track and manage all payment records</p>
//         </div>
//         <div className="text-sm text-gray-500 dark:text-gray-400">
//           Total Records: {items.length}
//         </div>
//       </div>

//       {/* Table Container */}
//       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
//         {loading ? (
//           <div className="p-8 text-center">
//             <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
//             <p className="mt-2 text-gray-600 dark:text-gray-400">Loading payment records...</p>
//           </div>
//         ) : error ? (
//           <div className="p-6 text-center">
//             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
//               <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//             <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load data</h3>
//             <p className="text-gray-600 dark:text-gray-400">{String(error)}</p>
//           </div>
//         ) : items.length === 0 ? (
//           <div className="p-8 text-center">
//             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
//               <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//               </svg>
//             </div>
//             <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payments found</h3>
//             <p className="text-gray-600 dark:text-gray-400">No payment records available at the moment</p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
//                 <tr>
//                   <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
//                   <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enrollment ID</th>
//                   <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
//                   <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</th>
//                   <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paid Amount</th>
//                   <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
//                   <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
//                 {items.map((p, index) => (
//                   <>
//                     <tr key={p.paymentID} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
//                       <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{index + 1}</td>
//                       <td className="py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">{p.enrollmentID}</td>
//                       <td className="py-4 px-6 text-sm">
//                         <Badge status={p.status} />
//                       </td>
//                       <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
//                         {formatCurrency(p.totalAmount)} LKR
//                       </td>
//                       <td className="py-4 px-6 text-sm font-medium text-green-600 dark:text-green-400">
//                         {formatCurrency(p.paidAmount)} LKR
//                       </td>
//                       <td className="py-4 px-6 text-sm font-medium text-red-600 dark:text-red-400">
//                         {formatCurrency(p.balanceAmount)} LKR
//                       </td>
//                       <td className="py-4 px-6 text-sm">
//                         <button
//                           type="button"
//                           onClick={() => toggle(p.paymentID)}
//                           className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
//                         >
//                           <svg className={`w-4 h-4 mr-1.5 transition-transform ${openMap[p.paymentID] ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
//                           </svg>
//                           {openMap[p.paymentID] ? "Hide History" : "Show History"}
//                         </button>
//                       </td>
//                     </tr>
//                     {openMap[p.paymentID] && (
//                       <tr>
//                         <td colSpan="7" className="p-0">
//                           <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
//                             <div className="flex items-center justify-between mb-3">
//                               <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Payment History</h4>
//                               <span className="text-xs text-gray-500 dark:text-gray-400">
//                                 {(Array.isArray(p.history) ? p.history : []).length} transaction(s)
//                               </span>
//                             </div>
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
//                               {(Array.isArray(p.history) ? p.history : []).map((h) => (
//                                 <div key={h.paymentHistoryID} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
//                                   <div className="flex items-center justify-between mb-2">
//                                     <div className="text-lg font-semibold text-gray-900 dark:text-white">
//                                       {formatCurrency(h.amountPaid)} LKR
//                                     </div>
//                                     <div className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded">
//                                       {h.paymentMethod}
//                                     </div>
//                                   </div>
//                                   <div className="space-y-2 text-sm">
//                                     <div className="flex items-center text-gray-600 dark:text-gray-400">
//                                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                                       </svg>
//                                       Reference: {h.referenceNo || "N/A"}
//                                     </div>
//                                     <div className="flex items-center text-gray-600 dark:text-gray-400">
//                                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                                       </svg>
//                                       {h.paymentDate ? formatDate(h.paymentDate) : formatDate(h.createdDate)}
//                                     </div>
//                                     {h.remarks && (
//                                       <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
//                                         <div className="text-xs text-gray-500 dark:text-gray-400">Remarks:</div>
//                                         <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{h.remarks}</div>
//                                       </div>
//                                     )}
//                                   </div>
//                                 </div>
//                               ))}
//                             </div>
//                             {(Array.isArray(p.history) ? p.history : []).length === 0 && (
//                               <div className="text-center py-6 text-gray-500 dark:text-gray-400">
//                                 No transaction history available
//                               </div>
//                             )}
//                           </div>
//                         </td>
//                       </tr>
//                     )}
//                   </>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* Summary Footer */}
//       {items.length > 0 && !loading && !error && (
//         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
//           <div className="grid grid-cols-3 gap-4">
//             <div className="text-center">
//               <div className="text-sm text-gray-500 dark:text-gray-400">Total Balance</div>
//               <div className="text-xl font-bold text-red-600 dark:text-red-400">
//                 {formatCurrency(items.reduce((sum, p) => sum + (Number(p.balanceAmount) || 0), 0))} LKR
//               </div>
//             </div>
//             <div className="text-center">
//               <div className="text-sm text-gray-500 dark:text-gray-400">Total Paid</div>
//               <div className="text-xl font-bold text-green-600 dark:text-green-400">
//                 {formatCurrency(items.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0))} LKR
//               </div>
//             </div>
//             <div className="text-center">
//               <div className="text-sm text-gray-500 dark:text-gray-400">Overall Total</div>
//               <div className="text-xl font-bold text-gray-900 dark:text-white">
//                 {formatCurrency(items.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0))} LKR
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PaymentHistory;
import { useEffect, useState } from "react";
import axios from "axios";

// Small date formatter to avoid extra dependency on date-fns
const formatDate = (d) => {
  try {
    const dt = d ? new Date(d) : new Date();
    return dt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return String(d || "");
  }
};

const Badge = ({ status }) => {
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  if (!status) return null;
  switch (String(status).toUpperCase()) {
    case "PAID":
      return <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200`}>PAID</span>;
    case "PARTIAL":
      return <span className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200`}>PARTIAL</span>;
    case "PENDING":
      return <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200`}>PENDING</span>;
    default:
      return <span className={`${base} bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200`}>{status}</span>;
  }
};

// Modal Component for Add Installment
const AddInstallmentModal = ({ isOpen, onClose, payment, onSuccess }) => {
  const [formData, setFormData] = useState({
    PaymentID: "",
    AmountPaid: "",
    PaymentMethod: "",
    ReferenceNo: "",
    Remarks: "",
    CreatedBy: "", // This should come from user context/session
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (payment && isOpen) {
      // Get user ID from localStorage or sessionStorage (adjust based on your auth system)
      const userId = window.localStorage.getItem("userId") || window.sessionStorage.getItem("userId") || "101";
      
      setFormData({
        PaymentID: payment.paymentID || "",
        AmountPaid: "",
        PaymentMethod: "Cash",
        ReferenceNo: "",
        Remarks: "",
        CreatedBy: userId,
      });
      setError(null);
    }
  }, [payment, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = window.localStorage.getItem("token") || window.sessionStorage.getItem("token");
      const headers = {
        "Authorization": `Bearer ${token?.replace(/^\"|\"$/g, "")}`,
        "Content-Type": "application/json"
      };

      const payload = {
        ...formData,
        AmountPaid: parseFloat(formData.AmountPaid),
        PaymentID: parseInt(formData.PaymentID),
        CreatedBy: parseInt(formData.CreatedBy)
      };

      const response = await axios.post(
        "http://localhost:50447/api/Payments/AddInstallment",
        payload,
        { headers }
      );

      if (response.status === 200 || response.status === 201) {
        onSuccess();
        onClose();
      } else {
        throw new Error("Failed to add installment");
      }
    } catch (err) {
      console.error("Error adding installment:", err);
      setError(err.response?.data?.message || err.message || "Failed to add installment");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add Installment
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment ID
                </label>
                <input
                  type="text"
                  value={formData.PaymentID}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Paid (LKR)
                </label>
                <input
                  type="number"
                  name="AmountPaid"
                  value={formData.AmountPaid}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  name="PaymentMethod"
                  value={formData.PaymentMethod}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online Payment">Online Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  name="ReferenceNo"
                  value={formData.ReferenceNo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Optional reference number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Remarks
                </label>
                <textarea
                  name="Remarks"
                  value={formData.Remarks}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Additional notes or remarks"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : "Add Installment"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const PaymentHistory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openMap, setOpenMap] = useState({});
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = "http://localhost:50447/api/Payments/All";
      const headers = {};
      try {
        const rawToken = window.localStorage.getItem("token") || window.sessionStorage.getItem("token");
        if (rawToken) {
          const token = String(rawToken).replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
          headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (e) {}

      const resp = await axios.get(apiUrl, { headers });
      if (Array.isArray(resp.data)) setItems(resp.data);
      else setItems(resp.data?.items ?? []);
    } catch (err) {
      console.error("Failed to load payments history", err);
      setError(err?.response?.data || err?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => setOpenMap((m) => ({ ...m, [id]: !m[id] }));

  const handleEditClick = (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedPayment(null);
  };

  const handleInstallmentSuccess = () => {
    // Refresh the payments data after successful installment addition
    fetchPayments();
  };

  const formatCurrency = (amount) => {
    return Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Add Installment Modal */}
      <AddInstallmentModal
        isOpen={showModal}
        onClose={handleModalClose}
        payment={selectedPayment}
        onSuccess={handleInstallmentSuccess}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment History</h1>
          <p className="text-gray-600 dark:text-gray-400">Track and manage all payment records</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total Records: {items.length}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading payment records...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load data</h3>
            <p className="text-gray-600 dark:text-gray-400">{String(error)}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payments found</h3>
            <p className="text-gray-600 dark:text-gray-400">No payment records available at the moment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enrollment ID</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paid Amount</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((p, index) => (
                  <>
                    <tr key={p.paymentID} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{index + 1}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">{p.enrollmentID}</td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {(() => {
                          const s = p.enrollment?.student;
                          if (!s) return "—";
                          const full = [s.firstName, s.lastName].filter(Boolean).join(" ");
                          return full || s.username || s.userID || "—";
                        })()}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <Badge status={p.status} />
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(p.totalAmount)} LKR
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(p.paidAmount)} LKR
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(p.balanceAmount)} LKR
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => toggle(p.paymentID)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <svg className={`w-4 h-4 mr-1.5 transition-transform ${openMap[p.paymentID] ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                            {openMap[p.paymentID] ? "Hide History" : "Show History"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClick(p)}
                            className="inline-flex items-center px-3 py-1.5 border border-indigo-300 dark:border-indigo-600 text-xs font-medium rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                            title="Add Installment"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add
                          </button>
                        </div>
                      </td>
                    </tr>
                    {openMap[p.paymentID] && (
                      <tr>
                        <td colSpan="8" className="p-0">
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Payment History</h4>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {(Array.isArray(p.history) ? p.history : []).length} transaction(s)
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(Array.isArray(p.history) ? p.history : []).map((h) => (
                                <div key={h.paymentHistoryID} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                      {formatCurrency(h.amountPaid)} LKR
                                    </div>
                                    <div className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded">
                                      {h.paymentMethod}
                                    </div>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      Reference: {h.referenceNo || "N/A"}
                                    </div>
                                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      {h.paymentDate ? formatDate(h.paymentDate) : formatDate(h.createdDate)}
                                    </div>
                                    {h.remarks && (
                                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Remarks:</div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{h.remarks}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {(Array.isArray(p.history) ? p.history : []).length === 0 && (
                              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                No transaction history available
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {items.length > 0 && !loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Balance</div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(items.reduce((sum, p) => sum + (Number(p.balanceAmount) || 0), 0))} LKR
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Paid</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(items.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0))} LKR
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Overall Total</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(items.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0))} LKR
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;