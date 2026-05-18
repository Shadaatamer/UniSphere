import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import RecentAnnouncementsCard from "../components/RecentAnnouncementsCard";

export default function StudentDashboardPage() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const [err, setErr] = useState("");
  const [activeFlags, setActiveFlags] = useState(0);
  const [data, setData] = useState({
    header: { title: "Student Portal", subtitle: "" },
    stats: [],
    quickActions: [],
    schedule: [],
  });

  useEffect(() => {
    api
      .get("/student/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData((prev) => ({ ...prev, ...res.data })))
      .catch((e) => setErr(e.response?.data?.message || e.message));

    api
      .get("/academic-monitoring/my-flags", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setActiveFlags(Number(res.data?.activeCount || 0)))
      .catch(() => setActiveFlags(0));
  }, [token]);

  function goQuickAction(key) {
    if (key === "courses") nav("/student/courses");
    if (key === "grades") nav("/student/grades");
    if (key === "exams") nav("/student/exams");
    if (key === "transcript") nav("/student/transcript");
    if (key === "academic-status") nav("/student/academic-status");
  }

  if (err) {
    return <div className="error-message">{err}</div>;
  }

  return (
    <div>
      <section className="dashboard-hero">
        <div>
          <h1>{data?.header?.title || "Student Dashboard"}</h1>
          <p>{data?.header?.subtitle || "Here’s your academic overview"}</p>
        </div>
      </section>

      <section className="stats-grid">
        {(data.stats || []).map((stat) => (
          <div className="stat-card" key={stat.label}>
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </section>

      {activeFlags > 0 ? (
        <section className="alert-card">
          <div>
            <h2>Academic monitoring is active on your account</h2>
            <p>
              {activeFlags} active flag{activeFlags > 1 ? "s" : ""} need your
              attention.
            </p>
          </div>

          <button
            type="button"
            className="action-button danger"
            onClick={() => nav("/student/academic-status")}
          >
            View Academic Status
          </button>
        </section>
      ) : null}

      <section className="quick-actions">
        <h2>Quick Actions</h2>

        <div className="quick-action-grid">
          {(data.quickActions || []).map((action, index) => (
            <button
              key={action.key || index}
              type="button"
              onClick={() => goQuickAction(action.key)}
              className={
                index === 0
                  ? "action-button primary"
                  : index === 1
                    ? "action-button secondary"
                    : "action-button accent"
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2 className="dashboard-panel-title">My Schedule</h2>
          </div>

          <div>
            {(data.schedule || []).map((course, index) => (
              <div className="list-card" key={course.course || index}>
                <p className="list-card-title">{course.course}</p>
                <p className="list-card-subtitle">
                  {course.time} • {course.location}
                </p>
              </div>
            ))}
          </div>
        </div>

        <RecentAnnouncementsCard viewAllPath="/student/announcements" />
      </section>
    </div>
  );
}
