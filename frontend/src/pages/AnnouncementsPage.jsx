import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const token = useMemo(() => localStorage.getItem("token"), []);
  const authHeaders = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  useEffect(() => {
    api
      .get("/announcements", authHeaders)
      .then((res) => setItems(res.data || []))
      .catch((e) => setErr(e.response?.data?.message || e.message));
  }, [authHeaders]);

  if (err) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;

  return (
    <div style={{ padding: 18, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>
        All Announcements
      </h1>

      <div style={{ display: "grid", gap: 12 }}>
        {items.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No announcements yet.</div>
        ) : (
          items.map((a) => (
            <div
              key={a.announcement_id}
              style={{
                background: "#fff",
                border: "1px solid #eef2f7",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
              </div>
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
