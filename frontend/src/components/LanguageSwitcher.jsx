import React, { useState } from "react";
import i18n from "i18next";

export default function LanguageSwitcher() {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");

  const handleChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 14px",
        borderRadius: "16px",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
      }}
    >
      <span style={{ fontSize: "18px" }}>🌐</span>

      <select
        value={lang}
        onChange={handleChange}
        style={{
          border: "none",
          background: "transparent",
          fontSize: "17x",
          fontWeight: "500",
          cursor: "pointer",
          outline: "none",
        }}
      >
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
    </div>
  );
}
