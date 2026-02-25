import React, { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import {
  GraduationCap,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Briefcase,
} from "lucide-react";

export default function LoginForm() {
  const { t } = useTranslation();

  const roles = [
    { name: "Student", value: "student", icon: <User size={18} /> },
    { name: "Professor", value: "professor", icon: <Briefcase size={18} /> },
    { name: "Admin", value: "admin", icon: <ShieldCheck size={18} /> },
  ];

  const [userType, setUserType] = useState(roles[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password: password.trim(),
        role: userType.value, // convert to lowercase to match backend
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.role);

      // Redirect based on role
      if (response.data.role === "admin") {
        navigate("/admin");
      } else if (response.data.role === "student") {
        navigate("/student"); // you can create student page later
      } else if (response.data.role === "professor") {
        navigate("/professor"); // create professor page later
      }

      alert("Login Successful 🎉");
      console.log("Logged in as:", response.data.role);
    } catch (err) {
      console.log("FULL ERROR:", err);
      console.log("RESPONSE:", err.response);
      alert(err.response?.data?.message || err.message);
    }

    setLoading(false);
  };

  // Internal CSS Objects to replace Tailwind
  const containerStyle = {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: "#ffffff",
    borderRadius: "40px",
    padding: "48px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
    border: "1px solid #f1f5f9",
    fontFamily: "sans-serif",
  };

  const iconHeaderStyle = {
    backgroundColor: "#2563eb",
    padding: "20px",
    borderRadius: "24px",
    width: "fit-content",
    margin: "0 auto 32px auto",
    color: "white",
    boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.4)",
  };

  const toggleContainer = {
    display: "flex",
    backgroundColor: "#f1f5f9",
    padding: "6px",
    borderRadius: "16px",
    marginBottom: "32px",
    gap: "4px",
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 14px 14px 42px", // reduced from 48 → better alignment
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    outline: "none",
    fontSize: "16px",
    boxSizing: "border-box", // important for alignment
  };

  const buttonStyle = {
    width: "100%",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "16px",
    borderRadius: "16px",
    border: "none",
    fontWeight: "800",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "16px",
    boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)",
  };

  return (
    <div style={containerStyle}>
      {/* Logo Icon */}
      <div style={iconHeaderStyle}>
        <GraduationCap size={48} />
      </div>

      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "4px",
          }}
        >
          {t("auth.welcome")}
        </p>
        <h3
          style={{
            fontSize: "28px",
            fontWeight: "900",
            color: "#1e293b",
            margin: 0,
          }}
        >
          {userType.name} Portal
        </h3>
        <div
          style={{
            width: "40px",
            height: "5px",
            backgroundColor: "#fbbf24",
            borderRadius: "10px",
            margin: "12px auto 0",
          }}
        ></div>
      </div>

      {/* Role Toggle */}
      <div style={toggleContainer}>
        {roles.map((role) => (
          <button
            key={role.name}
            type="button"
            onClick={() => setUserType(role)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px",
              border: "none",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              transition: "0.3s",
              backgroundColor:
                userType.value === role.value ? "white" : "transparent",
              color: userType.value === role.value ? "#2563eb" : "#94a3b8",
              boxShadow:
                userType.value === role.value
                  ? "0 4px 6px -1px rgba(0,0,0,0.1)"
                  : "none",
            }}
          >
            {role.icon} {t("roles." + role.value)}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSignIn}
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        {/* Email Input */}
        <div style={{ position: "relative" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "700",
              color: "#334155",
              marginBottom: "8px",
            }}
          >
            {t("auth.email")}
          </label>
          <Mail
            size={20}
            style={{
              position: "absolute",
              left: "16px",
              top: "42px",
              color: "#94a3b8",
            }}
          />
          <input
            type="email"
            placeholder={`${userType.value}@alexu.edu.eg`}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        {/* Password Input */}
        <div style={{ position: "relative" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "700",
              color: "#334155",
              marginBottom: "8px",
            }}
          >
            {t("auth.password")}
          </label>
          <Lock
            size={20}
            style={{
              position: "absolute",
              left: "16px",
              top: "42px",
              color: "#94a3b8",
            }}
          />
          <input
            type="password"
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        <div style={{ textAlign: "right" }}>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {t("auth.forgot")}
          </button>
        </div>

        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading
            ? t("auth.verifying")
            : t("auth.signInAs", {
                role: t("roles." + userType.value),
              })}
        </button>
      </form>
    </div>
  );
}
