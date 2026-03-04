// AdminRequests.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const fetchRequests = () => {
    api
      .get("/admin/transcript-requests", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setRequests(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = (request_id, action) => {
    api
      .put(
        `/admin/transcript-requests/${request_id}`,
        { status: action },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => fetchRequests())
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleReadyForCollection = (request_id, status) => {
    api
      .put(
        `/admin/transcript-requests/${request_id}`,
        { status, ready_for_collection: true },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      )
      .then(() => fetchRequests())
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const sectionStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "40px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  };

  const buttonStyle = (color) => ({
    padding: "8px 12px",
    backgroundColor: color,
    color: "#fff",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    lineHeight: 1.2,
  });

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: 10 }}>
        Transcript Requests
      </h1>
      <p style={{ marginBottom: 30, color: "#666" }}>
        Admin View: approve or reject student transcript requests
      </p>
      <div style={{ marginBottom: 12, fontWeight: 700, color: "#111827" }}>
        Pending Transcripts: {pendingCount}
      </div>

      <div style={sectionStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>ID</th>
              <th style={{ padding: "10px" }}>Student</th>
              <th style={{ padding: "10px" }}>Department</th>
              <th style={{ padding: "10px" }}>Type</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Collection</th>
              <th style={{ padding: "10px" }}>Requested At</th>
              <th style={{ padding: "10px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.request_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{req.request_id}</td>
                <td style={{ padding: "10px" }}>{req.student_email}</td>
                <td style={{ padding: "10px" }}>{req.department_name}</td>
                <td style={{ padding: "10px", textTransform: "capitalize" }}>
                  {req.transcript_type || "official"}
                </td>
                <td style={{ padding: "10px" }}>{req.status}</td>
                <td style={{ padding: "10px" }}>
                  {req.ready_for_collection ? "Ready" : "Not ready"}
                </td>
                <td style={{ padding: "10px" }}>{new Date(req.created_at).toLocaleString()}</td>
                <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                  <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <button
                      style={buttonStyle("#28a745")}
                      onClick={() => handleAction(req.request_id, "approved")}
                      disabled={req.status !== "pending"}
                    >
                      Approve
                    </button>
                    <button
                      style={buttonStyle("#dc3545")}
                      onClick={() => handleAction(req.request_id, "rejected")}
                      disabled={req.status !== "pending"}
                    >
                      Reject
                    </button>
                    <button
                      style={buttonStyle("#0ea5e9")}
                      onClick={() => handleReadyForCollection(req.request_id, req.status)}
                      disabled={req.status !== "approved" || req.ready_for_collection}
                    >
                      Mark Ready
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 10, textAlign: "center", color: "#999" }}>
                  No transcript requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
