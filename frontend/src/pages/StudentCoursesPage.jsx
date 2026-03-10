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
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [myCourses, setMyCourses] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [myCoursesView, setMyCoursesView] = useState("detailed");
  const [profile, setProfile] = useState(null);

  const fetchAll = () => {
    setLoading(true);
    setErr("");
    Promise.all([
        api.get("/student/registration/my-classes", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/student/registration/catalog", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/profile/me", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      .then(([myRes, catalogRes, profileRes]) => {
        setMyCourses(myRes.data || []);
        setCatalog(catalogRes.data || []);
        setProfile(profileRes.data || null);
      })
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, [token]);

  const register = async (classId) => {
    try {
      setWorking(true);
      setErr("");
      setOk("");
      const res = await api.post(
        "/student/registration/enroll",
        { classId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setOk(res.data?.message || "Registered successfully.");
      fetchAll();
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setWorking(false);
    }
  };

  const drop = async (classId) => {
    try {
      setWorking(true);
      setErr("");
      setOk("");
      const res = await api.delete(`/student/registration/enroll/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOk(res.data?.message || "Dropped successfully.");
      fetchAll();
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;

  const dayRank = {
    sunday: 1,
    monday: 2,
    tuesday: 3,
    wednesday: 4,
    thursday: 5,
    friday: 6,
    saturday: 7,
  };

  const scheduledRows = [...myCourses].sort((a, b) => {
    const dayA = dayRank[String(a.day || "").toLowerCase()] || 99;
    const dayB = dayRank[String(b.day || "").toLowerCase()] || 99;
    if (dayA !== dayB) return dayA - dayB;
    return String(a.time_start || "").localeCompare(String(b.time_start || ""));
  });

  const DAYS = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ];

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
    const fmt = (x) => {
      const h = Math.floor(x / 60);
      const m = x % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    return `${fmt(start)}-${fmt(end)}`;
  };

  const SLOTS = [];
  for (let m = SLOT_START_MINUTES; m < SLOT_END_MINUTES; m += SLOT_SIZE) {
    SLOTS.push({ key: m, label: formatSlot(m) });
  }

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
    const day = String(dayLabel || "").toLowerCase();
    const dayCourses = scheduledRows
      .filter((c) => String(c.day || "").toLowerCase() === day)
      .map((c) => {
        const start = toMinutes(c.time_start);
        const end = toMinutes(c.time_end);
        if (start == null || end == null) return null;
        let startIdx = -1;
        let endIdx = -1;
        for (let i = 0; i < SLOTS.length; i += 1) {
          const slotStart = SLOTS[i].key;
          const slotEnd = slotStart + SLOT_SIZE;
          const overlaps = start < slotEnd && end > slotStart;
          if (!overlaps) continue;
          if (startIdx === -1) startIdx = i;
          endIdx = i;
        }
        if (startIdx === -1 || endIdx === -1) return null;
        return {
          ...c,
          startIdx,
          span: endIdx - startIdx + 1,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.startIdx - b.startIdx);

    const byStart = new Map();
    dayCourses.forEach((c) => {
      if (!byStart.has(c.startIdx)) byStart.set(c.startIdx, []);
      byStart.get(c.startIdx).push(c);
    });

    return { dayCourses, byStart };
  };

  return (
    <div style={{ padding: 18, display: "grid", gap: 14 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only-timetable { display: none !important; }
          .student-courses-schedule .print-only-timetable { display: block !important; }
          .student-courses-schedule {
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
          }
          .student-courses-registration { display: none !important; }
        }
      `}</style>
      <div className={myCoursesView === "schedule" ? "student-courses-schedule" : ""} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7" }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>My Courses</div>
        <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
          Enrolled courses and timetable. You can drop registered courses.
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setMyCoursesView("detailed")}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              fontWeight: 800,
              cursor: "pointer",
              background: myCoursesView === "detailed" ? "#1d4ed8" : "#e5e7eb",
              color: myCoursesView === "detailed" ? "#fff" : "#111827",
            }}
          >
            Detailed View
          </button>
          <button
            type="button"
            onClick={() => setMyCoursesView("schedule")}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              fontWeight: 800,
              cursor: "pointer",
              background: myCoursesView === "schedule" ? "#1d4ed8" : "#e5e7eb",
              color: myCoursesView === "schedule" ? "#fff" : "#111827",
            }}
          >
            Schedule View
          </button>
        </div>
        {err ? <div style={{ marginBottom: 10, color: "crimson", fontWeight: 700 }}>{err}</div> : null}
        {ok ? <div style={{ marginBottom: 10, color: "#0f766e", fontWeight: 700 }}>{ok}</div> : null}
        {myCoursesView === "detailed" ? (
          <Table
            rows={myCourses}
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
              {
                key: "actions",
                label: "Actions",
                render: (r) => (
                  <button
                    disabled={working || !r.registration_open}
                    onClick={() => drop(r.class_id)}
                    style={{
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 10px",
                      background: "#dc2626",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: working || !r.registration_open ? "not-allowed" : "pointer",
                      opacity: working || !r.registration_open ? 0.6 : 1,
                    }}
                    title={!r.registration_open ? r.registration_message || "Registration window is closed" : ""}
                  >
                    Drop
                  </button>
                ),
              },
            ]}
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div
              className="print-only-timetable"
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 10,
                padding: 10,
                background: "#f8fafc",
                fontSize: 14,
                fontWeight: 700,
                color: "#1e3a8a",
              }}
            >
              <div style={{ marginBottom: 4 }}>
                Student Name: {profile?.name || "N/A"}
              </div>
              <div style={{ marginBottom: 4 }}>
                Student Programme: {profile?.studentProfile?.department_name || "N/A"}
              </div>
              <div>
                Student Code: {profile?.studentProfile?.student_id || "N/A"}
              </div>
            </div>

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
                        const { dayCourses, byStart } = buildDayBlocks(day);
                        const covered = new Array(SLOTS.length).fill(false);
                        dayCourses.forEach((c) => {
                          for (let i = c.startIdx; i < c.startIdx + c.span && i < covered.length; i += 1) {
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
                                  {first.time_start && first.time_end ? `${first.time_start} - ${first.time_end}` : "TBA"}
                                </div>
                                <div>{first.location || "TBA"}</div>
                              </td>,
                            );
                            slotIdx += first.span - 1;
                            continue;
                          }

                          if (covered[slotIdx]) {
                            continue;
                          }

                          cells.push(
                            <td
                              key={`${day}-${slotIdx}`}
                              style={{
                                border: "1px solid #9ca3af",
                                padding: 6,
                                verticalAlign: "top",
                                background: "#ffffff",
                                color: "#111827",
                                height: 82,
                                fontSize: 12,
                                lineHeight: 1.3,
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
          </div>
        )}
      </div>

      <div className="student-courses-registration" style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7" }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Course Registration</div>
        <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
          Available classes in your department.
        </div>
        <Table
          rows={catalog}
          emptyText="No available classes found."
          columns={[
            { key: "course_code", label: "Code" },
            { key: "course_name", label: "Course" },
            { key: "semester", label: "Semester" },
            { key: "year", label: "Year" },
            { key: "section", label: "Section" },
            { key: "credits", label: "Credits" },
            { key: "day", label: "Day" },
            {
              key: "time",
              label: "Time",
              render: (r) =>
                r.time_start && r.time_end ? `${r.time_start} - ${r.time_end}` : "TBA",
            },
            {
              key: "seats",
              label: "Seats",
              render: (r) =>
                r.seats_left == null ? "Open" : `${r.seats_left} left`,
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => {
                const disabled = working || r.is_registered || r.is_full || !r.registration_open;
                const label = r.is_registered
                  ? "Registered"
                  : r.is_full
                    ? "Full"
                    : !r.registration_open
                      ? "Closed"
                      : "Register";
                return (
                  <button
                    disabled={disabled}
                    onClick={() => register(r.class_id)}
                    style={{
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 10px",
                      background: "#2563eb",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.6 : 1,
                    }}
                    title={!r.registration_open ? r.registration_message || "Registration window is closed" : ""}
                  >
                    {label}
                  </button>
                );
              },
            },
          ]}
        />
      </div>
    </div>
  );
}
