import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/admin/dashboard", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setData(res.data))
      .catch((e) => setErr(e.response?.data?.message || e.message));
  }, []);

  if (err) return <div style={{ color: "crimson" }}>{err}</div>;
  if (!data) return <div>Loading…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: "8px 0 4px" }}>
        {data.header.title}
      </h1>
      <div style={{ color: "#6b7280", marginBottom: 18 }}>
        {data.header.subtitle}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {data.topStats.map((s) => (
          <div
            key={s.key}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 900 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 10 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
              {s.badge}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}
      >
        <div style={card()}>
          <div style={{ fontWeight: 900, marginBottom: 14 }}>
            Students by Department
          </div>
          {data.studentsByDepartment.map((d) => (
            <div key={d.name} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                <div>{d.name}</div>
                <div>{d.students} students</div>
              </div>
              <div
                style={{ height: 8, borderRadius: 999, background: "#e5e7eb" }}
              >
                <div
                  style={{
                    height: 8,
                    width: "60%",
                    borderRadius: 999,
                    background: "#2563eb",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={card()}>
          <div style={{ fontWeight: 900, marginBottom: 14 }}>
            Recent Activity
          </div>
          {data.recentActivity.map((a, i) => (
            <div
              key={i}
              style={{
                background: "#f8fafc",
                border: "1px solid #eef2f7",
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 13 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {a.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function card() {
  return {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
  };
}
