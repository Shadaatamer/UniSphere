import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminLayout from "./pages/AdminLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminPage from "./pages/AdminPage";

import StudentPage from "./pages/StudentPage";
import ProfessorPage from "./pages/ProfessorPage";
import StudentLayout from "./pages/StudentLayout";
import ProfessorLayout from "./pages/ProfessorLayout";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/*  ADMIN AREA */}
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

          {/* placeholders (optional for now) */}
          <Route path="courses" element={<div>Courses (later)</div>} />
          <Route path="messages" element={<div>Messages (later)</div>} />
          <Route path="requests" element={<div>Requests (later)</div>} />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentPage />} />
          <Route
            path="courses"
            element={<div style={{ padding: 18 }}>My Courses (later)</div>}
          />
          <Route
            path="grades"
            element={<div style={{ padding: 18 }}>Grades (later)</div>}
          />
          <Route
            path="attendance"
            element={<div style={{ padding: 18 }}>Attendance (later)</div>}
          />
          <Route
            path="transcript"
            element={
              <div style={{ padding: 18 }}>Transcript Requests (later)</div>
            }
          />
        </Route>

        <Route
          path="/professor"
          element={
            <ProtectedRoute role="professor">
              <ProfessorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProfessorPage />} />
          <Route path="classes" element={<div>My Classes (later)</div>} />
          <Route path="grades" element={<div>Enter Grades (later)</div>} />
          <Route path="attendance" element={<div>Attendance (later)</div>} />
          <Route
            path="announcements"
            element={<div>Announcements (later)</div>}
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
