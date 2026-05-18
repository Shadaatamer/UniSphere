import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const STATUS = {
  submitted: { bg: "#dbeafe", color: "#1d4ed8", label: "Submitted" },
  graded: { bg: "#dcfce7", color: "#166534", label: "Reviewed" },
  late: { bg: "#fee2e2", color: "#b91c1c", label: "Late" },
  pending: { bg: "#f3f4f6", color: "#374151", label: "Pending" },
};

function fmt(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function StudentAssignmentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [drafts, setDrafts] = useState({});

  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = `${r.class_id}__${r.course_code}`;
      if (!map.has(key)) {
        map.set(key, {
          class_id: r.class_id,
          course_code: r.course_code,
          course_name: r.course_name,
          semester: r.semester,
          year: r.year,
          assignments: [],
        });
      }
      map.get(key).assignments.push(r);
    });
    return Array.from(map.values());
  }, [rows]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/student/assignments");
      setRows(res.data || []);
      setError("");
    } catch (e) {
      setRows([]);
      setError(e.response?.data?.message || e.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveSubmission = async (assignmentId) => {
    const d = drafts[assignmentId] || {};
    if (!d.attachmentUrl) {
      setError("Please add your submission attachment URL before submitting.");
      return;
    }
    try {
      setSavingId(assignmentId);
      await api.post(`/student/assignments/${assignmentId}/submission`, {
        attachmentUrl: d.attachmentUrl || "",
      });
      setSuccess("Solution submitted successfully");
      setError("");
      await load();
      setTimeout(() => setSuccess(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to submit solution");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Assignments</h1>
        <p style={{ marginTop: 8, color: "#6b7280", fontSize: 14 }}>
          View published assignments and submit your solutions.
        </p>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}
      {success ? <div style={successStyle}>{success}</div> : null}

      {grouped.length === 0 ? (
        <div style={emptyStyle}>No assignments available yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {grouped.map((group) => (
            <div key={`${group.class_id}-${group.course_code}`} style={cardStyle}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {group.course_code} - {group.course_name}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  {group.semester} {group.year}
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {group.assignments.map((a) => {
                  const statusKey = a.submission_id ? String(a.submission_status || "submitted").toLowerCase() : "pending";
                  const style = STATUS[statusKey] || STATUS.pending;
                  const draft = drafts[a.assignment_id] || {};
                  return (
                    <div key={a.assignment_id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <strong>{a.title}</strong>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Due: {fmt(a.due_at)}</span>
                      </div>

                      {a.description ? (
                        <div style={{ marginTop: 6, color: "#374151", fontSize: 13 }}>{a.description}</div>
                      ) : null}

                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ background: style.bg, color: style.color, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                          {style.label}
                        </span>
                        {a.submitted_at ? (
                          <span style={{ fontSize: 12, color: "#6b7280" }}>Submitted: {fmt(a.submitted_at)}</span>
                        ) : null}
                        {a.submission_grade != null ? (
                          <span style={{ fontSize: 12, color: "#065f46", fontWeight: 700 }}>
                            Grade: {a.submission_grade}/{a.max_points}
                          </span>
                        ) : null}
                      </div>

                      {a.submission_feedback ? (
                        <div style={{ marginTop: 8, padding: 10, borderRadius: 10, background: "#ecfeff", color: "#155e75", fontSize: 12 }}>
                          Feedback: {a.submission_feedback}
                        </div>
                      ) : null}

                      {a.attachment_url ? (
                        <div style={{ marginTop: 8, fontSize: 12 }}>
                          Assignment Attachment: <a href={a.attachment_url} target="_blank" rel="noreferrer">Open Link</a>
                        </div>
                      ) : null}

                      <div style={{ marginTop: 10 }}>
                        <label style={labelStyle}>Submission Attachment URL</label>
                        <input
                          value={draft.attachmentUrl ?? a.submission_attachment_url ?? ""}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [a.assignment_id]: {
                                ...prev[a.assignment_id],
                                attachmentUrl: e.target.value,
                              },
                            }))
                          }
                          style={inputStyle}
                          placeholder="https://..."
                        />

                        <button
                          onClick={() => saveSubmission(a.assignment_id)}
                          disabled={savingId === a.assignment_id}
                          style={submitBtn}
                        >
                          {savingId === a.assignment_id ? "Submitting..." : a.submission_id ? "Update Submission" : "Submit Attachment"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: 16,
};

const emptyStyle = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: 32,
  textAlign: "center",
  color: "#6b7280",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  marginTop: 10,
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
};

const submitBtn = {
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  marginTop: 10,
  cursor: "pointer",
};

const errorStyle = {
  padding: 12,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  marginBottom: 12,
  fontSize: 13,
  fontWeight: 700,
};

const successStyle = {
  padding: 12,
  borderRadius: 10,
  background: "#dcfce7",
  color: "#166534",
  marginBottom: 12,
  fontSize: 13,
  fontWeight: 700,
};
