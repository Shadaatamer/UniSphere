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
  const [viewMode, setViewMode] = useState("detailed");

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

  const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const SLOT_START_MINUTES = 8 * 60 + 30; // 08:30
  const SLOT_END_MINUTES = 20 * 60 + 30; // 20:30
  const SLOT_SIZE = 60;

  const toMinutes = (timeVal) => {
    if (!timeVal) return null;
    const str = String(timeVal);
    const parts = str.split(":");
    if (parts.length < 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const formatSlot = (start) => {
    const end = start + SLOT_SIZE;
    const fmt = (x) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
    return `${fmt(start)}-${fmt(end)}`;
  };

  const SLOTS = [];
  for (let m = SLOT_START_MINUTES; m < SLOT_END_MINUTES; m += SLOT_SIZE) {
    SLOTS.push({ key: m, label: formatSlot(m) });
  }

  const dayFromDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const map = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return map[d.getDay()] || null;
  };

  const scheduleRows = exams
    .map((e) => {
      const dateVal = e.exam_date;
      const d = dateVal ? new Date(dateVal) : null;
      let startMin = toMinutes(e.start_time);
      let endMin = toMinutes(e.end_time);
      if ((startMin == null || endMin == null) && d && !Number.isNaN(d.getTime())) {
        startMin = d.getHours() * 60 + d.getMinutes();
        endMin = startMin + 60;
      }
      if (startMin != null && endMin == null) endMin = startMin + 60;
      if (startMin == null || endMin == null) return null;

      return {
        ...e,
        dayLabel: dayFromDate(dateVal),
        startMin,
        endMin,
      };
    })
    .filter(Boolean);

  const colorFromCode = (code) => {
    const palette = ["#dbeafe", "#fce7f3", "#e0f2fe", "#dcfce7", "#ede9fe", "#fee2e2"];
    const textPalette = ["#1e3a8a", "#9d174d", "#155e75", "#14532d", "#4c1d95", "#7f1d1d"];
    let hash = 0;
    const s = String(code || "");
    for (let i = 0; i < s.length; i += 1) hash += s.charCodeAt(i);
    const idx = Math.abs(hash) % palette.length;
    return { bg: palette[idx], color: textPalette[idx] };
  };

  const buildDayBlocks = (dayLabel) => {
    const dayExams = scheduleRows
      .filter((e) => e.dayLabel === dayLabel)
      .map((e) => {
        let startIdx = -1;
        let endIdx = -1;
        for (let i = 0; i < SLOTS.length; i += 1) {
          const slotStart = SLOTS[i].key;
          const slotEnd = slotStart + SLOT_SIZE;
          const overlaps = e.startMin < slotEnd && e.endMin > slotStart;
          if (!overlaps) continue;
          if (startIdx === -1) startIdx = i;
          endIdx = i;
        }
        if (startIdx === -1 || endIdx === -1) return null;
        return { ...e, startIdx, span: endIdx - startIdx + 1 };
      })
      .filter(Boolean)
      .sort((a, b) => a.startIdx - b.startIdx);

    const byStart = new Map();
    dayExams.forEach((e) => {
      if (!byStart.has(e.startIdx)) byStart.set(e.startIdx, []);
      byStart.get(e.startIdx).push(e);
    });

    return { dayExams, byStart };
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
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setViewMode("detailed")}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              fontWeight: 800,
              cursor: "pointer",
              background: viewMode === "detailed" ? "#1d4ed8" : "#e5e7eb",
              color: viewMode === "detailed" ? "#fff" : "#111827",
            }}
          >
            Detailed View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("schedule")}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              fontWeight: 800,
              cursor: "pointer",
              background: viewMode === "schedule" ? "#1d4ed8" : "#e5e7eb",
              color: viewMode === "schedule" ? "#fff" : "#111827",
            }}
          >
            Schedule View
          </button>
        </div>
        {viewMode === "detailed" ? (
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
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #d1d5db" }}>
            <table style={{ borderCollapse: "collapse", minWidth: 1100, width: "100%" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      border: "1px solid #9ca3af",
                      background: "#dbeafe",
                      padding: "10px 8px",
                      width: 120,
                      color: "#111827",
                      fontWeight: 900,
                    }}
                  >
                    Day / Time
                  </th>
                  {SLOTS.map((slot) => (
                    <th
                      key={slot.key}
                      style={{
                        border: "1px solid #9ca3af",
                        background: "#dbeafe",
                        padding: "8px 6px",
                        minWidth: 90,
                        fontWeight: 800,
                        fontSize: 12,
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      }}
                    >
                      {slot.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td
                      style={{
                        border: "1px solid #9ca3af",
                        padding: "10px 8px",
                        fontWeight: 900,
                        color: "#991b1b",
                        background: "#f9fafb",
                        textAlign: "center",
                      }}
                    >
                      {day}
                    </td>
                    {(() => {
                      const { dayExams, byStart } = buildDayBlocks(day);
                      const covered = new Array(SLOTS.length).fill(false);
                      dayExams.forEach((e) => {
                        for (let i = e.startIdx; i < e.startIdx + e.span && i < covered.length; i += 1) {
                          covered[i] = true;
                        }
                      });

                      const cells = [];
                      for (let slotIdx = 0; slotIdx < SLOTS.length; slotIdx += 1) {
                        const starting = byStart.get(slotIdx) || [];
                        if (starting.length > 0) {
                          const first = starting[0];
                          const palette = colorFromCode(first.course_code);
                          cells.push(
                            <td
                              key={`${day}-${slotIdx}`}
                              colSpan={first.span}
                              style={{
                                border: "1px solid #9ca3af",
                                padding: 6,
                                verticalAlign: "top",
                                background: palette.bg,
                                color: palette.color,
                                height: 82,
                                fontSize: 12,
                                lineHeight: 1.3,
                              }}
                            >
                              <div style={{ fontWeight: 900 }}>
                                {first.course_code} - {first.course_name}
                              </div>
                              <div>
                                {first.start_time && first.end_time
                                  ? `${first.start_time} - ${first.end_time}`
                                  : fmtDateTime(first.exam_date)}
                              </div>
                              <div>{first.location || "TBA"}</div>
                            </td>,
                          );
                          slotIdx += first.span - 1;
                          continue;
                        }

                        if (covered[slotIdx]) continue;

                        cells.push(
                          <td
                            key={`${day}-${slotIdx}`}
                            style={{
                              border: "1px solid #9ca3af",
                              padding: 6,
                              background: "#ffffff",
                              height: 82,
                            }}
                          />,
                        );
                      }
                      return cells;
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
