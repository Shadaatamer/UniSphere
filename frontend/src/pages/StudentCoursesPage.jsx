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

export default function StudentCoursesPage() {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    api
      .get("/student/courses", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setCourses(res.data))
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;
  if (err) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;

  return (
    <div style={{ padding: 18 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7" }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>My Courses</div>
        <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
          Enrolled courses and timetable.
        </div>
        <Table
          rows={courses}
          emptyText="No enrolled courses found."
          columns={[
            { key: "course_code", label: "Code" },
            { key: "course_name", label: "Course" },
            { key: "semester", label: "Semester" },
            { key: "year", label: "Year" },
            { key: "credits", label: "Credits" },
            { key: "day", label: "Day" },
            {
              key: "time",
              label: "Time",
              render: (r) =>
                r.time_start && r.time_end ? `${r.time_start} - ${r.time_end}` : "TBA",
            },
            { key: "location", label: "Location" },
          ]}
        />
      </div>
    </div>
  );
}

