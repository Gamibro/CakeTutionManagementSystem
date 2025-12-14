// import { Routes, Route, Navigate, useLocation } from "react-router-dom";
// import { useAuth } from "./contexts/AuthContext";
// import MainLayout from "./layouts/MainLayout";
// import AdminLayout from "./layouts/AdminLayout";
// import TeacherLayout from "./layouts/TeacherLayout";
// import StudentLayout from "./layouts/StudentLayout";
// import Login from "./components/auth/Login";
// import Register from "./components/auth/Register";
// import AdminDashboard from "./pages/admin/Dashboard";
// import AdminCourses from "./pages/admin/Courses";
// import AdminCourseDetails from "./pages/admin/CourseDetails";
// import AdminUsers from "./pages/admin/Users";
// import AdminSubjects from "./pages/admin/Subjects";
// import AdminSettings from "./pages/admin/Settings";
// import AdminClassSchedule from "./pages/admin/ClassSchedule";
// import AdminPaymentsHistory from "./pages/admin/PaymentHistory";
// import TeacherDashboard from "./pages/teacher/Dashboard";
// import TeacherCourses from "./pages/teacher/Courses";
// import TeacherSubjects from "./pages/teacher/Subjects";
// import TeacherAttendance from "./pages/teacher/Attendance";
// import TeacherMaterials from "./pages/teacher/Materials";
// import TeacherStudents from "./pages/teacher/Students";
// import TeacherPayments from "./pages/teacher/Payment";
// import TeacherComplaints from "./pages/teacher/Complaints";
// import TeacherNotices from "./pages/teacher/Notices";
// import TeacherClassSchedule from "./pages/teacher/ClassSchedule";
// import StudentDashboard from "./pages/student/Dashboard";
// import StudentCourses from "./pages/student/Courses";
// import StudentClassSchedule from "./pages/student/ClassSchedule";
// import StudentPaymentView from "./pages/student/PaymentView";
// import CourseView from "./components/courses/CourseView";
// import SubjectView from "./components/subjects/SubjectView";
// import SubjectModal from "./components/subjects/SubjectModal";
// import StudentAttendance from "./pages/student/Attendance";
// import StudentMaterials from "./pages/student/Materials";
// import StudentComplaints from "./pages/student/Complaints";
// import NotFound from "./pages/404";
// import UserDetailsPage from "./pages/admin/UserDetailsPage";
// import Profile from "./pages/Profile";
// import ProfileModal from "./pages/ProfileModal";
// import TeacherPaymentHistory from './pages/TeacherPaymentHistory';

// const RoutesConfig = () => {
//   const { user, isAuthenticated } = useAuth();
//   const location = useLocation();
//   const state = location.state;
//   const backgroundLocation = state && state.backgroundLocation;

//   const ProtectedRoute = ({ children, roles }) => {
//     if (!isAuthenticated) {
//       return <Navigate to="/login" replace />;
//     }

//     if (roles && !roles.includes(user.userType)) {
//       return <Navigate to="/" replace />;
//     }

//     return children;
//   };

//   return (
//     <>
//       {/* Base routes; if opened from a background state, render previous location */}
//       <Routes location={backgroundLocation || location}>
//         {/* Public Routes */}
//         <Route path="/login" element={<Login />} />
//         <Route path="/register" element={<Register />} />

//         {/* Admin Routes */}
//         <Route
//           path="/admin"
//           element={
//             <ProtectedRoute roles={["admin"]}>
//               <AdminLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route index element={<AdminDashboard />} />
//           <Route path="courses" element={<AdminCourses />} />
//           <Route path="courses/:id" element={<AdminCourseDetails />} />
//           <Route path="subjects" element={<AdminSubjects />} />
//           <Route path="class-schedule" element={<AdminClassSchedule />} />
//           <Route path="users" element={<AdminUsers />} />
//           <Route path="users/:id" element={<UserDetailsPage />} />
//           <Route path="payments" element={<TeacherPayments />} />
//           <Route path="payment-history" element={<AdminPaymentsHistory />} />
//           <Route path="settings" element={<AdminSettings />} />
//         </Route>

//         {/* Teacher Routes */}
//         <Route
//           path="/teacher"
//           element={
//             <ProtectedRoute roles={["teacher"]}>
//               <TeacherLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route index element={<TeacherDashboard />} />
//           <Route path="courses" element={<TeacherCourses />} />
//           <Route path="courses/:id" element={<TeacherCourses />} />
//           <Route path="subjects" element={<TeacherSubjects />} />
//           <Route path="subjects/:id" element={<TeacherSubjects />} />
//           <Route path="class-schedule" element={<TeacherClassSchedule />} />
//           <Route path="attendance" element={<TeacherAttendance />} />
//           <Route path="attendance/:id" element={<TeacherAttendance />} />
//           <Route path="materials" element={<TeacherMaterials />} />
//           <Route path="students" element={<TeacherStudents />} />
//           <Route path="payments" element={<TeacherPayments />} />
//           <Route
//             path="students/:id"
//             element={
//               <UserDetailsPage
//                 allowEdit={false}
//                 showManageLink={false}
//                 manageLinkPath="/teacher/students"
//                 manageLinkText="Back to Students"
//                 backPath="/teacher/students"
//                 heading="Student Details"
//                 listLabel="Students"
//               />
//             }
//           />
//           <Route path="complaints" element={<TeacherComplaints />} />
//           <Route path="notices" element={<TeacherNotices />} />
//         </Route>

//         {/* Student Routes */}
//         <Route
//           path="/student"
//           element={
//             <ProtectedRoute roles={["student"]}>
//               <StudentLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route index element={<StudentDashboard />} />
//           <Route path="courses" element={<StudentCourses />} />
//           <Route path="payment-view" element={<StudentPaymentView />} />
//           <Route path="class-schedule" element={<StudentClassSchedule />} />
//           <Route path="courses/:id" element={<CourseView />} />
//           <Route path="attendance" element={<StudentAttendance />} />
//           <Route path="materials" element={<StudentMaterials />} />
//           <Route path="complaints" element={<StudentComplaints />} />
//         </Route>

//         {/* Profile (full-page fallback when no background) */}
//         <Route
//           path="/profile"
//           element={
//             <ProtectedRoute>
//               <Profile />
//             </ProtectedRoute>
//           }
//         />

//         {/* Root Redirect */}
//         <Route
//           path="/"
//           element={
//             <ProtectedRoute>
//               {user?.userType === "admin" ? (
//                 <Navigate to="/admin" replace />
//               ) : user?.userType === "teacher" ? (
//                 <Navigate to="/teacher" replace />
//               ) : (
//                 <Navigate to="/student" replace />
//               )}
//             </ProtectedRoute>
//           }
//         />

//         {/* Shared Subject view route (accessible by authenticated users)
//             Render inside MainLayout via nested route so Outlet receives SubjectView */}
//         <Route
//           element={
//             <ProtectedRoute>
//               <MainLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route path="subjects/:id" element={<SubjectView />} />
//         </Route>

//         {/* 404 Route */}
//         <Route path="*" element={<NotFound />} />
//       </Routes>

//       {/* Modal routes when background exists */}
//       {backgroundLocation && (
//         <Routes>
//           <Route
//             path="/profile"
//             element={
//               <ProtectedRoute>
//                 <ProfileModal />
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/subjects/:id"
//             element={
//               <ProtectedRoute>
//                 <SubjectModal />
//               </ProtectedRoute>
//             }
//           />
//         </Routes>
//       )}
//     </>
//   );
// };

// export default RoutesConfig;
// Assuming you have a sidebar component in TeacherLayout
// Add this menu item to your sidebar navigation array:

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import StudentLayout from "./layouts/StudentLayout";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCourses from "./pages/admin/Courses";
import AdminCourseDetails from "./pages/admin/CourseDetails";
import AdminUsers from "./pages/admin/Users";
import AdminSubjects from "./pages/admin/Subjects";
import AdminSettings from "./pages/admin/Settings";
import AdminClassSchedule from "./pages/admin/ClassSchedule";
import AdminPaymentsHistory from "./pages/admin/PaymentHistory";
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherCourses from "./pages/teacher/Courses";
import TeacherSubjects from "./pages/teacher/Subjects";
import TeacherAttendance from "./pages/teacher/Attendance";
import TeacherMaterials from "./pages/teacher/Materials";
import TeacherStudents from "./pages/teacher/Students";
import TeacherPayments from "./pages/teacher/Payment";
import TeacherComplaints from "./pages/teacher/Complaints";
import TeacherNotices from "./pages/teacher/Notices";
import TeacherClassSchedule from "./pages/teacher/ClassSchedule";
import StudentDashboard from "./pages/student/Dashboard";
import StudentCourses from "./pages/student/Courses";
import StudentClassSchedule from "./pages/student/ClassSchedule";
import StudentPaymentView from "./pages/student/PaymentView";
import CourseView from "./components/courses/CourseView";
import SubjectView from "./components/subjects/SubjectView";
import SubjectModal from "./components/subjects/SubjectModal";
import StudentAttendance from "./pages/student/Attendance";
import StudentMaterials from "./pages/student/Materials";
import StudentComplaints from "./pages/student/Complaints";
import NotFound from "./pages/404";
import UserDetailsPage from "./pages/admin/UserDetailsPage";
import Profile from "./pages/Profile";
import ProfileModal from "./pages/ProfileModal";
import TeacherPaymentHistory from './pages/teacher/TeacherPaymentHistory'; // Add this import

const RoutesConfig = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const state = location.state;
  const backgroundLocation = state && state.backgroundLocation;

  const ProtectedRoute = ({ children, roles }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user.userType)) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <>
      {/* Base routes; if opened from a background state, render previous location */}
      <Routes location={backgroundLocation || location}>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        {/* <Route path="/register" element={<Register />} /> */}

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="courses/:id" element={<AdminCourseDetails />} />
          <Route path="subjects" element={<AdminSubjects />} />
          <Route path="class-schedule" element={<AdminClassSchedule />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<UserDetailsPage />} />
          <Route path="payments" element={<TeacherPayments />} />
          <Route path="payment-history" element={<AdminPaymentsHistory />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Teacher Routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute roles={["teacher"]}>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="courses/:id" element={<TeacherCourses />} />
          <Route path="subjects" element={<TeacherSubjects />} />
          <Route path="subjects/:id" element={<TeacherSubjects />} />
          <Route path="class-schedule" element={<TeacherClassSchedule />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="attendance/:id" element={<TeacherAttendance />} />
          <Route path="materials" element={<TeacherMaterials />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="payments" element={<TeacherPayments />} />
          {/* ADD THIS NEW ROUTE */}
          <Route path="payment-history" element={<TeacherPaymentHistory />} />
          <Route
            path="students/:id"
            element={
              <UserDetailsPage
                allowEdit={false}
                showManageLink={false}
                manageLinkPath="/teacher/students"
                manageLinkText="Back to Students"
                backPath="/teacher/students"
                heading="Student Details"
                listLabel="Students"
              />
            }
          />
          <Route path="complaints" element={<TeacherComplaints />} />
          <Route path="notices" element={<TeacherNotices />} />
        </Route>

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute roles={["student"]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="payment-view" element={<StudentPaymentView />} />
          <Route path="class-schedule" element={<StudentClassSchedule />} />
          <Route path="courses/:id" element={<CourseView />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="materials" element={<StudentMaterials />} />
          <Route path="complaints" element={<StudentComplaints />} />
        </Route>

        {/* Profile (full-page fallback when no background) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Root Redirect */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {user?.userType === "admin" ? (
                <Navigate to="/admin" replace />
              ) : user?.userType === "teacher" ? (
                <Navigate to="/teacher" replace />
              ) : (
                <Navigate to="/student" replace />
              )}
            </ProtectedRoute>
          }
        />

        {/* Shared Subject view route (accessible by authenticated users)
            Render inside MainLayout via nested route so Outlet receives SubjectView */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="subjects/:id" element={<SubjectView />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Modal routes when background exists */}
      {backgroundLocation && (
        <Routes>
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileModal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:id"
            element={
              <ProtectedRoute>
                <SubjectModal />
              </ProtectedRoute>
            }
          />
        </Routes>
      )}
    </>
  );
};

export default RoutesConfig;
