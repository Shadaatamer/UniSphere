import React, { useEffect, useState } from "react";
import api from "../services/api";

function money(v) {
  return Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function StudentFeesPage() {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get("/student/fees/invoice", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setData(res.data))
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ padding: 20, color: "#6b7280" }}>Loading...</div>;
  if (err) return <div style={{ padding: 20, color: "crimson" }}>{err}</div>;
  if (!data) return <div style={{ padding: 20, color: "#6b7280" }}>No invoice found.</div>;

  return (
    <div style={{ padding: 18, display: "grid", gap: 14 }}>
      <style>{`
        @media print {
          .student-sidebar,
          .student-topbar { display: none !important; }
          .student-main { background: #fff !important; }
          .student-content { padding: 0 !important; }
          .no-print { display: none !important; }
          .invoice-wrap { padding: 0 !important; margin: 0 !important; }
          .invoice-card {
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => window.print()}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            background: "#1d4ed8",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Print Invoice
        </button>
      </div>

      <div className="invoice-wrap" style={{ display: "grid", gap: 14 }}>
      <div className="invoice-card" style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7" }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Fees Invoice</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          Term: {data.term?.semester || "N/A"} {data.term?.year || ""}
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: "#111827", lineHeight: 1.8 }}>
          <div><strong>Name:</strong> {data.student?.name || "N/A"}</div>
          <div><strong>Student Code:</strong> {data.student?.studentCode || "N/A"}</div>
          <div><strong>National ID:</strong> {data.student?.nationalId || "N/A"}</div>
          <div><strong>First College Year:</strong> {data.student?.firstCollegeYear || "N/A"}</div>
        </div>
      </div>

      <div className="invoice-card" style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Registered Courses</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={th}>Course Code</th>
                <th style={th}>Course Name</th>
                <th style={th}>Credit Hours</th>
                <th style={th}>Credit Hours Price</th>
                <th style={th}>Book Price</th>
              </tr>
            </thead>
            <tbody>
              {(data.courses || []).map((c, idx) => (
                <tr key={`${c.courseCode}-${idx}`}>
                  <td style={td}>{c.courseCode}</td>
                  <td style={td}>{c.courseName}</td>
                  <td style={td}>{c.creditHours}</td>
                  <td style={td}>{money(c.creditHourPrice)}</td>
                  <td style={td}>{money(c.bookPrice)}</td>
                </tr>
              ))}
              {(data.courses || []).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: "center", color: "#6b7280" }}>
                    No registered courses in selected term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="invoice-card" style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #eef2f7" }}>
        <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
          <Row label="Number of Credit Hours" value={data.summary?.numberOfCreditHours} />
          <Row label="Credit Hour Fee" value={money(data.summary?.creditHourFee)} />
          <Row label="Registration" value={money(data.summary?.registrationFee)} />
          {(data.summary?.extraFees || []).map((f) => (
            <Row key={f.key} label={f.label} value={money(f.amount)} />
          ))}
          <Row label="Previous balance" value={money(data.summary?.previousBalance)} />
          <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "8px 0" }} />
          <Row
            label="Final Amount to be paid"
            value={money(data.summary?.finalAmountToBePaid)}
            strong
          />
        </div>
      </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "#111827", fontWeight: strong ? 900 : 700 }}>{label}</span>
      <span style={{ color: "#111827", fontWeight: strong ? 900 : 700 }}>{value}</span>
    </div>
  );
}

const th = {
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#6b7280",
  fontSize: 12,
};

const td = {
  padding: "10px 12px",
  borderBottom: "1px solid #eef2f7",
  fontSize: 13,
  color: "#111827",
  fontWeight: 700,
};
