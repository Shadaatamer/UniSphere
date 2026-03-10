// src/pages/ProfilePage.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showNameForm, setShowNameForm] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [nameForm, setNameForm] = useState({ full_name: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile/me");
        setProfile(
          res.data || { name: "Unknown", email: "Unknown", role: "Unknown" },
        );
        setNameForm({ full_name: res.data?.name || "" });
      } catch (err) {
        console.error(err);
        setProfile({ name: "Unknown", email: "Unknown", role: "Unknown" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put("/profile/me", {
        full_name: nameForm.full_name,
      });
      setProfile((prev) => ({ ...prev, ...res.data }));
      setMessage("Profile updated successfully!");
      setShowNameForm(false);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Failed to update profile.");
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match!");
      return;
    }
    try {
      await api.put("/profile/change-password", {
        password: formData.password,
      });
      setMessage("Password updated successfully!");
      setFormData({ password: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      console.error(err);
      setMessage("Failed to update password.");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 24,
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
        My Profile
      </h1>

      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          marginBottom: 20,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <strong>Name:</strong> {profile?.name}
        </div>
        <div style={{ marginBottom: 12 }}>
          <strong>Email:</strong> {profile?.email}
        </div>

        {/* Role and department info */}
        <div style={{ marginBottom: 12 }}>
          <strong>Role:</strong> {profile?.role}
        </div>

        {profile?.role === "student" && profile.studentProfile && (
          <div style={{ marginBottom: 12 }}>
            <strong>Department:</strong>{" "}
            {profile.studentProfile.department_name}
          </div>
        )}

        {profile?.role === "professor" && profile.professorProfile && (
          <div style={{ marginBottom: 12 }}>
            <strong>Department:</strong>{" "}
            {profile.professorProfile.department_name}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowNameForm((prev) => !prev)}
        style={{
          padding: "10px 16px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 12,
          marginRight: 8,
        }}
      >
        {showNameForm ? "Cancel Name Edit" : "Edit Name"}
      </button>

      <button
        onClick={() => setShowPasswordForm((prev) => !prev)}
        style={{
          padding: "10px 16px",
          background: "#ea580c",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        {showPasswordForm ? "Cancel" : "Change Password"}
      </button>

      {showNameForm && (
        <form
          onSubmit={handleNameUpdate}
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
            marginBottom: 12,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              name="full_name"
              placeholder="Full name"
              value={nameForm.full_name}
              onChange={(e) => setNameForm({ full_name: e.target.value })}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ddd",
                fontSize: 14,
              }}
              required
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Save Name
          </button>
        </form>
      )}

      {showPasswordForm && (
        <form
          onSubmit={handlePasswordUpdate}
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <input
              type="password"
              name="password"
              placeholder="New Password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ddd",
                fontSize: 14,
              }}
              required
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ddd",
                fontSize: 14,
              }}
              required
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Update Password
          </button>
        </form>
      )}

      {message && (
        <p
          style={{
            marginTop: 12,
            color: message.includes("success") ? "#10b981" : "#ef4444",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
