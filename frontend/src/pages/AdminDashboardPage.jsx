import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  // ✅ Announcements state
  const [aErr, setAErr] = useState("");
  const [loadingA, setLoadingA] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  const [newA, setNewA] = useState({
    title: "",
    body: "",
    is_published: true,
  });

  const token = useMemo(() => localStorage.getItem("token"), []);
  const authHeaders = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  useEffect(() => {
    api
      .get("/admin/dashboard", authHeaders)
      .then((res) => setData(res.data))
      .catch((e) => setErr(e.response?.data?.message || e.message));
  }, [authHeaders]);

  const fetchAnnouncements = async () => {
    try {
      setLoadingA(true);
      setAErr("");
      // ✅ Admin endpoint (published + unpublished)
      const res = await api.get("/announcements/all", authHeaders);
      setAnnouncements(res.data || []);
    } catch (e) {
      setAErr(e.response?.data?.message || e.message);
    } finally {
      setLoadingA(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createAnnouncement = async (e) => {
    e.preventDefault();
    try {
      setAErr("");
      if (!newA.title.trim() || !newA.body.trim()) {
        setAErr("Title and message are required.");
        return;
      }

      await api.post("/announcements", newA, authHeaders);

      setNewA({ title: "", body: "", is_published: true });
      fetchAnnouncements();
    } catch (e2) {
      setAErr(e2.response?.data?.message || e2.message);
    }
  };

  const togglePublish = async (a) => {
    try {
      setAErr("");
      await api.put(
        `/announcements/${a.announcement_id}`,
        { is_published: !a.is_published },
        authHeaders,
      );
      fetchAnnouncements();
    } catch (e) {
      setAErr(e.response?.data?.message || e.message);
    }
  };

  const deleteAnnouncement = async (a) => {
    const ok = window.confirm("Delete this announcement?");
    if (!ok) return;

    try {
      setAErr("");
      await api.delete(`/announcements/${a.announcement_id}`, authHeaders);
      fetchAnnouncements();
    } catch (e) {
      setAErr(e.response?.data?.message || e.message);
    }
  };

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

      {/* ✅ NEW: Global Announcements Manager */}
      <div style={{ marginTop: 14, ...card() }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>
              Global Announcements
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Create announcements visible to all students & professors.
            </div>
          </div>

          <button
            onClick={fetchAnnouncements}
            style={btnOutline()}
            disabled={loadingA}
          >
            {loadingA ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {aErr ? (
          <div style={{ color: "crimson", marginTop: 10 }}>{aErr}</div>
        ) : null}

        <form onSubmit={createAnnouncement} style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <input
              value={newA.title}
              onChange={(e) =>
                setNewA((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Announcement title"
              style={input()}
            />

            <textarea
              value={newA.body}
              onChange={(e) => setNewA((p) => ({ ...p, body: e.target.value }))}
              placeholder="Announcement message"
              rows={4}
              style={{ ...input(), resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!newA.is_published}
                  onChange={(e) =>
                    setNewA((p) => ({ ...p, is_published: e.target.checked }))
                  }
                />
                <span style={{ fontSize: 13 }}>Publish immediately</span>
              </label>

              <button type="submit" style={btnPrimary()}>
                Post Announcement
              </button>
            </div>
          </div>
        </form>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {(announcements || []).length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              No announcements yet.
            </div>
          ) : (
            announcements.map((a) => (
              <div
                key={a.announcement_id}
                style={{
                  border: "1px solid #eef2f7",
                  borderRadius: 12,
                  padding: 12,
                  background: a.is_published ? "#ffffff" : "#fff7ed",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>{a.title}</div>
                    <div
                      style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}
                    >
                      {a.created_at
                        ? new Date(a.created_at).toLocaleString()
                        : ""}
                      {" • "}
                      {a.is_published ? "Published" : "Unpublished"}
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <button
                      onClick={() => togglePublish(a)}
                      style={btnOutline()}
                    >
                      {a.is_published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(a)}
                      style={btnDanger()}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: "#111827",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {a.body}
                </div>
              </div>
            ))
          )}
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

function input() {
  return {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "10px 12px",
    outline: "none",
    fontSize: 13,
  };
}

function btnPrimary() {
  return {
    border: 0,
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
    color: "#fff",
    background: "#2563eb",
  };
}

function btnOutline() {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer",
    background: "#fff",
  };
}

function btnDanger() {
  return {
    border: 0,
    borderRadius: 12,
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer",
    color: "#fff",
    background: "#dc2626",
  };
}
