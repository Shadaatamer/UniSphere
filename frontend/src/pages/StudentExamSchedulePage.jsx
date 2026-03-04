import React, { useEffect, useState } from "react";
import api from "../services/api";

function Table({ columns, rows, emptyText = "No data." }) {
  if (!rows || rows.length === 0) {
    return <div style={{ color: "#6b7280", fontWeight: 700 }}>{emptyText}</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: 12 }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "10px 12px", borderBottom: "1px solid #eef2f7", fontSize: 13, color: "#111827", fontWeight: 700 }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7" }}>
      {children}
    </div>
  );
}

export default function StudentExamSchedulePage() {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [exams, setExams] = useState([]);

  useEffect(() => {
    api
      .get("/student/exams", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setExams(res.data))
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const fmtDateTime = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  if (loading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;
  if (err) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;

  return (
    <div style={{ padding: 18, display: "grid", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Exam Schedule</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          View upcoming exams for your enrolled courses.
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Upcoming Exams</div>
        <Table
          rows={exams}
          emptyText="No upcoming exams found."
          columns={[
            { key: "course_code", label: "Code" },
            { key: "course_name", label: "Course" },
            { key: "exam_type", label: "Type" },
            { key: "exam_date", label: "Date", render: (r) => fmtDateTime(r.exam_date) },
            { key: "start_time", label: "Start" },
            { key: "end_time", label: "End" },
            { key: "location", label: "Location" },
          ]}
        />
      </Card>
    </div>
  );
}
