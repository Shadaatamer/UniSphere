import React, { useEffect, useState } from "react";
import api from "../services/api";

const STATUS_STYLE = {
  pending: { bg: "#fef3c7", color: "#d97706", label: "Pending" },
  approved: { bg: "#dcfce7", color: "#16a34a", label: "Approved" },
  rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rejected" },
};

const TYPE_LABEL = {
  official: "Official",
  unofficial: "Unofficial",
  graduation: "Graduation Package",
};

export default function StudentTranscriptPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [transcriptType, setTranscriptType] = useState("official");

  const token = localStorage.getItem("token");

  const fetchStatus = () => {
    api
      .get("/student/transcript-requests", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setRequests(r.data))
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErr("");
    setSuccess("");
    try {
      const res = await api.post(
        "/student/transcript-requests",
        { transcriptType },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSuccess(res.data.message || "Request submitted!");
      fetchStatus();
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasPending = requests.some((r) => String(r.status).toLowerCase() === "pending");

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Transcript Requests</h2>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Request Official Transcript</div>
        <p style={styles.desc}>
          Submit a request to receive your academic transcript.
          Requests are typically processed within 3-5 business days.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#374151" }}>
            Transcript Type
          </label>
          <select
            value={transcriptType}
            onChange={(e) => setTranscriptType(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 320,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <option value="official">Official</option>
            <option value="unofficial">Unofficial</option>
            <option value="graduation">Graduation Package</option>
          </select>
        </div>

        {err && <div style={styles.alert.error}>{err}</div>}
        {success && <div style={styles.alert.success}>{success}</div>}

        <button
          onClick={handleSubmit}
          disabled={submitting || hasPending}
          style={{
            ...styles.btn,
            opacity: submitting || hasPending ? 0.5 : 1,
            cursor: submitting || hasPending ? "not-allowed" : "pointer",
          }}
        >
          {submitting
            ? "Submitting..."
            : hasPending
              ? "Request Already Pending"
              : "Submit Transcript Request"}
        </button>
      </div>

      <h3 style={styles.subheading}>Request History</h3>

      {loading ? (
        <div style={styles.center}>Loading...</div>
      ) : requests.length === 0 ? (
        <div style={styles.empty}>No requests submitted yet.</div>
      ) : (
        <div style={styles.list}>
          {requests.map((r) => {
            const s = STATUS_STYLE[r.status] || {
              bg: "#f3f4f6",
              color: "#6b7280",
              label: r.status,
            };
            return (
              <div key={r.request_id} style={styles.row}>
                <div>
                  <div style={styles.rowTitle}>Transcript Request #{r.request_id}</div>
                  <div style={styles.rowDate}>
                    Type: {TYPE_LABEL[r.transcript_type] || r.transcript_type || "Official"}
                  </div>
                  <div style={styles.rowDate}>
                    Submitted:{" "}
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div style={styles.rowDate}>
                    Collection: {r.ready_for_collection ? "Ready at administration" : "Not ready yet"}
                  </div>
                </div>
                <span style={{ ...styles.badge, background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: 24, maxWidth: 760, margin: "0 auto" },
  heading: { fontSize: 22, fontWeight: 900, marginBottom: 20, color: "#111827" },
  subheading: { fontSize: 16, fontWeight: 900, margin: "24px 0 12px", color: "#111827" },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 24,
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    border: "1px solid #eef2f7",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: 900, color: "#111827", marginBottom: 10 },
  desc: { fontSize: 13, color: "#6b7280", marginBottom: 18, lineHeight: 1.6 },
  btn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 24px",
    fontWeight: 900,
    fontSize: 14,
  },
  alert: {
    error: {
      background: "#fee2e2",
      color: "#dc2626",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 14,
      fontSize: 13,
      fontWeight: 700,
    },
    success: {
      background: "#dcfce7",
      color: "#16a34a",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 14,
      fontSize: 13,
      fontWeight: 700,
    },
  },
  list: { display: "grid", gap: 10 },
  row: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px 20px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
    border: "1px solid #eef2f7",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowTitle: { fontWeight: 900, fontSize: 14, color: "#111827", marginBottom: 4 },
  rowDate: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  badge: { fontSize: 12, fontWeight: 900, padding: "4px 12px", borderRadius: 999 },
  center: { padding: 40, textAlign: "center", color: "#6b7280" },
  empty: {
    padding: 40,
    textAlign: "center",
    color: "#6b7280",
    background: "#fff",
    borderRadius: 14,
  },
};

