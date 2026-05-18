import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const badge = {
  submitted: { bg: "#dbeafe", color: "#1d4ed8", label: "Submitted" },
  graded: { bg: "#dcfce7", color: "#15803d", label: "Reviewed" },
  late: { bg: "#fee2e2", color: "#b91c1c", label: "Late" },
  missing: { bg: "#f3f4f6", color: "#4b5563", label: "Not Submitted" },
};

function fmtDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ProfessorAssignmentsPage() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [submissionView, setSubmissionView] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueAt: "",
    maxPoints: 100,
    attachmentUrl: "",
    isPublished: true,
  });
  const [editingId, setEditingId] = useState(null);
  const [reviewDrafts, setReviewDrafts] = useState({});

  const selectedClass = useMemo(
    () => classes.find((c) => Number(c.class_id) === Number(selectedClassId)) || null,
    [classes, selectedClassId],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/professor/classes");
        setClasses(res.data || []);
        if ((res.data || []).length) {
          setSelectedClassId(String(res.data[0].class_id));
        }
      } catch (e) {
        setError(e.response?.data?.message || e.message || "Failed to load classes");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    fetchAssignments(selectedClassId);
  }, [selectedClassId]);

  const fetchAssignments = async (classId) => {
    try {
      const res = await api.get(`/professor/classes/${classId}/assignments`);
      setAssignments(res.data || []);
      setSelectedAssignmentId(null);
      setSubmissionView(null);
      setError("");
    } catch (e) {
      setAssignments([]);
      setSubmissionView(null);
      setError(e.response?.data?.message || e.message || "Failed to load assignments");
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      dueAt: "",
      maxPoints: 100,
      attachmentUrl: "",
      isPublished: true,
    });
    setEditingId(null);
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedClassId) {
      setError("Select a class first");
      return;
    }
    if (!form.title || !form.dueAt) {
      setError("Title and due date are required");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        classId: Number(selectedClassId),
        title: form.title,
        description: form.description,
        dueAt: form.dueAt,
        maxPoints: Number(form.maxPoints || 100),
        attachmentUrl: form.attachmentUrl,
        isPublished: !!form.isPublished,
      };

      if (editingId) {
        await api.put(`/professor/assignments/${editingId}`, payload);
        setSuccess("Assignment updated");
      } else {
        await api.post("/professor/assignments", payload);
        setSuccess("Assignment created");
      }

      resetForm();
      await fetchAssignments(selectedClassId);
      setTimeout(() => setSuccess(""), 2500);
    } catch (e2) {
      setError(e2.response?.data?.message || e2.message || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (assignment) => {
    setEditingId(assignment.assignment_id);
    setForm({
      title: assignment.title || "",
      description: assignment.description || "",
      dueAt: toInputDateTime(assignment.due_at),
      maxPoints: Number(assignment.max_points || 100),
      attachmentUrl: assignment.attachment_url || "",
      isPublished: !!assignment.is_published,
    });
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm("Delete this assignment?")) return;
    try {
      await api.delete(`/professor/assignments/${assignmentId}`);
      if (selectedAssignmentId === assignmentId) {
        setSelectedAssignmentId(null);
        setSubmissionView(null);
      }
      await fetchAssignments(selectedClassId);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to delete assignment");
    }
  };

  const loadSubmissions = async (assignmentId) => {
    try {
      setSelectedAssignmentId(assignmentId);
      const res = await api.get(`/professor/assignments/${assignmentId}/submissions`);
      setSubmissionView(res.data);
      const drafts = {};
      (res.data?.submissions || []).forEach((submission) => {
        if (submission.submission_id) {
          drafts[submission.submission_id] = {
            grade: submission.grade ?? "",
            feedback: submission.feedback || "",
          };
        }
      });
      setReviewDrafts(drafts);
      setError("");
    } catch (e) {
      setSubmissionView(null);
      setError(e.response?.data?.message || e.message || "Failed to load submissions");
    }
  };

  const handleReviewSubmission = async (submission) => {
    const draft = reviewDrafts[submission.submission_id] || {};
    if (draft.grade === "" || draft.grade == null) {
      setError("Please enter a grade before saving the review.");
      return;
    }

    const numericGrade = parseInt(draft.grade, 10);
    const maxPoints = Number(submissionView?.assignment?.max_points || 0);
    if (Number.isNaN(numericGrade) || numericGrade < 0 || (maxPoints > 0 && numericGrade > maxPoints)) {
      setError(`Grade must be between 0 and ${maxPoints}.`);
      return;
    }

    try {
      setReviewingId(submission.submission_id);
      await api.patch(`/professor/submissions/${submission.submission_id}/review`, {
        status: "graded",
        grade: numericGrade,
        feedback: draft.feedback || "",
      });
      setSuccess("Assignment review saved");
      setError("");
      await loadSubmissions(selectedAssignmentId);
      setTimeout(() => setSuccess(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to save assignment review");
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 18 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Manage Assignments</h1>
        <p style={{ marginTop: 8, color: "#6b7280", fontSize: 14 }}>
          Create assignments by class and monitor student submissions.
        </p>
      </div>

      {error ? <div style={msgStyle("error")}>{error}</div> : null}
      {success ? <div style={msgStyle("success")}>{success}</div> : null}

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Select Class</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          style={inputStyle}
        >
          <option value="">-- Select a class --</option>
          {classes.map((c) => (
            <option key={c.class_id} value={c.class_id}>
              {c.code} - {c.name} ({c.semester})
            </option>
          ))}
        </select>
      </div>

      {!selectedClass ? null : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontWeight: 900 }}>
              {editingId ? "Edit Assignment" : "Create Assignment"}
            </h3>
            <form onSubmit={handleSubmitAssignment}>
              <label style={labelStyle}>Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
                required
              />

              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              />

              <label style={labelStyle}>Due Date</label>
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                style={inputStyle}
                required
              />

              <label style={labelStyle}>Max Points</label>
              <input
                type="number"
                min="1"
                value={form.maxPoints}
                onChange={(e) => setForm({ ...form, maxPoints: e.target.value })}
                style={inputStyle}
              />

              <label style={labelStyle}>Attachment URL (optional)</label>
              <input
                value={form.attachmentUrl}
                onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
                placeholder="https://..."
                style={inputStyle}
              />

              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                Published
              </label>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button type="submit" disabled={saving} style={primaryBtn}>
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
                {editingId ? (
                  <button type="button" onClick={resetForm} style={secondaryBtn}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontWeight: 900 }}>Assignments</h3>
            {assignments.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 13 }}>No assignments for this class yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10, maxHeight: 520, overflowY: "auto" }}>
                {assignments.map((a) => (
                  <div key={a.assignment_id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{a.title}</strong>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{fmtDateTime(a.due_at)}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                      Submitted: {a.submitted_students}/{a.assigned_students} students
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => loadSubmissions(a.assignment_id)} style={secondaryBtn}>
                        Monitor
                      </button>
                      <button onClick={() => handleEdit(a)} style={secondaryBtn}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(a.assignment_id)} style={dangerBtn}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {submissionView ? (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900 }}>{submissionView.assignment?.title}</h3>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                {submissionView.assignment?.course_code} - {submissionView.assignment?.course_name}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#374151" }}>
              Total: {submissionView.summary?.total_students || 0} | Submitted: {submissionView.summary?.submitted || 0} | Missing: {submissionView.summary?.not_submitted || 0}
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Submitted At</th>
                  <th style={thStyle}>Solution</th>
                  <th style={thStyle}>Review</th>
                </tr>
              </thead>
              <tbody>
                {(submissionView.submissions || []).map((s) => {
                  const style = s.submission_id
                    ? badge[String(s.status || "submitted").toLowerCase()] || badge.submitted
                    : badge.missing;
                  return (
                    <tr key={s.student_id}>
                      <td style={tdStyle}>{s.student_email}</td>
                      <td style={tdStyle}>
                        <span style={{ background: style.bg, color: style.color, padding: "4px 10px", borderRadius: 999, fontWeight: 800, fontSize: 11 }}>
                          {style.label}
                        </span>
                      </td>
                      <td style={tdStyle}>{fmtDateTime(s.submitted_at)}</td>
                      <td style={tdStyle}>
                        {s.attachment_url ? (
                          <a href={s.attachment_url} target="_blank" rel="noreferrer">
                            Open Attachment
                          </a>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>-</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {s.submission_id ? (
                          <div style={{ display: "grid", gap: 8, minWidth: 220 }}>
                            <input
                              type="number"
                              min="0"
                              max={submissionView.assignment?.max_points || 100}
                              step="1"
                              value={reviewDrafts[s.submission_id]?.grade ?? ""}
                              onChange={(e) =>
                                setReviewDrafts((prev) => ({
                                  ...prev,
                                  [s.submission_id]: {
                                    ...prev[s.submission_id],
                                    grade: e.target.value,
                                  },
                                }))
                              }
                              style={inputStyle}
                              placeholder={`0 - ${submissionView.assignment?.max_points || 100}`}
                            />
                            <textarea
                              value={reviewDrafts[s.submission_id]?.feedback ?? ""}
                              onChange={(e) =>
                                setReviewDrafts((prev) => ({
                                  ...prev,
                                  [s.submission_id]: {
                                    ...prev[s.submission_id],
                                    feedback: e.target.value,
                                  },
                                }))
                              }
                              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                              placeholder="Feedback"
                            />
                            <button
                              onClick={() => handleReviewSubmission(s)}
                              disabled={reviewingId === s.submission_id}
                              style={primaryBtn}
                            >
                              {reviewingId === s.submission_id ? "Saving..." : "Save Review"}
                            </button>
                            {s.graded_at ? (
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                Reviewed: {fmtDateTime(s.graded_at)}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>No submission yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  marginTop: 10,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 13,
};

const primaryBtn = {
  border: "none",
  background: "#0f766e",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryBtn = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerBtn = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#b91c1c",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left",
  padding: "10px",
  fontSize: 12,
  color: "#374151",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
};

function msgStyle(type) {
  if (type === "error") {
    return {
      padding: 12,
      background: "#fee2e2",
      color: "#991b1b",
      borderRadius: 10,
      marginBottom: 12,
      fontSize: 13,
      fontWeight: 700,
    };
  }
  return {
    padding: 12,
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: 700,
  };
}
