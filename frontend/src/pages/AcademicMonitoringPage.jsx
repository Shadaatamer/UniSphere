import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";

const STATUS_COLORS = {
  active: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  resolved: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  dismissed: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
};

const badge = (status) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.dismissed;
  return {
    display: "inline-block",
    background: c.bg,
    color: c.text,
    border: `1px solid ${c.border}`,
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
  };
};

export default function AcademicMonitoringPage() {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [threshold, setThreshold] = useState(60);
  const [inputThreshold, setInputThreshold] = useState(60);
  const [flags, setFlags] = useState([]);
  const [statusFilter, setStatusFilter] = useState("active");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [resolveModal, setResolveModal] = useState(null); // { flag, action }
  const [resolveNotes, setResolveNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchThreshold = useCallback(async () => {
    try {
      const r = await api.get("/academic-monitoring/threshold", { headers });
      setThreshold(Number(r.data.threshold));
      setInputThreshold(Number(r.data.threshold));
    } catch {}
  }, []);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.get(
        `/academic-monitoring/flags?status=${statusFilter}`,
        { headers }
      );
      setFlags(r.data.flags || []);
    } catch (e) {
      setError("Failed to load flags");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchThreshold();
  }, [fetchThreshold]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleSaveThreshold = async () => {
    setSavingThreshold(true);
    try {
      await api.put(
        "/academic-monitoring/threshold",
        { threshold: inputThreshold },
        { headers }
      );
      setThreshold(inputThreshold);
      setScanResult({ message: `Threshold updated to ${inputThreshold}%`, newFlags: null });
    } catch {
      setError("Failed to update threshold");
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const r = await api.post(
        "/academic-monitoring/scan",
        {},
        { headers }
      );
      setScanResult(r.data);
      fetchFlags();
    } catch {
      setError("Scan failed. Try again.");
    } finally {
      setScanning(false);
    }
  };

  const openResolveModal = (flag, action) => {
    setResolveModal({ flag, action });
    setResolveNotes("");
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await api.patch(
        `/academic-monitoring/flags/${resolveModal.flag.flag_id}`,
        { action: resolveModal.action, notes: resolveNotes },
        { headers }
      );
      setResolveModal(null);
      fetchFlags();
    } catch {
      setError("Failed to update flag");
    }
  };

  const card = {
    background: "#fff",
    borderRadius: 14,
    padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    marginBottom: 24,
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontWeight: 900, fontSize: 26, marginBottom: 4 }}>
          Academic Monitoring
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Flag students whose grades fall below a set threshold and track academic interventions.
      </p>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "12px 16px",
            color: "#dc2626",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Threshold + Scan Card */}
      <div style={card}>
        <h2 style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>
          ⚙️ Grade Threshold &amp; Scan
        </h2>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              Flag students scoring below (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={inputThreshold}
              onChange={(e) => setInputThreshold(Number(e.target.value))}
              style={{
                border: "1.5px solid #d1d5db",
                borderRadius: 8,
                padding: "8px 14px",
                width: 110,
                fontSize: 15,
                fontWeight: 700,
              }}
            />
          </div>
          <button
            onClick={handleSaveThreshold}
            disabled={savingThreshold}
            style={{
              background: "#2f5d50",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 20px",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {savingThreshold ? "Saving…" : "Save Threshold"}
          </button>
          <button
            onClick={handleScan}
            disabled={scanning}
            style={{
              background: "#2f5d50",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 20px",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {scanning ? "Scanning…" : " Scan Grades Now"}
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 10 }}>
          Current threshold: <strong>{threshold}%</strong> — any grade below this will trigger a flag.
        </p>

        {scanResult && (
          <div
            style={{
              marginTop: 14,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#15803d",
              fontWeight: 700,
            }}
          >
              {scanResult.message}
          </div>
        )}
      </div>

      {/* Flags List */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h2 style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>
             Flagged Students
          </h2>
          <div style={{ display: "flex", gap: 6 }}>
            {["active", "resolved", "dismissed", "all"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  border: "1.5px solid",
                  borderColor: statusFilter === s ? "#2f5d50" : "#e5e7eb",
                  background: statusFilter === s ? "#2f5d50" : "#fff",
                  color: statusFilter === s ? "#fff" : "#374151",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: 32 }}>Loading…</p>
        ) : flags.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#9ca3af",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}></div>
            <p style={{ fontWeight: 700 }}>No {statusFilter === "all" ? "" : statusFilter} flags found.</p>
            {statusFilter === "active" && (
              <p style={{ fontSize: 13 }}>Run a scan to check for students below the threshold.</p>
            )}
          </div>
        ) : (
          <div>
            {flags.map((f) => (
              <div
                key={f.flag_id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: 15 }}>
                      {f.student_name}
                    </span>
                    <span style={badge(f.status)}>{f.status}</span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#374151",
                      margin: "0 0 4px 0",
                    }}
                  >
                    {f.reason}
                  </p>
                  {f.course_code ? (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px 0" }}>
                      {f.course_code}
                      {f.course_name ? ` - ${f.course_name}` : ""}
                      {f.percent_score != null ? ` | Score: ${f.percent_score}%` : ""}
                    </p>
                  ) : null}
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                    Flagged {new Date(f.created_at).toLocaleDateString()}
                    {f.resolved_by_name && ` · Resolved by ${f.resolved_by_name}`}
                  </p>
                  {f.notes && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        margin: "4px 0 0",
                        fontStyle: "italic",
                      }}
                    >
                      Note: {f.notes}
                    </p>
                  )}
                </div>
                {f.status === "active" && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => openResolveModal(f, "resolved")}
                      style={{
                        background: "#f0fdf4",
                        color: "#16a34a",
                        border: "1px solid #bbf7d0",
                        borderRadius: 8,
                        padding: "5px 12px",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      ✓ Resolve
                    </button>
                    <button
                      onClick={() => openResolveModal(f, "dismissed")}
                      style={{
                        background: "#f9fafb",
                        color: "#6b7280",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: "5px 12px",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 28,
              width: 420,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <h3 style={{ fontWeight: 900, marginBottom: 8 }}>
              {resolveModal.action === "resolved" ? "✓ Resolve Flag" : "Dismiss Flag"}
            </h3>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
              Student: <strong>{resolveModal.flag.student_name}</strong>
            </p>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
              Notes (optional)
            </label>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Add intervention notes, e.g. tutoring assigned…"
              rows={3}
              style={{
                width: "100%",
                border: "1.5px solid #d1d5db",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 14,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                onClick={() => setResolveModal(null)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: resolveModal.action === "resolved" ? "#16a34a" : "#6b7280",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {resolveModal.action === "resolved" ? "Mark Resolved" : "Dismiss"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
