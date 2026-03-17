import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminLayout from "./pages/AdminLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import AdminCourseManagement from "./pages/AdminCourseManagement";
import AdminRequests from "./pages/AdminRequests";

import StudentDashboardPage from "./pages/StudentDashboardPage";
import StudentCoursesPage from "./pages/StudentCoursesPage";
import StudentGradesPage from "./pages/StudentGradesPage";
import StudentExamSchedulePage from "./pages/StudentExamSchedulePage";
import StudentAttendancePage from "./pages/StudentAttendancePage";
import StudentTranscriptPage from "./pages/StudentTranscriptPage";
import StudentFeesPage from "./pages/StudentFeesPage";
import ProfessorPage from "./pages/ProfessorPage";
import StudentLayout from "./pages/StudentLayout";
import ProfessorLayout from "./pages/ProfessorLayout";

import AnnouncementsPage from "./pages/AnnouncementsPage";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage";

import ProfessorClassesPage from "./pages/ProfessorClassesPage";
import ProfessorGradesPage from "./pages/ProfessorGradesPage";
import ProfessorAttendancePage from "./pages/ProfessorAttendancePage";
import ProfessorAnnouncementsPage from "./pages/ProfessorAnnouncementsPage";

import ReportsPage from "./pages/ReportsPage";

import PredictiveAnalyticsPage from "./pages/PredictiveAnalyticsPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* ADMIN AREA */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="courses" element={<AdminCourseManagement />} />
          {/* Admin announcements manager */}
          <Route path="announcements" element={<AdminAnnouncementsPage />} />

          {/* placeholders (optional for now) */}
          <Route path="courses" element={<div>Courses (later)</div>} />
          <Route path="messages" element={<div>Messages (later)</div>} />
          <Route path="requests" element={<AdminRequests />} />
          <Route
            path="predictive-analytics"
            element={<PredictiveAnalyticsPage />}
          />
        </Route>

        {/* STUDENT AREA */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Student View All announcements */}
          <Route path="announcements" element={<AnnouncementsPage />} />

          <Route path="courses" element={<StudentCoursesPage />} />
          <Route path="grades" element={<StudentGradesPage />} />
          <Route path="fees" element={<StudentFeesPage />} />
          <Route path="exams" element={<StudentExamSchedulePage />} />
          <Route path="attendance" element={<StudentAttendancePage />} />
          <Route path="transcript" element={<StudentTranscriptPage />} />
        </Route>

        {/* PROFESSOR AREA */}
        <Route
          path="/professor"
          element={
            <ProtectedRoute role="professor">
              <ProfessorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProfessorPage />} />

          <Route path="profile" element={<ProfilePage />} />
          <Route path="classes" element={<ProfessorClassesPage />} />
          <Route path="grades" element={<ProfessorGradesPage />} />
          <Route path="attendance" element={<ProfessorAttendancePage />} />
          <Route
            path="announcements"
            element={<ProfessorAnnouncementsPage />}
          />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
