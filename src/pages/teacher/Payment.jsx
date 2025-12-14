
// // export default Payment;
// import { useEffect, useState } from "react";
// import { useLocation } from "react-router-dom";
// import axios from "axios";
// import { getCourseDetails } from "../../services/courseService";
// import { useAuth } from "../../contexts/AuthContext";

// const Payment = () => {
//   const { user } = useAuth();
//   const location = useLocation();
//   // Initialize from storage synchronously so inputs show values on first render
//   const readFromStorage = (key) => {
//     try {
//       return window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "";
//     } catch (e) {
//       return "";
//     }
//   };

//   const getInitialEnrollment = () => {
//     try {
//       const params = new URLSearchParams(location.search || "");
//       const enrollmentParam = params.get("enrollment");
//       return enrollmentParam || readFromStorage("lastEnrollmentID") || "";
//     } catch (e) {
//       return readFromStorage("lastEnrollmentID") || "";
//     }
//   };

//   const [enrollmentId, setEnrollmentId] = useState(() => String(getInitialEnrollment()));
//   const [totalAmount, setTotalAmount] = useState(() => {
//     const v = readFromStorage("selectedTotalFee");
//     return v !== null && v !== undefined ? String(v) : "";
//   });
//   const [firstPaid, setFirstPaid] = useState(() => {
//     const v = readFromStorage("selectedMonthlyFee");
//     return v !== null && v !== undefined ? String(v) : "";
//   });
//   const [paymentMethod, setPaymentMethod] = useState("Cash");
//   const [referenceNo, setReferenceNo] = useState("");
//   const [remarks, setRemarks] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState(null);

//   // Load enrollment ID from query param or localStorage
//   useEffect(() => {
//     try {
//       const params = new URLSearchParams(location.search || "");
//       const enrollmentParam = params.get("enrollment");
//       const storedEnrollmentId = window.localStorage.getItem("lastEnrollmentID");
      
//       const enrollmentValue = enrollmentParam || storedEnrollmentId;
//       if (enrollmentValue) {
//         console.log('Setting enrollment ID:', enrollmentValue);
//         setEnrollmentId(String(enrollmentValue));
//       }
//     } catch (e) {
//       console.error('Error loading enrollment ID:', e);
//     }
//   }, [location.search]);

//   // Load fees from localStorage/sessionStorage
//   useEffect(() => {
//     try {
//       console.log('Loading fees from storage...');
      
//       // Try localStorage first, then sessionStorage
//       const totalLS = window.localStorage.getItem("selectedTotalFee");
//       const monthlyLS = window.localStorage.getItem("selectedMonthlyFee");
//       const totalSS = window.sessionStorage.getItem("selectedTotalFee");
//       const monthlySS = window.sessionStorage.getItem("selectedMonthlyFee");
      
//       const total = totalLS || totalSS;
//       const monthly = monthlyLS || monthlySS;

//       console.log('Fees from storage:', { total, monthly });

//       if (total !== null && total !== undefined && total !== "") {
//         const n = Number(total);
//         const value = !Number.isNaN(n) ? String(n) : String(total);
//         console.log('Setting total amount:', value);
//         setTotalAmount(value);
//       }
      
//       if (monthly !== null && monthly !== undefined && monthly !== "") {
//         const m = Number(monthly);
//         const value = !Number.isNaN(m) ? String(m) : String(monthly);
//         console.log('Setting first paid amount:', value);
//         setFirstPaid(value);
//       }
//     } catch (e) {
//       console.error('Error loading fees from storage:', e);
//     }
//   }, []);

//   // Load fees from API if provided via query params
//   useEffect(() => {
//     (async () => {
//       try {
//         const params = new URLSearchParams(location.search || "");
//         const courseParam = params.get("course") || params.get("courseId") || params.get("courseid");
//         const subjectParam = params.get("subject") || params.get("subjectId") || params.get("subjectid");
        
//         if (!courseParam) {
//           console.log('No course parameter, skipping API fetch');
//           return;
//         }

//         console.log('Fetching course details for course:', courseParam, 'subject:', subjectParam);
        
//         const details = await getCourseDetails(courseParam);
//         console.log('Course details received:', details);
        
//         const subjectList = details?.subjects ?? details?.Subjects ?? [];
//         let found = null;
        
//         if (Array.isArray(subjectList) && subjectList.length) {
//           if (subjectParam) {
//             found = subjectList.find(
//               (s) => String(s?.subjectID ?? s?.SubjectID ?? s?.id ?? s?.subjectId) === String(subjectParam)
//             );
//             console.log('Found matching subject:', found);
//           }
//           if (!found) {
//             found = subjectList[0];
//             console.log('Using first subject as fallback:', found);
//           }
//         }

//         if (found) {
//           const total = found.totalFee ?? found.TotalFee ?? found.total ?? null;
//           const monthly = found.monthlyFee ?? found.MonthlyFee ?? found.monthly ?? null;
          
//           console.log('Extracted fees from API:', { total, monthly });
          
//           if (total !== null && total !== undefined) {
//             const n = Number(total);
//             const value = !Number.isNaN(n) ? String(n) : String(total);
//             console.log('Setting total amount from API:', value);
//             setTotalAmount(value);
//           }
          
//           if (monthly !== null && monthly !== undefined) {
//             const m = Number(monthly);
//             const value = !Number.isNaN(m) ? String(m) : String(monthly);
//             console.log('Setting first paid amount from API:', value);
//             setFirstPaid(value);
//           }
//         }
//       } catch (err) {
//         console.error("Failed to fetch course details for query-prefill", err);
//       }
//     })();
//   }, [location.search]);

//   // Fallback: Load fees from API using stored course/subject IDs if values are empty
//   useEffect(() => {
//     (async () => {
//       try {
//         // Only fetch if we don't have values yet
//         if (totalAmount || firstPaid) {
//           console.log('Already have fee values, skipping fallback fetch');
//           return;
//         }

//         const courseId = window.localStorage.getItem("selectedCourseID") || 
//                         window.sessionStorage.getItem("selectedCourseID");
//         const subjectId = window.localStorage.getItem("selectedSubjectID") || 
//                          window.sessionStorage.getItem("selectedSubjectID");
        
//         if (!courseId) {
//           console.log('No stored course ID, skipping fallback fetch');
//           return;
//         }

//         console.log('Fallback fetch for course:', courseId, 'subject:', subjectId);

//         const details = await getCourseDetails(courseId);
//         console.log('Fallback course details:', details);
        
//         const subjectList = details?.subjects ?? details?.Subjects ?? [];
//         let found = null;
        
//         if (Array.isArray(subjectList) && subjectList.length) {
//           if (subjectId) {
//             found = subjectList.find(
//               s => String(s?.subjectID ?? s?.SubjectID ?? s?.id ?? s?.subjectId) === String(subjectId)
//             );
//           }
//           if (!found) found = subjectList[0];
//         }
        
//         if (found) {
//           const total = found.totalFee ?? found.TotalFee ?? found.total ?? null;
//           const monthly = found.monthlyFee ?? found.MonthlyFee ?? found.monthly ?? null;
          
//           console.log('Fallback extracted fees:', { total, monthly });
          
//           if (total !== null && total !== undefined) {
//             const n = Number(total);
//             const value = !Number.isNaN(n) ? String(n) : String(total);
//             console.log('Setting total from fallback:', value);
//             setTotalAmount(value);
//           }
          
//           if (monthly !== null && monthly !== undefined) {
//             const m = Number(monthly);
//             const value = !Number.isNaN(m) ? String(m) : String(monthly);
//             console.log('Setting monthly from fallback:', value);
//             setFirstPaid(value);
//           }
//         }
//       } catch (err) {
//         console.error('Failed to load course details for payment prefill', err);
//       }
//     })();
//   }, [totalAmount, firstPaid]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setResult(null);
    
//     const createdBy = user?.UserID ?? user?.id ?? user?.userID ?? user?.userId ?? null;
    
//     if (!enrollmentId) {
//       setError("Missing enrollment id");
//       return;
//     }

//     const body = {
//       EnrollmentID: Number.isNaN(Number(enrollmentId))
//         ? enrollmentId
//         : Number(enrollmentId),
//       TotalAmount: Number(totalAmount) || 0,
//       FirstPaidAmount: Number(firstPaid) || 0,
//       PaymentMethod: paymentMethod || "",
//       ReferenceNo: referenceNo || null,
//       Remarks: remarks || null,
//       CreatedBy: createdBy,
//     };

//     console.log('Submitting payment:', body);

//     setLoading(true);
//     try {
//       // Prefer explicit API URL for Payments endpoint
//       const apiUrl = "http://localhost:50447/api/Payments";
//       const headers = {};
//       try {
//         const rawToken = window.localStorage.getItem("token") || window.sessionStorage.getItem("token");
//         if (rawToken) {
//           // strip surrounding quotes if present
//           const token = String(rawToken).replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
//           headers["Authorization"] = `Bearer ${token}`;
//         }
//       } catch (e) {
//         // ignore token read errors
//       }

//       const resp = await axios.post(apiUrl, body, { headers });
//       setResult(resp.data);
//       console.log("Payment created successfully:", resp.data);
      
//       // Clear stored values after successful payment
//       try {
//         window.localStorage.removeItem('selectedTotalFee');
//         window.localStorage.removeItem('selectedMonthlyFee');
//         window.localStorage.removeItem('selectedCourseID');
//         window.localStorage.removeItem('selectedSubjectID');
//         window.localStorage.removeItem('lastEnrollmentID');
//         window.sessionStorage.removeItem('selectedTotalFee');
//         window.sessionStorage.removeItem('selectedMonthlyFee');
//         window.sessionStorage.removeItem('selectedCourseID');
//         window.sessionStorage.removeItem('selectedSubjectID');
//         window.sessionStorage.removeItem('lastEnrollmentID');
//       } catch (e) {
//         // ignore cleanup errors
//       }
//     } catch (err) {
//       console.error("Payment create failed", err);
//       setError(err?.response?.data || err?.message || "Failed to create");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-6 p-6">
//       <h1 className="text-xl font-semibold">Payments</h1>
      
//       {/* Debug info removed for cleaner UI */}
      
//       <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
//         <div>
//           <label className="block text-sm font-medium">Enrollment ID</label>
//           <input
//             className="input mt-1 px-3 py-2"
//             value={enrollmentId}
//             readOnly
//             onChange={(e) => setEnrollmentId(e.target.value)}
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium">Total Amount</label>
//           <input
//             type="number"
//             step="0.01"
//             className="input mt-1 px-3 py-2"
//             value={totalAmount}
//             onChange={(e) => setTotalAmount(e.target.value)}
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium">First Paid Amount (Monthly Fee)</label>
//           <input
//             type="number"
//             step="0.01"
//             className="input mt-1 px-3 py-2"
//             value={firstPaid}
//             onChange={(e) => setFirstPaid(e.target.value)}
//           />
//         </div>

//         {/* <div>
//           <label className="block text-sm font-medium">Payment Method</label>
//           <select
//             className="mt-1 block w-full rounded border px-3 py-2"
//             value={paymentMethod}
//             onChange={(e) => setPaymentMethod(e.target.value)}
//           >
//             <option>Cash</option>
//             <option>Credit Card</option>
//             <option>Bank Transfer</option>
//           </select>
//         </div> */}

//         <div>
//           <label className="block text-sm font-medium">Reference No</label>
//           <input
//             className="input mt-1 px-3 py-2"
//             value={referenceNo}
//             onChange={(e) => setReferenceNo(e.target.value)}
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium">Remarks</label>
//           <textarea
//             className="input mt-1 px-3 py-2"
//             rows="3"
//             value={remarks}
//             onChange={(e) => setRemarks(e.target.value)}
//           />
//         </div>

//         <div className="flex items-center gap-3">
//           <button
//             type="submit"
//             className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
//             disabled={loading}
//           >
//             {loading ? "Saving..." : "Save Payment"}
//           </button>
//         </div>
//       </form>

//       {error && (
//         <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded">
//           <pre className="whitespace-pre-wrap">{String(error)}</pre>
//         </div>
//       )}

//       {result && (
//         <div className="rounded border p-4 bg-green-50 dark:bg-green-900/20">
//           <h3 className="font-medium text-green-800 dark:text-green-200">Payment created successfully!</h3>
//           <pre className="mt-2 text-xs whitespace-pre-wrap text-green-700 dark:text-green-300">
//             {JSON.stringify(result, null, 2)}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Payment;
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { getCourseDetails } from "../../services/courseService";
import { useAuth } from "../../contexts/AuthContext";

const Payment = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [enrollmentId, setEnrollmentId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [firstPaid, setFirstPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [storedLoggedUser, setStoredLoggedUser] = useState(null);

  // helpers: format with commas and parse formatted numbers
  const formatWithCommas = (value) => {
    if (value === null || value === undefined) return "";
    const s = String(value).trim();
    if (s === "") return "";
    const raw = s.replace(/,/g, "");
    const parts = raw.split(".");
    const intPart = parts[0].replace(/[^0-9]/g, "") || "0";
    const fracPart = parts[1] ? parts[1].replace(/[^0-9]/g, "").slice(0, 2) : "";
    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return fracPart ? `${intFormatted}.${fracPart}` : intFormatted;
  };

  const parseNumber = (formatted) => {
    if (formatted === null || formatted === undefined) return NaN;
    const raw = String(formatted).replace(/,/g, "").trim();
    if (raw === "") return NaN;
    return Number(raw);
  };

  // Initialize state from storage/query params
  useEffect(() => {
    const readFromStorage = (key) => {
      try {
        return window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "";
      } catch (e) {
        return "";
      }
    };

    // Get enrollment ID
    const params = new URLSearchParams(location.search);
    const enrollmentParam = params.get("enrollment");
    const storedEnrollment = readFromStorage("lastEnrollmentID");
    const initialEnrollment = enrollmentParam || storedEnrollment || "";
    setEnrollmentId(initialEnrollment);

    // Get fees (format with commas when possible)
    const total = readFromStorage("selectedTotalFee");
    const monthly = readFromStorage("selectedMonthlyFee");
    if (total) {
      const n = Number(String(total).replace(/,/g, ""));
      setTotalAmount(!Number.isNaN(n) ? formatWithCommas(n % 1 === 0 ? String(n) : n.toFixed(2)) : String(total));
    }
    if (monthly) {
      const m = Number(String(monthly).replace(/,/g, ""));
      setFirstPaid(!Number.isNaN(m) ? formatWithCommas(m % 1 === 0 ? String(m) : m.toFixed(2)) : String(monthly));
    }
  }, [location.search]);

  // Load stored logged user (if enrollment flow saved a student object)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("loggedUser") || window.localStorage.getItem("user") || window.sessionStorage.getItem("loggedUser") || window.sessionStorage.getItem("user");
      if (!raw) return;
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parsed = null;
      }
      if (parsed && (parsed.id || parsed.UserID || parsed.userID || parsed.ID || parsed.id === 0)) {
        setStoredLoggedUser(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Calculate balance
  useEffect(() => {
    const total = parseNumber(totalAmount) || 0;
    const paid = parseNumber(firstPaid) || 0;
    const balance = total - paid;
    setBalanceAmount(balance < 0 ? 0 : balance);
  }, [totalAmount, firstPaid]);

  // Load course details from API if needed
  useEffect(() => {
    const loadCourseDetails = async () => {
      if (totalAmount && firstPaid) return;

      try {
        const params = new URLSearchParams(location.search);
        const courseParam = params.get("course") || params.get("courseId");
        
        if (!courseParam) {
          const storedCourse = window.localStorage.getItem("selectedCourseID") || 
                              window.sessionStorage.getItem("selectedCourseID");
          if (!storedCourse) return;
          
          const details = await getCourseDetails(storedCourse);
          const subjectList = details?.subjects ?? details?.Subjects ?? [];
          if (subjectList.length) {
            const subject = subjectList[0];
            if (!totalAmount && subject.totalFee) {
              const n = Number(String(subject.totalFee).replace(/,/g, ""));
              setTotalAmount(!Number.isNaN(n) ? formatWithCommas(n % 1 === 0 ? String(n) : n.toFixed(2)) : String(subject.totalFee));
            }
            if (!firstPaid && subject.monthlyFee) {
              const m = Number(String(subject.monthlyFee).replace(/,/g, ""));
              setFirstPaid(!Number.isNaN(m) ? formatWithCommas(m % 1 === 0 ? String(m) : m.toFixed(2)) : String(subject.monthlyFee));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load course details", err);
      }
    };

    loadCourseDetails();
  }, [location.search, totalAmount, firstPaid]);

  // Auto-generate a simple reference number (Ref-1, Ref-2, ...)
  useEffect(() => {
    try {
      if (referenceNo && String(referenceNo).trim() !== "") return;
      const key = "paymentRefCounter";
      const current = Number(window.localStorage.getItem(key) || "0") || 0;
      const next = current + 1;
      window.localStorage.setItem(key, String(next));
      setReferenceNo(`Ref-${next}`);
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    
    if (!enrollmentId.trim()) {
      setError("Enrollment ID is required");
      return;
    }

    const totalNum = parseNumber(totalAmount);
    const firstNum = parseNumber(firstPaid);
    if (Number.isNaN(totalNum) || totalNum <= 0) {
      setError("Total amount must be greater than 0");
      return;
    }
    if (Number.isNaN(firstNum) || firstNum <= 0) {
      setError("First payment amount must be greater than 0");
      return;
    }
    if (firstNum > totalNum) {
      setError("First payment cannot exceed total amount");
      return;
    }

    const createdByFromStored = storedLoggedUser && (storedLoggedUser.UserID ?? storedLoggedUser.userID ?? storedLoggedUser.id ?? storedLoggedUser.ID ?? null);
    const body = {
      EnrollmentID: enrollmentId,
      TotalAmount: totalNum,
      FirstPaidAmount: firstNum,
      PaymentMethod: paymentMethod,
      ReferenceNo: referenceNo.trim() || null,
      Remarks: remarks.trim() || null,
      CreatedBy: createdByFromStored ?? user?.UserID ?? user?.id ?? null,
    };

    setLoading(true);
    try {
      const apiUrl = "http://localhost:50447/api/Payments";
      const headers = {};
      
      const rawToken = window.localStorage.getItem("token") || window.sessionStorage.getItem("token");
      if (rawToken) {
        const token = String(rawToken).replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
        headers["Authorization"] = `Bearer ${token}`;
      }

      const resp = await axios.post(apiUrl, body, { headers });
      setResult(resp.data);
      
      // Clear stored values
      ["selectedTotalFee", "selectedMonthlyFee", "selectedCourseID", 
       "selectedSubjectID", "lastEnrollmentID"].forEach(key => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      });
      
      // Auto-clear after 5 seconds
      setTimeout(() => {
        setResult(null);
        navigate("/payments/history");
      }, 5000);
      
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEnrollmentId("");
    setTotalAmount("");
    setFirstPaid("");
    setReferenceNo("");
    setRemarks("");
    setError(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Payment</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Process payment for student enrollment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Details</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Enrollment ID */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                          Enrollment ID
                        </div>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={enrollmentId}
                          onChange={(e) => setEnrollmentId(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-all text-gray-900 dark:text-white"
                          placeholder="Enter enrollment ID"
                          required
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          #
                        </div>
                      </div>
                      {storedLoggedUser && (
                        <div className="mt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300"> Student Name</label>
                              <input
                                type="text"
                                readOnly
                                value={storedLoggedUser.firstName ? `${storedLoggedUser.firstName} ${storedLoggedUser.lastName || ''}`.trim() : (storedLoggedUser.username || storedLoggedUser.name || '')}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
                              <input
                                type="text"
                                readOnly
                                value={storedLoggedUser.id ?? storedLoggedUser.UserID ?? storedLoggedUser.userID ?? ''}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Payment Method
                        </div>
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-all text-gray-900 dark:text-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Check">Check</option>
                        <option value="Online">Online Payment</option>
                      </select>
                    </div>
                  </div>

                  {/* Amount Section */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Total Amount */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Total Amount (LKR)
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            Rs.
                          </div>
                          <input
                            type="text"
                            value={totalAmount}
                            onChange={(e) => {
                              const raw = String(e.target.value || "").replace(/,/g, "");
                              const sanitized = raw.replace(/[^0-9.]/g, "");
                              const parts = sanitized.split(".");
                              const intPart = parts[0] || "";
                              const frac = parts[1] ? parts[1].slice(0, 2) : "";
                              const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                              const formatted = frac ? `${formattedInt}.${frac}` : formattedInt;
                              setTotalAmount(formatted);
                            }}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-all text-gray-900 dark:text-white"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      {/* First Paid Amount */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          First Payment (LKR)
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            Rs.
                          </div>
                          <input
                            type="text"
                            value={firstPaid}
                            onChange={(e) => {
                              const raw = String(e.target.value || "").replace(/,/g, "");
                              const sanitized = raw.replace(/[^0-9.]/g, "");
                              const parts = sanitized.split(".");
                              const intPart = parts[0] || "";
                              const frac = parts[1] ? parts[1].slice(0, 2) : "";
                              const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                              const formatted = frac ? `${formattedInt}.${frac}` : formattedInt;
                              setFirstPaid(formatted);
                            }}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-all text-gray-900 dark:text-white"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Balance (LKR)
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            Rs.
                          </div>
                          <input
                            type="text"
                            value={balanceAmount.toFixed(2)}
                            readOnly
                            className={`w-full pl-12 pr-4 py-3 ${
                              balanceAmount > 0 
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200' 
                                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                            } border rounded-lg transition-all`}
                          />
                          {balanceAmount > 0 ? (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                                PENDING
                              </span>
                            </div>
                          ) : (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                                PAID
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reference No */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Reference Number (Optional)
                        </div>
                      </label>
                      <input
                        type="text"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-all text-gray-900 dark:text-white"
                        placeholder="Enter reference/transaction number"
                      />
                    </div>

                    {/* Remarks */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          Remarks (Optional)
                        </div>
                      </label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows="3"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-all text-gray-900 dark:text-white"
                        placeholder="Add any additional notes or instructions..."
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Save Payment
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      Clear Form
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column - Summary & Info */}
          <div className="space-y-6">
            {/* Payment Summary Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Total Fee</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    Rs. {(parseNumber(totalAmount) || 0).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">First Payment</span>
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                    Rs. {(parseNumber(firstPaid) || 0).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-600 dark:text-gray-400">Remaining Balance</span>
                  <span className={`text-xl font-bold ${balanceAmount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    Rs. {balanceAmount.toFixed(2)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="pt-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Payment Progress</span>
                    <span>{(parseNumber(totalAmount) || 0) ? Math.round(((parseNumber(firstPaid) || 0) / (parseNumber(totalAmount) || 1)) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: (parseNumber(totalAmount) || 0) 
                          ? `${Math.min(100, ((parseNumber(firstPaid) || 0) / (parseNumber(totalAmount) || 1)) * 100)}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    try {
                      const type = user && String(user.userType || "").toLowerCase();
                      if (type === "admin") navigate("/admin/payment-history");
                      else if (type === "teacher") navigate("/teacher/payments");
                      else navigate("/admin/payment-history");
                    } catch (e) {
                      navigate("/admin/payment-history");
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors group"
                >
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">View History</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Check all payments</div>
                  </div>
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors group"
                >
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Refresh Data</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Reload stored values</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Help Info */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800/30">
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Quick Tips
              </h4>
              <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>Enter exact enrollment ID for accurate tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>First payment can be less than total amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>Balance will be calculated automatically</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error & Success Messages */}
        {error && (
          <div className="mt-6 animate-fade-in">
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Payment Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 animate-fade-in">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-500 p-4 rounded-r-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Payment Successful!</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Payment recorded successfully. Redirecting to history...
                  </p>
                  <div className="mt-3 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-3 rounded">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;