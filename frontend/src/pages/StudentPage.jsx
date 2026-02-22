// frontend/src/pages/StudentPage.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";

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

export default function StudentPage() {
  const [data, setData] = useState({
    header: { title: "Student Portal", subtitle: "", studentName: "" },
    stats: [],
    quickActions: [],
    schedule: [],
    announcements: [],
    courseProgress: [],
    deadlines: [],
  });

  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    api
      .get("/student/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData((prev) => ({ ...prev, ...res.data })))
      .catch((e) => setErr(e.response?.data?.message || e.message));
  }, []);

  if (err) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;

  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          background: "linear-gradient(90deg,#1d4ed8,#2563eb)",
          padding: "20px 22px",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900 }}>
          {data?.header?.title || "Student Dashboard"}
        </div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          {data?.header?.subtitle || "Here’s your academic overview"}
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
        {/* Stats */}
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
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 12,
            }}
          >
            {(data.quickActions || []).map((a, idx) => (
              <button
                key={a.key || a.label || idx}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: "12px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                  color: "#fff",
                  background:
                    idx === 0 ? "#2563eb" : idx === 1 ? "#22c55e" : "#a855f7",
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Schedule + Announcements */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <Card>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>My Schedule</div>
            <div style={{ display: "grid", gap: 10 }}>
              {(data.schedule || []).map((c, idx) => (
                <div
                  key={c.course || idx}
                  style={{
                    border: "1px solid #eef2f7",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{c.course}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {c.time} • {c.location}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>
              Recent Announcements
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {(data.announcements || []).map((a, idx) => (
                <div
                  key={a.title || idx}
                  style={{
                    border: "1px solid #eef2f7",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {a.when}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Progress + Deadlines */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <Card>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>
              Course Progress
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {(data.courseProgress || []).map((p, idx) => (
                <div key={p.course || idx}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 900 }}>{p.course}</span>
                    <span style={{ color: "#6b7280" }}>{p.progress}%</span>
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
                        width: `${p.progress || 0}%`,
                        background: "#111827",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>
              Upcoming Deadlines
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {(data.deadlines || []).map((d, idx) => (
                <div
                  key={d.title || idx}
                  style={{
                    border: "1px solid #eef2f7",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {d.when}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
