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

export default function StudentAttendancePage() {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [attendance, setAttendance] = useState({ summary: {}, rows: [] });

  useEffect(() => {
    api
      .get("/student/attendance", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setAttendance(res.data))
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;
  if (err) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;

  return (
    <div style={{ padding: 18, display: "grid", gap: 14 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7" }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Attendance Summary</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          Overall average: {attendance.summary?.avgAttendance ?? "0%"}
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7" }}>
        <Table
          rows={attendance.rows}
          emptyText="No attendance records yet."
          columns={[
            { key: "course_code", label: "Code" },
            { key: "course_name", label: "Course" },
            { key: "sessions_total", label: "Sessions" },
            { key: "present_count", label: "Present" },
            { key: "absent_count", label: "Absent" },
            { key: "late_count", label: "Late" },
            { key: "excused_count", label: "Excused" },
            {
              key: "attendance_percent",
              label: "Attendance %",
              render: (r) => `${Number(r.attendance_percent || 0).toFixed(2)}%`,
            },
          ]}
        />
      </div>
    </div>
  );
}

