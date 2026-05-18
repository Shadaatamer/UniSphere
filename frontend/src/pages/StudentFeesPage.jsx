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
      .get("/student/fees/invoice", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data))
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  const handlePayNow = async () => {
    try {
      const res = await api.post("/payments/create-checkout-session", {
        amount: Number(data.summary?.finalAmountToBePaid || 0),
        studentId:
          data.student?.studentId ||
          data.student?.student_id ||
          data.student?.studentCode ||
          "",
      });

      window.location.href = res.data.url;
    } catch (error) {
      console.error("Payment error:", error);

      alert(
        error.response?.data?.message ||
          error.message ||
          "Could not start payment.",
      );
    }
  };

  if (loading) {
    return (
      <div className="billing-shell">
        <div className="profile-loading-card">Loading invoice...</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="billing-shell">
        <div className="error-message">{err}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="billing-shell">
        <div className="profile-loading-card">No invoice found.</div>
      </div>
    );
  }

  const termText = `${data.term?.semester || "N/A"} ${data.term?.year || ""}`;
  const finalAmount = money(data.summary?.finalAmountToBePaid);
  const creditHours = data.summary?.numberOfCreditHours || 0;
  const isPaid = data.payment?.status === "paid";

  return (
    <div className="billing-shell">
      <style>{`
        @media print {
          .student-sidebar,
          .student-topbar,
          .topbar,
          .sidebar,
          .no-print {
            display: none !important;
          }

          .main-area,
          .student-main {
            background: #fff !important;
          }

          .page-content,
          .student-content {
            padding: 0 !important;
            max-width: none !important;
          }

          .billing-shell {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .billing-card,
          .billing-total-card,
          .billing-summary-card {
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="billing-header no-print">
        <div>
          <p className="billing-eyebrow">Billing</p>
          <h1 className="page-title">Fees Invoice</h1>
          <p className="page-subtitle">
            Review your registered courses, fee breakdown, and payment status.
          </p>
        </div>

        <div className="billing-actions">
          <button type="button" className="btn btn-soft" onClick={handlePrint}>
            Print Invoice
          </button>

          {isPaid ? (
            <button type="button" className="btn btn-soft" disabled>
              Already Paid
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-pay"
              onClick={handlePayNow}
            >
              Pay Now
            </button>
          )}
        </div>
      </div>

      <section className="billing-summary-grid no-print">
        <div className="billing-summary-card primary">
          <p className="billing-summary-label">Amount Due</p>
          <p className="billing-summary-value">
            {isPaid ? "0.00" : finalAmount}
          </p>
          <p className="billing-summary-note">
            {isPaid ? "Payment completed" : "Payment required"}
          </p>
        </div>

        <div className="billing-summary-card">
          <p className="billing-summary-label">Credit Hours</p>
          <p className="billing-summary-value">{creditHours}</p>
          <p className="billing-summary-note">Registered this term</p>
        </div>

        <div className="billing-summary-card">
          <p className="billing-summary-label">Payment Status</p>

          <p className="billing-summary-value">{isPaid ? "Paid" : "Unpaid"}</p>

          <p className="billing-summary-note">
            {isPaid ? "Payment completed" : "Payment required"}
          </p>
        </div>
      </section>

      <section className="billing-card">
        <div className="billing-card-header">
          <div>
            <h2 className="billing-card-title">Invoice Details</h2>
            <p className="billing-card-subtitle">Term: {termText}</p>
          </div>
        </div>

        <div className="billing-info-grid">
          <div className="billing-info-item">
            <span className="billing-info-label">Student Name</span>
            <span className="billing-info-value">
              {data.student?.name || "N/A"}
            </span>
          </div>

          <div className="billing-info-item">
            <span className="billing-info-label">Student Code</span>
            <span className="billing-info-value">
              {data.student?.studentCode || "N/A"}
            </span>
          </div>

          <div className="billing-info-item">
            <span className="billing-info-label">National ID</span>
            <span className="billing-info-value">
              {data.student?.nationalId || "N/A"}
            </span>
          </div>

          <div className="billing-info-item">
            <span className="billing-info-label">First College Year</span>
            <span className="billing-info-value">
              {data.student?.firstCollegeYear || "N/A"}
            </span>
          </div>
        </div>
      </section>

      <section className="billing-card">
        <div className="billing-card-header">
          <div>
            <h2 className="billing-card-title">Registered Courses</h2>
            <p className="billing-card-subtitle">
              Courses included in this invoice.
            </p>
          </div>
        </div>

        <div className="billing-table-wrap">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Credit Hours</th>
                <th>Credit Hour Price</th>
                <th>Book Price</th>
              </tr>
            </thead>

            <tbody>
              {(data.courses || []).map((course, index) => (
                <tr key={`${course.courseCode}-${index}`}>
                  <td>{course.courseCode}</td>
                  <td>{course.courseName}</td>
                  <td>{course.creditHours}</td>
                  <td>{money(course.creditHourPrice)}</td>
                  <td>{money(course.bookPrice)}</td>
                </tr>
              ))}

              {(data.courses || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="billing-empty-cell">
                    No registered courses in selected term.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="billing-total-card">
        <div className="billing-breakdown">
          <BillingRow
            label="Number of Credit Hours"
            value={data.summary?.numberOfCreditHours}
          />

          <BillingRow
            label="Credit Hour Fee"
            value={money(data.summary?.creditHourFee)}
          />

          <BillingRow
            label="Registration"
            value={money(data.summary?.registrationFee)}
          />

          {(data.summary?.extraFees || []).map((fee) => (
            <BillingRow
              key={fee.key}
              label={fee.label}
              value={money(fee.amount)}
            />
          ))}

          <BillingRow
            label="Previous Balance"
            value={money(data.summary?.previousBalance)}
          />

          <BillingRow
            label={isPaid ? "Final Amount Paid" : "Final Amount to be Paid"}
            value={finalAmount}
            final
          />
        </div>

        <aside className="payment-panel no-print">
          <h3>{isPaid ? "Payment completed" : "Ready to pay?"}</h3>

          <p>
            {isPaid
              ? "This invoice has already been paid successfully."
              : "Complete your invoice payment securely using Stripe Checkout."}
          </p>

          {isPaid ? (
            <button type="button" className="btn btn-soft" disabled>
              Already Paid
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-pay"
              onClick={handlePayNow}
            >
              Pay Invoice
            </button>
          )}
        </aside>
      </section>
    </div>
  );
}

function BillingRow({ label, value, final = false }) {
  return (
    <div className={`billing-row ${final ? "final" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
