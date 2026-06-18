import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";

export default function ProfessorLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);

  const isActive = (path) => {
    if (path === "/professor") return location.pathname === "/professor";
    return location.pathname.startsWith(path);
  };

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

  const navItems = [
    { label: "My Profile", path: "/professor/profile" },
    { label: "Dashboard", path: "/professor", exact: true },
    { label: "My Classes", path: "/professor/classes" },
    { label: "Enter Grades", path: "/professor/grades" },
    { label: "Attendance", path: "/professor/attendance" },
    { label: "Assignments", path: "/professor/assignments" },
    { label: "Announcements", path: "/professor/announcements" },
    { label: "Reports", path: "/professor/reports" },
    { label: "Messages", path: "/professor/messages" },
  ];

  const sidebar = (
    <aside
      className={`sidebar ${isMobile && !mobileNavOpen ? "sidebar-hidden" : ""}`}
    >
      <div className="sidebar-brand">
        <div className="sidebar-logo">👨‍🏫</div>
        <div>
          <h2 className="sidebar-title">Professor Portal</h2>
          <p className="sidebar-subtitle">Teaching Overview</p>
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
              className={`nav-item professor ${active ? "active" : ""}`}
              onClick={() => nav(item.path)}
            >
              <span className="nav-label">{item.label}</span>
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
