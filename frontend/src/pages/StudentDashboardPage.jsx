import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function StudentDashboardPage() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");
  const [err, setErr] = useState("");
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
  }, [token]);

  function goQuickAction(key) {
    if (key === "courses") nav("/student/courses");
    if (key === "grades") nav("/student/grades");
    if (key === "exams") nav("/student/exams");
    if (key === "transcript") nav("/student/transcript");
  }

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {(data.stats || []).map((s) => (
            <Card key={s.label}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>{s.value}</div>
            </Card>
          ))}
        </div>

        <Card>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {(data.quickActions || []).map((a, idx) => (
              <button
                key={a.key || idx}
                onClick={() => goQuickAction(a.key)}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: "12px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                  color: "#fff",
                  background: idx === 0 ? "#2563eb" : idx === 1 ? "#22c55e" : "#a855f7",
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card>
            <div style={{ fontWeight: 900, marginBottom: 12 }}>My Schedule</div>
            <div style={{ display: "grid", gap: 10 }}>
              {(data.schedule || []).map((c, idx) => (
                <div
                  key={c.course || idx}
                  style={{ border: "1px solid #eef2f7", borderRadius: 12, padding: 12 }}
                >
                  <div style={{ fontWeight: 900 }}>{c.course}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {c.time} • {c.location}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <RecentAnnouncementsCard viewAllPath="/student/announcements" />
        </div>
      </div>
    </div>
  );
}
