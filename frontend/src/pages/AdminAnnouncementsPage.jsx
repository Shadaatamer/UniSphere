import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const fetchAnnouncements = () => {
    api
      .get("/announcements/all", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAnnouncements(res.data))
      .catch((e) =>
        setError(e.response?.data?.message || "Failed to load announcements"),
      );
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const createAnnouncement = (e) => {
    e.preventDefault();

    api
      .post(
        "/announcements",
        { title, body, is_published: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .then(() => {
        setTitle("");
        setBody("");
        fetchAnnouncements();
      })
      .catch((e) =>
        setError(e.response?.data?.message || "Failed to create announcement"),
      );
  };

  const deleteAnnouncement = (id) => {
    api
      .delete(`/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => fetchAnnouncements())
      .catch((e) => setError(e.response?.data?.message || "Delete failed"));
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>
        Manage Announcements
      </h1>

      {error && (
        <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>
      )}

      {/* Create Form */}
      <form
        onSubmit={createAnnouncement}
        style={{
          background: "#fff",
          padding: 16,
          borderRadius: 12,
          marginBottom: 20,
          border: "1px solid #e5e7eb",
        }}
      >
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            marginBottom: 10,
          }}
        />

        <textarea
          placeholder="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            marginBottom: 10,
          }}
        />

        <button
          type="submit"
          style={{
            background: "#ea580c",
            color: "#fff",
            border: 0,
            padding: "10px 16px",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Post Announcement
        </button>
      </form>

      {/* List */}
      <div style={{ display: "grid", gap: 12 }}>
        {announcements.map((a) => (
          <div
            key={a.announcement_id}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              {new Date(a.created_at).toLocaleString()}
            </div>
            <div style={{ marginTop: 8 }}>{a.body}</div>

            <button
              onClick={() => deleteAnnouncement(a.announcement_id)}
              style={{
                marginTop: 10,
                background: "#dc2626",
                color: "#fff",
                border: 0,
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
