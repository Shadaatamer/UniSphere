import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import StudentChatbotWidget from "../components/StudentChatbotWidget";

export default function StudentLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeFlags, setActiveFlags] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);

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
    gap: 8,
  });

  const pillStyle = (highlight) => ({
    minWidth: 22,
    height: 22,
    padding: "0 7px",
    borderRadius: 999,
    background: highlight ? "#dc2626" : "#e5e7eb",
    color: highlight ? "#fff" : "#374151",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1,
  });

  const isActive = (path) => {
    if (path === "/student") {
      return location.pathname === "/student";
    }
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  useEffect(() => {
    let mounted = true;

    const loadHeaderData = async () => {
      try {
        const [notificationRes, conversationRes, academicRes] =
          await Promise.all([
            api.get("/notifications?limit=6"),
            api.get("/messages/conversations"),
            api.get("/academic-monitoring/my-flags"),
          ]);

        if (!mounted) return;

        const notificationPayload = notificationRes.data || {};
        const conversationPayload = conversationRes.data || {};
        const academicPayload = academicRes.data || {};

        setNotifications(notificationPayload.notifications || []);
        setUnreadNotifications(Number(notificationPayload.unreadCount || 0));
        setUnreadMessages(
          (conversationPayload.conversations || []).reduce(
            (sum, convo) => sum + Number(convo.unread_count || 0),
            0,
          ),
        );
        setActiveFlags(Number(academicPayload.activeCount || 0));
      } catch {
        if (!mounted) return;
        setNotifications([]);
        setUnreadNotifications(0);
        setUnreadMessages(0);
      }
    };

    loadHeaderData();
    const timer = setInterval(loadHeaderData, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [location.pathname]);

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
    setNotificationOpen(false);
  }, [location.pathname]);

  const openNotification = async (notification) => {
    try {
      if (!notification.is_read) {
        await api.patch(`/notifications/${notification.notification_id}/read`);
        setNotifications((current) =>
          current.map((item) =>
            item.notification_id === notification.notification_id
              ? { ...item, is_read: true }
              : item,
          ),
        );
        setUnreadNotifications((current) => Math.max(0, current - 1));
      }
    } catch {}

    setNotificationOpen(false);
    if (notification.route) {
      nav(notification.route);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true })),
      );
      setUnreadNotifications(0);
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    nav("/");
  };

  const sidebar = (
    <aside
      className="student-sidebar"
      style={{
        width: isMobile ? "min(82vw, 320px)" : 260,
        background: "#fff",
        borderRight: "1px solid #e5e7eb",
        padding: 18,
        boxSizing: "border-box",
        position: isMobile ? "fixed" : "static",
        inset: isMobile ? "0 auto 0 0" : "auto",
        zIndex: isMobile ? 40 : "auto",
        transform:
          isMobile && !mobileNavOpen ? "translateX(-100%)" : "translateX(0)",
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
        style={itemStyle(isActive("/student/assignments"))}
        onClick={() => nav("/student/assignments")}
      >
        <span>Assignments</span>
      </div>

      <div
        style={itemStyle(isActive("/student/grades"))}
        onClick={() => nav("/student/grades")}
      >
        <span>Grades</span>
      </div>

      <div
        style={itemStyle(isActive("/student/academic-status"))}
        onClick={() => nav("/student/academic-status")}
      >
        <span>Academic Status</span>
        {activeFlags > 0 ? (
          <span style={pillStyle(true)}>{activeFlags}</span>
        ) : null}
      </div>

      <div
        style={itemStyle(isActive("/student/messages"))}
        onClick={() => nav("/student/messages")}
      >
        <span>Messages</span>
        {unreadMessages > 0 ? (
          <span style={pillStyle(false)}>{unreadMessages}</span>
        ) : null}
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

      <div
        style={itemStyle(isActive("/student/announcements"))}
        onClick={() => nav("/student/announcements")}
      >
        <span>Announcements</span>
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

      <div className="student-main" style={{ flex: 1, background: "#f5f7fb" }}>
        <div
          className="student-topbar"
          style={{
            height: 64,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: isMobile ? "0 12px" : "0 18px",
            gap: 10,
            position: "relative",
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
            onClick={() => setNotificationOpen((open) => !open)}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              padding: "8px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
              position: "relative",
            }}
          >
            Notifications
            {unreadNotifications > 0 ? (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  minWidth: 20,
                  height: 20,
                  padding: "0 6px",
                  borderRadius: 999,
                  background: "#dc2626",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                {unreadNotifications}
              </span>
            ) : null}
          </button>

          {notificationOpen ? (
            <div
              style={{
                position: "absolute",
                right: isMobile ? 12 : 112,
                top: 56,
                width: isMobile ? "calc(100vw - 24px)" : 360,
                maxWidth: 360,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
                zIndex: 30,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <strong>Notifications</strong>
                <button
                  onClick={markAllNotificationsRead}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#1d4ed8",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Mark all read
                </button>
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: 18, color: "#6b7280", fontSize: 14 }}>
                  No notifications yet.
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.notification_id}
                    onClick={() => openNotification(notification)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderBottom: "1px solid #f9fafb",
                      background: notification.is_read ? "#fff" : "#eff6ff",
                      padding: "12px 16px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        color: "#111827",
                        marginBottom: 4,
                      }}
                    >
                      {notification.title}
                    </div>
                    <div
                      style={{
                        color: "#4b5563",
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                    >
                      {notification.body}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </button>
                ))
              )}
            </div>
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

        <div
          className="student-content"
          style={{ padding: isMobile ? 12 : 24 }}
        >
          <Outlet />
        </div>
      </div>
      <StudentChatbotWidget />
    </div>
  );
}
