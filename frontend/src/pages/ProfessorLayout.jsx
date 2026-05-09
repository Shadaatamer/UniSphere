import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function ProfessorLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);

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

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const sidebar = (
    <aside
      style={{
        width: isMobile ? "min(82vw, 320px)" : 260,
        background: "#fff",
        borderRight: "1px solid #e5e7eb",
        padding: 18,
        boxSizing: "border-box",
        position: isMobile ? "fixed" : "static",
        inset: isMobile ? "0 auto 0 0" : "auto",
        zIndex: isMobile ? 40 : "auto",
        transform: isMobile && !mobileNavOpen ? "translateX(-100%)" : "translateX(0)",
        transition: "transform 0.2s ease",
        overflowY: "auto",
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
        style={itemStyle(isActive("/professor/assignments"))}
        onClick={() => nav("/professor/assignments")}
      >
        Assignments
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
      <div
        style={itemStyle(isActive("/professor/messages"))}
        onClick={() => nav("/professor/messages")}
      >
        Messages
      </div>
    </aside>
  );

  return (
    <div
      style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}
    >
      {isMobile ? (
        <>
          {mobileNavOpen ? (
            <button
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.4)",
                border: "none",
                zIndex: 30,
              }}
            />
          ) : null}
          {sidebar}
        </>
      ) : (
        sidebar
      )}

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
            padding: isMobile ? "0 12px" : "0 18px",
            gap: 10,
            flexWrap: isMobile ? "wrap" : "nowrap",
            minHeight: 64,
          }}
        >
          {isMobile ? (
            <button
              onClick={() => setMobileNavOpen((open) => !open)}
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                padding: "8px 12px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
                marginRight: "auto",
              }}
            >
              Menu
            </button>
          ) : null}
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

        <div style={{ padding: isMobile ? 12 : 18 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
