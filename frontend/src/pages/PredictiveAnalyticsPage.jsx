import React, { useState } from "react";
import axios from "axios";

export default function PredictiveAnalyticsPage() {
  const [form, setForm] = useState({
    sum_click: 200,
    studied_credits: 60,
    imd_band: "20-30%",
    region: "Scotland",
    code_module: "AAA",
    avg_score: 55,
    assessments_done: 2,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await axios.post(
        "http://localhost:5050/api/analytics/predict-risk",
        {
          ...form,
          sum_click: Number(form.sum_click),
          studied_credits: Number(form.studied_credits),
          avg_score: Number(form.avg_score),
          assessments_done: Number(form.assessments_done),
        },
      );

      setResult(response.data);
    } catch (err) {
      setError(
        "Failed to get prediction. Please check backend and AI service.",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    if (level === "high") return "#dc2626";
    if (level === "medium") return "#d97706";
    return "#16a34a";
  };

  const getRiskBg = (level) => {
    if (level === "high") return "#fee2e2";
    if (level === "medium") return "#fef3c7";
    return "#dcfce7";
  };

  const getRecommendation = (level) => {
    if (level === "high") {
      return "Immediate academic intervention is recommended. Contact the student and provide support resources.";
    }
    if (level === "medium") {
      return "Monitor this student closely and encourage additional engagement with course materials.";
    }
    return "The student currently appears to be on track. Continue regular monitoring.";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            Student Risk Analysis
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#475569",
              maxWidth: "700px",
              lineHeight: "1.6",
            }}
          >
            Run AI-powered analysis to identify students who may be at academic
            risk based on engagement and performance indicators.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                marginBottom: "20px",
                color: "#0f172a",
              }}
            >
              Student Performance Indicators{" "}
            </h2>

            <form onSubmit={handlePredict}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <InputField
                  label="Sum Clicks"
                  name="sum_click"
                  value={form.sum_click}
                  onChange={handleChange}
                />
                <InputField
                  label="Studied Credits"
                  name="studied_credits"
                  value={form.studied_credits}
                  onChange={handleChange}
                />
                <InputField
                  label="IMD Band"
                  name="imd_band"
                  value={form.imd_band}
                  onChange={handleChange}
                />
                <InputField
                  label="Region"
                  name="region"
                  value={form.region}
                  onChange={handleChange}
                />
                <InputField
                  label="Course Code"
                  name="code_module"
                  value={form.code_module}
                  onChange={handleChange}
                />
                <InputField
                  label="Average Score"
                  name="avg_score"
                  value={form.avg_score}
                  onChange={handleChange}
                />
                <div style={{ gridColumn: "1 / -1" }}>
                  <InputField
                    label="Assessments Done"
                    name="assessments_done"
                    value={form.assessments_done}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "24px",
                  width: "100%",
                  padding: "14px 18px",
                  background: loading ? "#94a3b8" : "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "0.2s",
                }}
              >
                {loading ? "Predicting..." : "Run Risk Analysis"}
              </button>

              {error && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    borderRadius: "10px",
                    background: "#fee2e2",
                    color: "#991b1b",
                    fontSize: "14px",
                  }}
                >
                  {error}
                </div>
              )}
            </form>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0",
              minHeight: "420px",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                marginBottom: "20px",
                color: "#0f172a",
              }}
            >
              Prediction Result
            </h2>

            {!result ? (
              <div
                style={{
                  height: "320px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "#64748b",
                  background: "#f8fafc",
                  borderRadius: "16px",
                  border: "1px dashed #cbd5e1",
                  padding: "20px",
                }}
              >
                Run a prediction to view the student's risk analysis.
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "10px 16px",
                    borderRadius: "999px",
                    fontWeight: "700",
                    fontSize: "14px",
                    color: getRiskColor(result.risk_level),
                    background: getRiskBg(result.risk_level),
                    textTransform: "uppercase",
                    marginBottom: "20px",
                  }}
                >
                  {result.risk_level} Risk
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "16px",
                    padding: "20px",
                    marginBottom: "18px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <p style={{ color: "#64748b", marginBottom: "8px" }}>
                    Risk Probability
                  </p>
                  <h3
                    style={{
                      fontSize: "36px",
                      margin: 0,
                      color: "#0f172a",
                    }}
                  >
                    {(result.risk_probability * 100).toFixed(2)}%
                  </h3>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "16px",
                    padding: "20px",
                    marginBottom: "18px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "600",
                      color: "#0f172a",
                      marginBottom: "8px",
                    }}
                  >
                    Recommended Action
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "#475569",
                      lineHeight: "1.6",
                    }}
                  >
                    {getRecommendation(result.risk_level)}
                  </p>
                </div>

                <div
                  style={{
                    background: "#eff6ff",
                    borderRadius: "16px",
                    padding: "16px",
                    border: "1px solid #bfdbfe",
                    color: "#1e3a8a",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                >
                  This AI prediction analyzes engagement activity and academic
                  performance indicators to estimate student risk level.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: "600",
          color: "#334155",
        }}
      >
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: "12px",
          border: "1px solid #cbd5e1",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
