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

export default function StudentGradesPage() {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [grades, setGrades] = useState({ summary: {}, rows: [] });

  useEffect(() => {
    api
      .get("/student/grades", { headers: { Authorization: `Bearer ${token}` } })
      .then((g) => {
        setGrades(g.data);
      })
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;
  if (err) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;

  return (
    <div style={{ padding: 18, display: "grid", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Grades & Results</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          GPA calculation and generated course results.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <Card>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Cumulative GPA</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{grades.summary?.cumulativeGpa ?? 0}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Semester GPA</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{grades.summary?.semesterGpa ?? 0}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Credits Attempted</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{grades.summary?.creditsAttempted ?? 0}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Completed Courses</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{grades.summary?.completedCourses ?? 0}</div>
        </Card>
      </div>

      <Card>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Course Results</div>
        <Table
          rows={grades.rows}
          emptyText="No course grades yet."
          columns={[
            { key: "course_code", label: "Code" },
            { key: "course_name", label: "Course" },
            { key: "semester", label: "Semester" },
            { key: "year", label: "Year" },
            { key: "credits", label: "Credits" },
            { key: "graded_items", label: "Items" },
            {
              key: "avg_percent",
              label: "Avg %",
              render: (r) => `${Number(r.avg_percent || 0).toFixed(2)}%`,
            },
            { key: "letter_grade", label: "Letter" },
            { key: "grade_points", label: "Points" },
            { key: "result_status", label: "Result" },
          ]}
        />
      </Card>
    </div>
  );
}
