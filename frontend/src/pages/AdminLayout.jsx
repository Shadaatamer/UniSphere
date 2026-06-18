import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import api from "../services/api";

export default function AdminLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const [pendingTranscriptCount, setPendingTranscriptCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);
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

  //  Better active logic: highlights on nested routes too
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    nav("/");
  };

  const navItems = [
    { label: "My Profile", path: "/admin/profile" },
    { label: "Dashboard", path: "/admin", exact: true },
    { label: "User Management", path: "/admin/users" },
    { label: "Announcements", path: "/admin/announcements" },
    { label: "Course Management", path: "/admin/courses" },
    { label: "Predictive Analytics", path: "/admin/predictive-analytics" },
    { label: "Academic Monitoring", path: "/admin/academic-monitoring" },
    { label: "Messages", path: "/admin/messages" },
    { label: "Requests", path: "/admin/requests", badge: pendingTranscriptCount },
  ];

  const sidebar = (
    <aside
      className={`sidebar ${isMobile && !mobileNavOpen ? "sidebar-hidden" : ""}`}
    >
      <div className="sidebar-brand">
        <div className="sidebar-logo">🛡️</div>
        <div>
          <h2 className="sidebar-title">Admin Portal</h2>
          <p className="sidebar-subtitle">Faculty of Engineering</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const active = item.exact
            ? location.pathname === item.path
            : isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              className={`nav-item admin ${active ? "active" : ""}`}
              onClick={() => nav(item.path)}
            >
              <span className="nav-label">{item.label}</span>
              {item.badge > 0 ? <span className="badge">{item.badge}</span> : null}
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

          <button type="button" className="btn btn-danger" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
