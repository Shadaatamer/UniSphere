// frontend/src/pages/ProfessorPage.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";
import RecentAnnouncementsCard from "../components/RecentAnnouncementsCard";

function Card({ children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 16,
        boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
        border: "1px solid #eef2f7",
      }}
    >
      {children}
    </div>
  );
}

export default function ProfessorPage() {
  const [data, setData] = useState({
    header: { title: "Professor Dashboard", subtitle: "", department: "" },
    stats: [],
    quickActions: [],
    todaySchedule: [],
    submissions: [],
    coursePerformance: [],
    pendingTasks: [],
  });

  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    api
      .get("/professor/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData((prev) => ({ ...prev, ...res.data })))
      .catch((e) => setErr(e.response?.data?.message || e.message));
  }, []);

  if (err) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(90deg,#0f766e,#14b8a6)",
          padding: "20px 22px",
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {data.header.title}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {data.header.subtitle}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              padding: "8px 12px",
              borderRadius: 12,
              fontSize: 12,
            }}
          >
            {data.header.department}
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 18,
          display: "grid",
          gap: 14,
        }}
      >
        {/* Stats Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 14,
          }}
        >
          {(data.stats || []).map((s) => (
            <Card key={s.label}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>
                {s.value}
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Quick Actions</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
            }}
          >
            {(data.quickActions || []).map((a, idx) => (
              <button
                key={a.key || idx}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: "12px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                  color: "#fff",
                  background:
                    idx === 0
                      ? "#0ea5e9"
                      : idx === 1
                        ? "#22c55e"
                        : idx === 2
                          ? "#a855f7"
                          : "#f59e0b",
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Today + Recent Announcements (like your screenshot) */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <Card>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>
              Today's Classes
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {(data.todaySchedule || []).map((c, idx) => (
                <div
                  key={`${c.course}-${idx}`}
                  style={{
                    border: "1px solid #eef2f7",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{c.course}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {c.time} • {c.location} • {c.students ?? "-"} students
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <RecentAnnouncementsCard viewAllPath="/professor/announcements" />
        </div>

        {/* Submissions + Performance */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <Card>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>
              Recent Submissions
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {(data.submissions || []).map((s, idx) => (
                <div
                  key={`${s.title}-${idx}`}
                  style={{
                    border: "1px solid #eef2f7",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{s.title}</div>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {s.when}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {s.meta}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>
              Course Performance
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {(data.coursePerformance || []).map((p, idx) => (
                <div key={`${p.course}-${idx}`}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 900 }}>{p.course}</span>
                    <span style={{ color: "#6b7280" }}>Avg {p.avg}%</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "#eef2f7",
                      borderRadius: 999,
                      marginTop: 6,
                    }}
                  >
                    <div
                      style={{
                        height: 8,
                        width: `${p.avg || 0}%`,
                        background: "#111827",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Pending Tasks */}
        <Card>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Pending Tasks</div>
          <div style={{ display: "grid", gap: 10 }}>
            {(data.pendingTasks || []).map((t, idx) => (
              <div
                key={`${t.title}-${idx}`}
                style={{
                  border: "1px solid #eef2f7",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div style={{ fontWeight: 900 }}>{t.title}</div>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 10px",
                      borderRadius: 999,
                      background: "#fef3c7",
                    }}
                  >
                    {t.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
