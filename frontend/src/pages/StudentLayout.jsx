import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function StudentLayout() {
  const nav = useNavigate();
  const location = useLocation();

  const itemStyle = (active) => ({
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    marginBottom: 8,
    background: active ? "#1d4ed8" : "transparent",
    color: active ? "#fff" : "#111827",
    fontWeight: active ? 900 : 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  });

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

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
      {/* SIDEBAR */}
      <aside
        className="student-sidebar"
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
              background: "#1d4ed8",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            🎓
          </div>
          <div>
            <div style={{ fontWeight: 900 }}>Student Portal</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Academic Dashboard
            </div>
          </div>
        </div>
        {/* Profile tab */}
        <div
          style={itemStyle(isActive("/student/profile"))}
          onClick={() => nav("/student/profile")}
        >
          <span>My Profile</span>
        </div>

        <div
          style={itemStyle(isActive("/student"))}
          onClick={() => nav("/student")}
        >
          <span>Dashboard</span>
        </div>

        <div
          style={itemStyle(isActive("/student/courses"))}
          onClick={() => nav("/student/courses")}
        >
          <span>My Courses</span>
        </div>

        <div
          style={itemStyle(isActive("/student/grades"))}
          onClick={() => nav("/student/grades")}
        >
          <span>Grades</span>
        </div>

        <div
          style={itemStyle(isActive("/student/fees"))}
          onClick={() => nav("/student/fees")}
        >
          <span>Fees</span>
        </div>

        <div
          style={itemStyle(isActive("/student/exams"))}
          onClick={() => nav("/student/exams")}
        >
          <span>Exam Schedule</span>
        </div>

        <div
          style={itemStyle(isActive("/student/attendance"))}
          onClick={() => nav("/student/attendance")}
        >
          <span>Attendance</span>
        </div>

        <div
          style={itemStyle(isActive("/student/transcript"))}
          onClick={() => nav("/student/transcript")}
        >
          <span>Transcript</span>
        </div>

        {/* Announcements tab */}
        <div
          style={itemStyle(isActive("/student/announcements"))}
          onClick={() => nav("/student/announcements")}
        >
          <span>Announcements</span>
        </div>
      </aside>

      {/* MAIN */}
      <div className="student-main" style={{ flex: 1, background: "#f5f7fb" }}>
        {/* TOP BAR */}
        <div
          className="student-topbar"
          style={{
            height: 64,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
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

        {/* PAGE CONTENT */}
        <div className="student-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
