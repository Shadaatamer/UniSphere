import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function ProfessorLayout() {
  const nav = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/professor") return location.pathname === "/professor";
    return location.pathname.startsWith(path);
  };

  const itemStyle = (active) => ({
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    marginBottom: 8,
    background: active ? "#0f766e" : "transparent",
    color: active ? "#fff" : "#111827",
    fontWeight: active ? 900 : 700,
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    nav("/");
  };

  return (
    <div
      style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#0f766e",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            👨‍🏫
          </div>
          <div>
            <div style={{ fontWeight: 900 }}>Professor Portal</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Teaching Overview
            </div>
          </div>
        </div>

        {/* Profile tab */}
        <div
          style={itemStyle(isActive("/professor/profile"))}
          onClick={() => nav("/professor/profile")}
        >
          <span>My Profile</span>
        </div>

        <div
          style={itemStyle(isActive("/professor"))}
          onClick={() => nav("/professor")}
        >
          Dashboard
        </div>

        <div
          style={itemStyle(isActive("/professor/classes"))}
          onClick={() => nav("/professor/classes")}
        >
          My Classes
        </div>

        <div
          style={itemStyle(isActive("/professor/grades"))}
          onClick={() => nav("/professor/grades")}
        >
          Enter Grades
        </div>

        <div
          style={itemStyle(isActive("/professor/attendance"))}
          onClick={() => nav("/professor/attendance")}
        >
          Attendance
        </div>

        <div
          style={itemStyle(isActive("/professor/announcements"))}
          onClick={() => nav("/professor/announcements")}
        >
          Announcements
        </div>
        <div
          style={itemStyle(isActive("/professor/reports"))}
          onClick={() => nav("/professor/reports")}
        >
          Reports
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, background: "#f5f7fb" }}>
        {/* Top bar */}
        <div
          style={{
            height: 64,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "0 18px",
            gap: 10,
          }}
        >
          <button
            onClick={logout}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              padding: "8px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Logout
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
