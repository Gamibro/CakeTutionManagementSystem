// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { useAuth } from "../../contexts/AuthContext";

// const TeacherPaymentHistory = () => {
//   const { user } = useAuth();
//   const [payments, setPayments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [expanded, setExpanded] = useState({});
//   const [search, setSearch] = useState("");

//   const teacherId = user?.UserID || user?.userID || user?.id || 2;

//   useEffect(() => {
//     fetchPayments();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [teacherId]);

//   const fetchPayments = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const url = `http://localhost:50447/api/Payments/teacher/${teacherId}`;
//       const rawToken = window.localStorage.getItem("token") || window.sessionStorage.getItem("token");
//       const headers = {};
//       if (rawToken) {
//         const token = String(rawToken).replace(/^"|"$/g, "").replace(/^'|'$/g, "");
//         headers["Authorization"] = `Bearer ${token}`;
//       }
//       const resp = await axios.get(url, { headers });
//       setPayments(Array.isArray(resp.data) ? resp.data : []);
//     } catch (err) {
//       console.error(err);
//       setError(err?.response?.data || err?.message || "Failed to load payments");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const toggle = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

//   const formatCurrency = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;
//   const formatDate = (d) => (d ? new Date(d).toLocaleString() : "-");

//   const filtered = payments.filter((p) => {
//     const q = (search || "").toString().toLowerCase();
//     if (!q) return true;
//     return (
//       String(p.studentName || "").toLowerCase().includes(q) ||
//       String(p.parentName || "").toLowerCase().includes(q) ||
//       String(p.enrollmentID || "").includes(q)
//     );
//   });

//   return (
//     <div className="p-6 min-h-screen">
//       <div className="max-w-6xl mx-auto">
//         <h1 className="text-2xl font-semibold mb-4">Teacher Payment History</h1>

//         {loading && <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">Loading...</div>}
//         {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 rounded mb-4">{String(error)}</div>}

//         {!loading && !error && (
//           <>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//               <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
//                 <div className="text-sm text-gray-500">Total Students</div>
//                 <div className="text-xl font-semibold mt-2">{payments.length}</div>
//               </div>
//               <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
//                 <div className="text-sm text-gray-500">Total Received</div>
//                 <div className="text-xl font-semibold text-green-600 mt-2">{formatCurrency(payments.reduce((s, x) => s + (Number(x.paidAmount) || 0), 0))}</div>
//               </div>
//               <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
//                 <div className="text-sm text-gray-500">Pending Balance</div>
//                 <div className="text-xl font-semibold text-red-600 mt-2">{formatCurrency(payments.reduce((s, x) => s + (Number(x.balanceAmount) || 0), 0))}</div>
//               </div>
//             </div>

//             <div className="flex items-center justify-between mb-6 gap-3">
//               <div className="relative w-full max-w-xl">
//                 <input
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                   placeholder="Search student, parent or enrollment ID"
//                   className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
//                 />
//                 <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</div>
//               </div>

//               <div className="flex gap-2">
//                 <button onClick={fetchPayments} className="px-4 py-2 rounded bg-indigo-600 text-white">Refresh</button>
//               </div>
//             </div>

//             {filtered.length === 0 ? (
//               <div className="p-6 bg-white dark:bg-gray-800 rounded shadow text-center">No payment records found.</div>
//             ) : (
//               filtered.map((p) => (
//                 <div key={p.paymentID} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl mb-4 overflow-hidden">
//                   <div className="p-6">
//                     <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-center">
//                       <div className="md:col-span-3">
//                         <div className="text-sm text-gray-500">Student</div>
//                         <div className="font-medium">{p.studentName}</div>
//                         <div className="text-xs text-gray-400">Enroll: {p.enrollmentID}</div>
//                       </div>

//                       <div className="md:col-span-3">
//                         <div className="text-sm text-gray-500">Parent</div>
//                         <div className="font-medium">{p.parentName}</div>
//                         <div className="text-xs text-gray-400">{p.parentContact}</div>
//                       </div>

//                       <div className="md:col-span-1 text-right">
//                         <div className="text-sm text-gray-500">Paid</div>
//                         <div className="font-semibold text-green-600">{formatCurrency(p.paidAmount)}</div>
//                         <div className="text-xs text-gray-400">of {formatCurrency(p.totalAmount)}</div>
//                       </div>

//                       <div className="md:col-span-1 text-right flex items-center justify-end gap-2">
//                         <div className={`px-2 py-1 rounded text-xs ${p.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</div>
//                         <button onClick={() => toggle(p.paymentID)} className="px-3 py-1 bg-indigo-600 text-white rounded">{expanded[p.paymentID] ? 'Hide' : 'History'}</button>
//                       </div>
//                     </div>

//                     {expanded[p.paymentID] && (
//                       <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
//                         {(!p.history || p.history.length === 0) ? (
//                           <div className="text-sm text-gray-500">No history entries.</div>
//                         ) : (
//                           <div className="space-y-2">
//                             {p.history.map((h) => (
//                               <div key={h.paymentHistoryID} className="flex justify-between items-start bg-gray-50 dark:bg-gray-900 p-3 rounded">
//                                 <div>
//                                   <div className="text-sm font-medium">{formatDate(h.paymentDate)}</div>
//                                   <div className="text-xs text-gray-400">{h.paymentMethod} • Ref: {h.referenceNo}</div>
//                                   {h.remarks && <div className="text-xs text-gray-500 mt-1">{h.remarks}</div>}
//                                 </div>
//                                 <div className="text-right">
//                                   <div className="font-semibold text-green-600">{formatCurrency(h.amountPaid)}</div>
//                                   <div className="text-xs text-gray-400">By: {h.createdBy}</div>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                         <div className="mt-3 text-sm text-gray-600 text-right">Total Paid: <strong className="text-green-700">{formatCurrency(p.paidAmount)}</strong> • Balance: <strong className={` ${p.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(p.balanceAmount)}</strong></div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               ))
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

const TeacherPaymentHistory = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalReceived: 0,
    pendingBalance: 0,
    completionRate: 0
  });

  const teacherId = user?.UserID || user?.userID || user?.id || 2;

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  useEffect(() => {
    if (payments.length > 0) {
      const totalReceived = payments.reduce((s, x) => s + (Number(x.paidAmount) || 0), 0);
      const pendingBalance = payments.reduce((s, x) => s + (Number(x.balanceAmount) || 0), 0);
      const totalExpected = payments.reduce((s, x) => s + (Number(x.totalAmount) || 0), 0);
      const completionRate = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;
      
      setStats({
        totalStudents: payments.length,
        totalReceived,
        pendingBalance,
        completionRate: Math.round(completionRate)
      });
    }
  }, [payments]);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `http://localhost:50447/api/Payments/teacher/${teacherId}`;
      const rawToken = window.localStorage.getItem("token") || window.sessionStorage.getItem("token");
      const headers = {};
      if (rawToken) {
        const token = String(rawToken).replace(/^"|"$/g, "").replace(/^'|'$/g, "");
        headers["Authorization"] = `Bearer ${token}`;
      }
      const resp = await axios.get(url, { headers });
      setPayments(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data || err?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const formatCurrency = (n) => `Rs. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : "-");

  const getStatusIcon = (status) => {
    switch(status) {
      case 'PAID': return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
      case 'PARTIAL': return (
        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PAID': return 'bg-green-50 text-green-700 border-green-200';
      case 'PARTIAL': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filtered = payments.filter((p) => {
    const q = (search || "").toString().toLowerCase();
    if (!q) return true;
    return (
      String(p.studentName || "").toLowerCase().includes(q) ||
      String(p.parentName || "").toLowerCase().includes(q) ||
      String(p.enrollmentID || "").includes(q) ||
      String(p.paymentID || "").includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment History</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage student payments</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchPayments}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200 text-gray-700 dark:text-gray-300 font-medium shadow-sm hover:shadow"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              {/* <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button> */}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalStudents}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.197h-6m6 0V9a3 3 0 00-6 0v3m6 0v3m0 0h-6m6 0v3m0 0h-6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Received</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                    {formatCurrency(stats.totalReceived)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Balance</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                    {formatCurrency(stats.pendingBalance)}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                  <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                    {stats.completionRate}%
                  </p>
                </div>
                <div className="relative">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">{stats.completionRate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, parent name, enrollment ID, or payment ID..."
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading payment records...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 dark:text-red-300">{String(error)}</p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payments found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">No payment records match your search criteria.</p>
            <button 
              onClick={() => setSearch("")}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Payment Cards */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((p) => (
              <div 
                key={p.paymentID} 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className="p-6">
                  {/* Header Row */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{p.studentName}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Enrollment: #{p.enrollmentID}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Payment ID: #{p.paymentID}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(p.status)}`}>
                        {getStatusIcon(p.status)}
                        {p.status}
                      </span>
                      <button
                        onClick={() => toggle(p.paymentID)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors duration-200"
                      >
                        {expanded[p.paymentID] ? (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Hide Details
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            View Details
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(p.totalAmount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Paid Amount</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {formatCurrency(p.paidAmount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
                      <p className={`text-xl font-bold ${p.balanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'} mt-1`}>
                        {formatCurrency(p.balanceAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Parent Info */}
                  <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg mb-4">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.197h-6m6 0V9a3 3 0 00-6 0v3m6 0v3m0 0h-6m6 0v3m0 0h-6" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{p.parentName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{p.parentContact}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable History */}
                  {expanded[p.paymentID] && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700" style={{animation: 'fadeIn 0.3s ease-out'}}>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Payment History
                      </h4>
                      
                      {(!p.history || p.history.length === 0) ? (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                          No payment history available
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {p.history.map((h, index) => (
                            <div 
                              key={h.paymentHistoryID} 
                              className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium text-xs">
                                      {index + 1}
                                    </div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {formatDate(h.paymentDate)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                      {h.paymentMethod === 'Credit Card' ? (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                      ) : h.paymentMethod === 'Cash' ? (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      )}
                                      <span>{h.paymentMethod}</span>
                                    </div>
                                    <span>•</span>
                                    <span>Ref: {h.referenceNo}</span>
                                    <span>•</span>
                                    <span>By: User #{h.createdBy}</span>
                                  </div>
                                  {h.remarks && (
                                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded">
                                      {h.remarks}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(h.amountPaid)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Paid on {new Date(h.paymentDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Summary */}
                      <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900/20 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Payment Progress</p>
                            <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                              <div 
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${(p.paidAmount / p.totalAmount) * 100}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {Math.round((p.paidAmount / p.totalAmount) * 100)}% Complete
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Summary</p>
                            <div className="flex items-center gap-4 mt-1">
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                  {formatCurrency(p.paidAmount)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${p.balanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {formatCurrency(p.balanceAmount)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add custom styles for animations */}
      <style jsx="true">{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TeacherPaymentHistory;