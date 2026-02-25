import React, { useEffect, useState } from "react";
import api from "../services/api";

function Card({ title, right, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 16,
        boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
        border: "1px solid #eef2f7",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 900 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Btn({ variant = "primary", children, ...props }) {
  const base = {
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
    border: "1px solid transparent",
  };

  const styles =
    variant === "primary"
      ? { background: "#0f766e", color: "#fff", borderColor: "#0f766e" }
      : variant === "ghost"
        ? { background: "#fff", color: "#0f766e", borderColor: "#cbd5e1" }
        : { background: "#ef4444", color: "#fff", borderColor: "#ef4444" };

  return (
    <button {...props} style={{ ...base, ...styles, ...props.style }}>
      {children}
    </button>
  );
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
function Table({ columns, rows, emptyText = "No data yet." }) {
  if (!rows || rows.length === 0) {
    return <div style={{ color: "#6b7280", fontWeight: 700 }}>{emptyText}</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: "left",
                  fontSize: 12,
                  color: "#6b7280",
                  fontWeight: 900,
                  padding: "10px 12px",
                  borderBottom: "1px solid #eef2f7",
                  background: "#f8fafc",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #eef2f7" }}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #eef2f7",
                    fontWeight: 700,
                    color: "#111827",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
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
export default function ReportsPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [grades, setGrades] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info"); // info | error | success
  const [loading, setLoading] = useState({ grades: false, attendance: false });

  const token = localStorage.getItem("token");

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await api.get("/professor/classes/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClasses(res.data);
      } catch (err) {
        setMsgType("error");
        setMsg(err.response?.data?.message || err.message);
      }
    }
    loadClasses();
  }, [token]);

  async function loadOverview(type) {
    if (!classId) {
      setMsgType("error");
      setMsg("Please select a class first.");
      return;
    }
    setMsg("");
    setLoading((p) => ({ ...p, [type]: true }));

    try {
      const res = await api.get(`/reports/${type}/overview`, {
        params: { classId },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (type === "grades") setGrades(res.data);
      else setAttendance(res.data);

      setMsgType("success");
      setMsg("Overview loaded ✅");
    } catch (err) {
      setMsgType("error");
      setMsg(err.response?.data?.message || err.message);
    } finally {
      setLoading((p) => ({ ...p, [type]: false }));
    }
  }

  async function exportReport(type, format) {
    if (!classId) {
      setMsgType("error");
      setMsg("Please select a class first.");
      return;
    }
    setMsg("");

    try {
      const res = await api.get(`/reports/${type}/export`, {
        params: { classId, format },
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const cd = res.headers["content-disposition"] || "";
      const filename = cd.includes("filename=")
        ? cd.split("filename=")[1].replace(/"/g, "")
        : `${type}_class_${classId}.${format}`;

      downloadBlob(res.data, filename);
      setMsgType("success");
      setMsg("Downloaded ✅");
    } catch (err) {
      setMsgType("error");
      setMsg(err.response?.data?.message || err.message);
    }
  }

  const bannerStyle =
    msgType === "error"
      ? { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }
      : msgType === "success"
        ? {
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
          }
        : {
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e3a8a",
          };

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 18,
        display: "grid",
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Reports</div>
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            fontWeight: 700,
            marginTop: 4,
          }}
        >
          Generate overview reports for grades and attendance, and export them.
        </div>
      </div>

      {/* Top row: class picker */}
      <Card
        title="Select Class"
        right={
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
            {classId ? `Selected: ${classId}` : "No class selected"}
          </span>
        }
      >
        <div style={{ display: "grid", gap: 10 }}>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              fontWeight: 800,
              width: "100%",
              maxWidth: 520,
            }}
          >
            <option value="">-- Select a class --</option>
            {classes.map((c) => (
              <option key={c.class_id} value={c.class_id}>
                {c.code} - {c.name} ({c.semester} {c.year})
              </option>
            ))}
          </select>

          {msg && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 800,
                ...bannerStyle,
                maxWidth: 720,
              }}
            >
              {msg}
            </div>
          )}
        </div>
      </Card>

      {/* Action buttons: 2 columns (not compressed) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card title="Grades Actions">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn
              onClick={() => loadOverview("grades")}
              disabled={loading.grades}
            >
              {loading.grades ? "Loading..." : "Load Grades"}
            </Btn>
            <Btn variant="ghost" onClick={() => exportReport("grades", "csv")}>
              Export CSV
            </Btn>
            <Btn variant="ghost" onClick={() => exportReport("grades", "pdf")}>
              Export PDF
            </Btn>
          </div>
        </Card>

        <Card title="Attendance Actions">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn
              onClick={() => loadOverview("attendance")}
              disabled={loading.attendance}
            >
              {loading.attendance ? "Loading..." : "Load Attendance"}
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => exportReport("attendance", "csv")}
            >
              Export CSV
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => exportReport("attendance", "pdf")}
            >
              Export PDF
            </Btn>
          </div>
        </Card>
      </div>

      {/* Bottom: 2 columns so page isn't empty */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card
          title="Grades Overview"
          right={
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
              {grades ? "Loaded" : "Not loaded"}
            </span>
          }
        >
          {!grades ? (
            <div style={{ color: "#6b7280", fontWeight: 700 }}>
              Select a class and click <b>Load Grades</b>.
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 900, color: "#0f766e" }}
                >
                  Students: {grades.summary?.students ?? 0}
                </span>
                <span
                  style={{ fontSize: 12, fontWeight: 900, color: "#0f766e" }}
                >
                  Class Avg: {grades.summary?.classAvg ?? 0}%
                </span>
              </div>

              <Table
                emptyText="No students enrolled or no grades recorded yet."
                columns={[
                  { key: "student_id", label: "Student ID" },
                  { key: "email", label: "Email" },
                  { key: "graded_items", label: "Items" },
                  {
                    key: "avg_percent",
                    label: "Avg %",
                    render: (r) => `${Number(r.avg_percent || 0).toFixed(2)}%`,
                  },
                ]}
                rows={grades.rows}
              />
            </>
          )}
        </Card>
        <Card
          title="Attendance Overview"
          right={
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
              {attendance ? "Loaded" : "Not loaded"}
            </span>
          }
        >
          {!attendance ? (
            <div style={{ color: "#6b7280", fontWeight: 700 }}>
              Select a class and click <b>Load Attendance</b>.
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 900, color: "#0f766e" }}
                >
                  Students: {attendance.summary?.students ?? 0}
                </span>
                <span
                  style={{ fontSize: 12, fontWeight: 900, color: "#0f766e" }}
                >
                  Avg Attendance: {attendance.summary?.classAttendanceAvg ?? 0}%
                </span>
              </div>

              <Table
                emptyText="No students enrolled or no attendance marked yet."
                columns={[
                  { key: "student_id", label: "Student ID" },
                  { key: "email", label: "Email" },
                  { key: "sessions_total", label: "Sessions" },
                  { key: "present_count", label: "Present" },
                  { key: "absent_count", label: "Absent" },
                  { key: "late_count", label: "Late" },
                  { key: "excused_count", label: "Excused" },
                  {
                    key: "attendance_percent",
                    label: "Percent",
                    render: (r) =>
                      `${Number(r.attendance_percent || 0).toFixed(2)}%`,
                  },
                ]}
                rows={attendance.rows}
              />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
