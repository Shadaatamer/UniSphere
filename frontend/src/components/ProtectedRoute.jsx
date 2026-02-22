// frontend/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  if (!token) return <Navigate to="/" replace />;

  // If a role is required and user doesn't match, redirect to their own dashboard
  if (role && userRole !== role) {
    if (userRole === "admin") return <Navigate to="/admin" replace />;
    if (userRole === "student") return <Navigate to="/student" replace />;
    if (userRole === "professor") return <Navigate to="/professor" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
