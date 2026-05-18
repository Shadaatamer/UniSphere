// src/pages/ProfilePage.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile/me");

        setProfile(
          res.data || {
            name: "Unknown",
            email: "Unknown",
            role: "Unknown",
          },
        );
      } catch (err) {
        console.error(err);
        setProfile({
          name: "Unknown",
          email: "Unknown",
          role: "Unknown",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

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

  const getDepartment = () => {
    if (profile?.role === "student" && profile.studentProfile) {
      return profile.studentProfile.department_name;
    }

    if (profile?.role === "professor" && profile.professorProfile) {
      return profile.professorProfile.department_name;
    }

    return "Not assigned";
  };

  const initials = (profile?.name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-card">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-shell">
      <div className="profile-header">
        <div>
          <p className="profile-eyebrow">Account Settings</p>
          <h1 className="page-title profile-title">My Profile</h1>
          <p className="page-subtitle">
            Manage your personal information, department details, and password.
          </p>
        </div>

        <div className="profile-actions">
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => {
              setShowPasswordForm((prev) => !prev);
              setMessage("");
            }}
          >
            {showPasswordForm ? "Cancel" : "Change Password"}
          </button>
        </div>
      </div>

      {message ? (
        <div
          className={`profile-message ${
            message.toLowerCase().includes("success") ? "success" : "error"
          }`}
        >
          {message}
        </div>
      ) : null}

      <section className="profile-card profile-main-card">
        <div className="profile-card-top">
          <div className="profile-avatar">{initials}</div>

          <div>
            <h2 className="profile-name">{profile?.name}</h2>
            <p className="profile-meta">
              {profile?.role || "User"} • {getDepartment()}
            </p>
          </div>
        </div>

        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="profile-info-label">Full Name</span>
            <span className="profile-info-value">{profile?.name}</span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-label">Email Address</span>
            <span className="profile-info-value">{profile?.email}</span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-label">Role</span>
            <span className="profile-info-value">{profile?.role}</span>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-label">Department</span>
            <span className="profile-info-value">{getDepartment()}</span>
          </div>
        </div>
      </section>

      {showPasswordForm ? (
        <section className="profile-card profile-form-card">
          <div className="profile-form-header">
            <h3>Change Password</h3>
            <p>Choose a strong password to keep your account secure.</p>
          </div>

          <form onSubmit={handlePasswordUpdate} className="profile-form">
            <label className="form-label" htmlFor="password">
              New Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter new password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
            />

            <label className="form-label" htmlFor="confirmPassword">
              Confirm New Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              required
            />

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Update Password
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="profile-grid">
        <div className="profile-card">
          <h3 className="profile-section-title">Account Overview</h3>

          <div className="summary-grid">
            <div className="summary-box">
              <span className="summary-label">Account Status</span>
              <strong className="summary-value">Active</strong>
            </div>

            <div className="summary-box">
              <span className="summary-label">Department</span>
              <strong className="summary-value">{getDepartment()}</strong>
            </div>

            <div className="summary-box">
              <span className="summary-label">Portal Access</span>
              <strong className="summary-value">{profile?.role}</strong>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3 className="profile-section-title">Security</h3>

          <div className="security-box">
            <p className="security-text">
              Keep your account secure by updating your password regularly and
              checking that your profile information is accurate.
            </p>

            <button
              type="button"
              className="btn btn-soft"
              onClick={() => {
                setShowPasswordForm((prev) => !prev);
                setMessage("");
              }}
            >
              Update Password
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
