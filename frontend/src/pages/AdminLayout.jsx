import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AdminLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const [pendingTranscriptCount, setPendingTranscriptCount] = useState(0);
  const token = useMemo(() => localStorage.getItem("token"), []);

  useEffect(() => {
    api
      .get("/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const stats = res.data?.topStats || [];
        const pending = stats.find((s) => s.key === "transcripts")?.value ?? 0;
        setPendingTranscriptCount(Number(pending) || 0);
      })
      .catch(() => {
        setPendingTranscriptCount(0);
      });
  }, [token]);

  const itemStyle = (active) => ({
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    marginBottom: 8,
    background: active ? "#ea580c" : "transparent",
    color: active ? "#fff" : "#111827",
    fontWeight: active ? 900 : 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  });
  const countBadgeStyle = {
    background: "#ea580c",
    color: "#fff",
    minWidth: 22,
    height: 22,
    padding: "0 7px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    marginLeft: 8,
  };

  //  Better active logic: highlights on nested routes too
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
      {/* SIDEBAR IN ADMIN */}
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
              background: "#ea580c",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ fontWeight: 900 }}>Admin Portal</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Faculty of Engineering
            </div>
          </div>
        </div>

        {/* Profile tab */}
        <div
          style={itemStyle(isActive("/admin/profile"))}
          onClick={() => nav("/admin/profile")}
        >
          <span>My Profile</span>
        </div>

        <div
          style={itemStyle(location.pathname === "/admin")}
          onClick={() => nav("/admin")}
        >
          <span>Dashboard</span>
        </div>

        <div
          style={itemStyle(isActive("/admin/users"))}
          onClick={() => nav("/admin/users")}
        >
          {/* Optional rename */}
          <span>User Management</span>
        </div>

        {/*  Announcements tab */}
        <div
          style={itemStyle(isActive("/admin/announcements"))}
          onClick={() => nav("/admin/announcements")}
        >
          <span>Announcements</span>
        </div>

        <div
          style={itemStyle(isActive("/admin/courses"))}
          onClick={() => nav("/admin/courses")}
        >
          <span>Course Management</span>
        </div>
        <div
          style={itemStyle(isActive("/admin/predictive-analytics"))}
          onClick={() => nav("/admin/predictive-analytics")}
        >
          <span>Predictive Analytics</span>
        </div>
        <div
          style={itemStyle(isActive("/admin/messages"))}
          onClick={() => nav("/admin/messages")}
        >
          <span>Messages</span>
        </div>

        <div
          style={itemStyle(isActive("/admin/requests"))}
          onClick={() => nav("/admin/requests")}
        >
          <span>Requests</span>
          {pendingTranscriptCount > 0 ? (
            <span style={countBadgeStyle}>{pendingTranscriptCount}</span>
          ) : null}
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, background: "#f5f7fb" }}>
        {/* TOP BAR */}
        <div
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

        {/* ALL ADMIN PAGES RENDER HERE */}
        <div style={{ padding: 24, maxWidth: 1150 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
