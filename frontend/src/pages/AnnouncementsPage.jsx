import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState("global");
  const [err, setErr] = useState("");

  const token = useMemo(() => localStorage.getItem("token"), []);
  const authHeaders = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  useEffect(() => {
    api
      .get("/student/announcements", authHeaders)
      .then((res) => setItems(res.data || []))
      .catch((e) => setErr(e.response?.data?.message || e.message));
  }, [authHeaders]);

  if (err) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;

  const filteredItems = items.filter((a) =>
    activeTab === "global" ? a.source === "global" : a.source === "course",
  );

  return (
    <div style={{ padding: 18, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>
        All Announcements
      </h1>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          background: "#f3f4f6",
          padding: 6,
          borderRadius: 10,
          width: "fit-content",
        }}
      >
        <button
          onClick={() => setActiveTab("global")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 13,
            background: activeTab === "global" ? "#1d4ed8" : "transparent",
            color: activeTab === "global" ? "#fff" : "#374151",
          }}
        >
          Global
        </button>
        <button
          onClick={() => setActiveTab("course")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 13,
            background: activeTab === "course" ? "#166534" : "transparent",
            color: activeTab === "course" ? "#fff" : "#374151",
          }}
        >
          Course
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {filteredItems.length === 0 ? (
          <div style={{ color: "#6b7280" }}>
            {activeTab === "global"
              ? "No global announcements yet."
              : "No course announcements yet."}
          </div>
        ) : (
          filteredItems.map((a) => (
            <div
              key={`${a.source}-${a.id}-${a.created_at}`}
              style={{
                background: "#fff",
                border: "1px solid #eef2f7",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>{a.title}</div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: a.source === "course" ? "#dcfce7" : "#dbeafe",
                    color: a.source === "course" ? "#166534" : "#1d4ed8",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.source === "course"
                    ? `Course${a.course_code ? `: ${a.course_code}` : ""}`
                    : "Global"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
              </div>
              {a.source === "course" && (a.course_name || a.class_id) && (
                <div style={{ fontSize: 12, color: "#065f46", marginTop: 6, fontWeight: 700 }}>
                  {a.course_name || "Course Announcement"}
                </div>
              )}
              <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                {a.body}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
