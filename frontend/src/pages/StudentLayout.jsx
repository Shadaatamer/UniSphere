import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  User,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  GraduationCap,
  AlertTriangle,
  Bot,
  MessageSquare,
  CreditCard,
  CalendarDays,
  CheckSquare,
  FileText,
  Megaphone,
  Bell,
  Menu,
  LogOut,
} from "lucide-react";
import api from "../services/api";

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

  const navItems = [
    {
      label: "My Profile",
      path: "/student/profile",
      icon: User,
    },
    {
      label: "Dashboard",
      path: "/student",
      icon: LayoutDashboard,
    },
    {
      label: "My Courses",
      path: "/student/courses",
      icon: BookOpen,
    },
    {
      label: "Assignments",
      path: "/student/assignments",
      icon: ClipboardList,
    },
    {
      label: "Grades",
      path: "/student/grades",
      icon: GraduationCap,
    },
    {
      label: "Academic Status",
      path: "/student/academic-status",
      icon: AlertTriangle,
      badge: activeFlags,
      danger: true,
    },
    {
      label: "AI Assistant",
      path: "/student/assistant",
      icon: Bot,
    },
    {
      label: "Messages",
      path: "/student/messages",
      icon: MessageSquare,
      badge: unreadMessages,
    },
    {
      label: "Fees",
      path: "/student/fees",
      icon: CreditCard,
    },
    {
      label: "Exam Schedule",
      path: "/student/exams",
      icon: CalendarDays,
    },
    {
      label: "Attendance",
      path: "/student/attendance",
      icon: CheckSquare,
    },
    {
      label: "Transcript",
      path: "/student/transcript",
      icon: FileText,
    },
    {
      label: "Announcements",
      path: "/student/announcements",
      icon: Megaphone,
    },
  ];

  const sidebar = (
    <aside
      className={`sidebar ${isMobile && !mobileNavOpen ? "sidebar-hidden" : ""}`}
    >
      <div className="sidebar-brand">
        <div className="sidebar-logo">🎓</div>
        <div>
          <h2 className="sidebar-title">Student Portal</h2>
          <p className="sidebar-subtitle">Academic Dashboard</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              className={`nav-item ${active ? "active" : ""}`}
              onClick={() => nav(item.path)}
            >
              <span className="nav-label">
                <Icon size={18} />
                {item.label}
              </span>

              {item.badge > 0 ? (
                <span className={`badge ${item.danger ? "danger" : ""}`}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="app-shell">
      {isMobile && mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      {sidebar}

      <main className="main-area">
        <header className="topbar">
          {isMobile ? (
            <button
              type="button"
              className="btn"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <Menu size={18} />
              Menu
            </button>
          ) : null}

          <div className="topbar-actions">
            <div className="notification-wrapper">
              <button
                type="button"
                className="btn notification-button"
                onClick={() => setNotificationOpen((open) => !open)}
              >
                <Bell size={18} />
                Notifications
                {unreadNotifications > 0 ? (
                  <span className="notification-count">
                    {unreadNotifications}
                  </span>
                ) : null}
              </button>

              {notificationOpen ? (
                <div className="notification-menu">
                  <div className="notification-header">
                    <strong>Notifications</strong>

                    <button
                      type="button"
                      className="link-button"
                      onClick={markAllNotificationsRead}
                    >
                      Mark all read
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="empty-state">No notifications yet.</div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.notification_id}
                        onClick={() => openNotification(notification)}
                        className={`notification-item ${
                          notification.is_read ? "" : "unread"
                        }`}
                      >
                        <div className="notification-title">
                          {notification.title}
                        </div>

                        <div className="notification-body">
                          {notification.body}
                        </div>

                        <div className="notification-date">
                          {new Date(notification.created_at).toLocaleString()}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <button type="button" className="btn btn-danger" onClick={logout}>
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
