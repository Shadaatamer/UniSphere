import React, { useState } from "react";
import axios from "axios";

/* ─── Palette ───────────────────────────────────────────────────────────── */
const C = {
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  border: "#e2e8f0",
  accent: "#2f5d50",
  accentSoft: "rgba(37,99,235,0.08)",
  text: "#0f172a",
  muted: "#64748b",
  high: "#dc2626",
  highBg: "#fef2f2",
  med: "#d97706",
  medBg: "#fffbeb",
  low: "#16a34a",
  lowBg: "#f0fdf4",
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const riskColor = (l) =>
  l === "high" ? C.high : l === "medium" ? C.med : C.low;
const riskBg = (l) =>
  l === "high" ? C.highBg : l === "medium" ? C.medBg : C.lowBg;
const riskLabel = (l) =>
  l === "high" ? "High Risk" : l === "medium" ? "Medium Risk" : "Low Risk";

const recommendation = (l) =>
  l === "high"
    ? "Immediate academic intervention is recommended. Contact the student and provide support resources."
    : l === "medium"
      ? "Monitor this student closely and encourage additional engagement with course materials."
      : "The student is currently on track. Continue regular monitoring.";

const gpaColor = (gpa) => {
  const n = parseFloat(gpa);
  if (n >= 3.5) return C.low;
  if (n >= 2.5) return C.med;
  return C.high;
};

/* ─── Sub-components ────────────────────────────────────────────────────── */
function InputField({ label, name, value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.muted,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: focused ? "#fff" : C.surfaceAlt,
          border: `1.5px solid ${focused ? C.accent : C.border}`,
          borderRadius: 10,
          padding: "11px 14px",
          color: C.text,
          fontSize: 15,
          outline: "none",
          boxShadow: focused ? `0 0 0 3px ${C.accentSoft}` : "none",
          transition: "all 0.2s",
          width: "100%",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: C.surfaceAlt,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "14px 12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.muted,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
        {value}
      </div>
    </div>
  );
}

function GPABadge({ gpa }) {
  const color = gpaColor(gpa);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        background: `${color}12`,
        border: `1.5px solid ${color}33`,
      }}
    >
      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>GPA</span>
      <span style={{ fontSize: 17, fontWeight: 700, color }}>{gpa}</span>
    </div>
  );
}

function RiskMeter({ probability }) {
  const pct = Math.min(100, probability * 100);
  const color = pct >= 70 ? C.high : pct >= 40 ? C.med : C.low;
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
          Risk Probability
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color }}>
          {pct.toFixed(2)}%
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: C.border,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 999,
            transition: "width 0.8s cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function PredictiveAnalyticsPage() {
  const [form, setForm] = useState({ student_id: "", course_code: "" });
  const [result, setResult] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setMetrics(null);
    try {
      const { data } = await axios.post(
        "http://localhost:5050/api/analytics/predict-risk",
        { student_id: form.student_id, course_code: form.course_code },
      );
      setResult(data);
      if (data.input_features) setMetrics(data.input_features);
    } catch {
      setError(
        "Failed to get prediction. Please check the backend and AI service.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: "36px 24px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #94a3b8; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: C.accentSoft,
              border: `1px solid ${C.accent}33`,
              borderRadius: 999,
              padding: "4px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: C.accent,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            ● AI-Powered Analytics
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: C.text,
              marginBottom: 6,
            }}
          >
            Student Risk Dashboard
          </h1>
          <p style={{ fontSize: 15, color: C.muted }}>
            Predict academic risk and surface insights in real time.
          </p>
        </div>

        {/* ── Two-column grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* ── LEFT ── */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 20,
                color: C.text,
              }}
            >
              Search Student
            </h2>

            <form
              onSubmit={handlePredict}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <InputField
                label="Student ID"
                name="student_id"
                value={form.student_id}
                onChange={handleChange}
                placeholder="e.g. 1"
              />
              <InputField
                label="Course Code"
                name="course_code"
                value={form.course_code}
                onChange={handleChange}
                placeholder="e.g. c0007"
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8,
                  padding: "13px",
                  background: loading ? C.border : C.accent,
                  color: loading ? C.muted : "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading
                    ? "none"
                    : "0 2px 12px rgba(37,99,235,0.25)",
                  transition: "background 0.2s, box-shadow 0.2s",
                }}
              >
                {loading ? "Analyzing…" : "Run Analysis"}
              </button>

              {error && (
                <div
                  style={{
                    padding: "11px 14px",
                    background: C.highBg,
                    border: `1px solid ${C.high}33`,
                    borderRadius: 10,
                    fontSize: 13,
                    color: C.high,
                  }}
                >
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* ── RIGHT ── */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
              minHeight: 360,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 20,
                color: C.text,
              }}
            >
              Prediction Result
            </h2>

            {!result ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 260,
                  border: `1.5px dashed ${C.border}`,
                  borderRadius: 12,
                  color: C.muted,
                  fontSize: 14,
                  gap: 10,
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.border}
                  strokeWidth="1.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Run analysis to view student insights
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {/* Identity */}
                <div
                  style={{
                    background: C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 17, fontWeight: 700, color: C.text }}
                    >
                      {result.student_name || "—"}
                    </div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                      {result.course_name || form.course_code}
                    </div>
                  </div>
                  {result.gpa != null && <GPABadge gpa={result.gpa} />}
                </div>

                {/* Stat cards */}
                {metrics && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gap: 10,
                    }}
                  >
                    <StatCard
                      title="Assignments"
                      value={metrics.assessments_done ?? 0}
                    />
                    <StatCard
                      title="Avg Score"
                      value={Number(metrics.avg_score ?? 0).toFixed(1)}
                    />
                    <StatCard
                      title="Attendance"
                      value={`${metrics.attendance_rate ?? "0.0"}%`}
                    />
                  </div>
                )}

                {/* Risk badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 16px",
                    borderRadius: 999,
                    background: riskBg(result.risk_level),
                    border: `1.5px solid ${riskColor(result.risk_level)}33`,
                    alignSelf: "flex-start",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: riskColor(result.risk_level),
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: riskColor(result.risk_level),
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {riskLabel(result.risk_level)}
                  </span>
                </div>

                {/* Meter */}
                <div
                  style={{
                    background: C.surfaceAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <RiskMeter probability={result.risk_probability} />
                </div>

                {/* Recommendation */}
                <div
                  style={{
                    background: C.accentSoft,
                    border: `1px solid ${C.accent}22`,
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.accent,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      marginBottom: 6,
                    }}
                  >
                    Recommendation
                  </div>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
                    {recommendation(result.risk_level)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
