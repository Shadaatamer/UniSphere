import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function RecentAnnouncementsCard({
  viewAllPath,
  title = "Recent Announcements",
  limit = 3,
}) {
  const nav = useNavigate();
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
      .then((res) => {
        const all = res.data || [];
        setItems(all.slice(0, limit));
      })
      .catch((e) => setErr(e.response?.data?.message || e.message));
  }, [authHeaders, limit]);

  return (
    <div style={card()}>
      <div style={headerRow()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        </div>

        <button
          onClick={() => nav(viewAllPath)}
          style={viewAllBtn()}
          type="button"
        >
          View All
        </button>
      </div>

      {err ? (
        <div style={{ color: "crimson", marginTop: 10 }}>{err}</div>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {items.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            No announcements yet.
          </div>
        ) : (
          items.map((a) => (
            <div key={a.announcement_id} style={itemCard()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900 }}>{a.title}</div>
                <span style={pill()}>Notice</span>
              </div>

              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                {a.created_at ? timeAgo(a.created_at) : ""}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function card() {
  return {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  };
}

function headerRow() {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
}

function viewAllBtn() {
  return {
    border: 0,
    background: "transparent",
    color: "#2563eb",
    fontWeight: 900,
    cursor: "pointer",
    padding: 0,
  };
}

function itemCard() {
  return {
    border: "1px solid #eef2f7",
    borderRadius: 14,
    padding: 14,
    background: "#fbfbfc",
  };
}

function pill() {
  return {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 900,
  };
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return `${days} days ago`;
}
