import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role"); // stored on login

  if (!token || (role && userRole !== role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
