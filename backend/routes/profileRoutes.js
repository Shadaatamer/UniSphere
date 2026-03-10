// routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../data/db"); // your PostgreSQL client
const { verifyJWT } = require("../middleware/auth"); // your auth middleware

async function hasUserFullNameColumn() {
  const r = await pool.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'full_name'
    ) AS exists
    `,
  );
  return !!r.rows[0]?.exists;
}

function buildDisplayName(fullName, email) {
  const cleanFull = String(fullName || "").trim();
  if (cleanFull) return cleanFull;
  const local = String(email || "").split("@")[0] || "Unknown";
  return local
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase()) || "Unknown";
}

// GET /api/profile/me
router.get("/me", verifyJWT, async (req, res) => {
  try {
    const hasFullName = await hasUserFullNameColumn();
    // Base user info
    const { rows: users } = await pool.query(
      `SELECT user_id, email, role${hasFullName ? ", full_name" : ""} 
       FROM users 
       WHERE user_id = $1`,
      [req.user.id],
    );

    if (!users[0]) return res.status(404).json({ message: "User not found" });

    const user = users[0];
    user.name = buildDisplayName(user.full_name, user.email);

    // Add extra info for students
    if (user.role === "student") {
      const { rows: studentRows } = await pool.query(
        `SELECT s.student_id, s.department_id, d.name AS department_name
         FROM students s
         JOIN departments d ON s.department_id = d.department_id
         WHERE s.user_id = $1`,
        [req.user.id],
      );
      user.studentProfile = studentRows[0] || null;
    }

    // Add extra info for professors
    if (user.role === "professor") {
      const { rows: profRows } = await pool.query(
        `SELECT p.professor_id, p.department_id, d.name AS department_name
         FROM professors p
         JOIN departments d ON p.department_id = d.department_id
         WHERE p.user_id = $1`,
        [req.user.id],
      );
      user.professorProfile = profRows[0] || null;
    }

    res.json(user);
  } catch (err) {
    console.error("GET /profile/me error:", err);
    res.status(500).json({ message: "Server error fetching profile" });
  }
});

// PUT /api/profile/change-password
router.put("/change-password", verifyJWT, async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Unauthorized: missing user ID" });
  }

  try {
    console.log("req.user:", req.user);
    console.log("New password:", password);

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed password:", hashedPassword);

    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE user_id = $2 RETURNING user_id",
      [hashedPassword, req.user.id],
    );

    console.log("DB update result:", result.rows);

    if (!result.rows[0]) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res
      .status(500)
      .json({ message: "Failed to update password", error: err.message });
  }
});

// PUT /api/profile/me
router.put("/me", verifyJWT, async (req, res) => {
  try {
    const hasFullName = await hasUserFullNameColumn();
    if (!hasFullName) {
      return res.status(400).json({
        message: "Profile name field is not initialized. Run migration 006_add_users_full_name.sql",
      });
    }

    const fullName = String(req.body?.full_name || "").trim();
    if (!fullName) {
      return res.status(400).json({ message: "full_name is required" });
    }
    if (fullName.length > 120) {
      return res.status(400).json({ message: "full_name is too long" });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET full_name = $1
      WHERE user_id = $2
      RETURNING user_id, email, role, full_name
      `,
      [fullName, req.user.id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = result.rows[0];
    res.json({
      ...user,
      name: buildDisplayName(user.full_name, user.email),
      message: "Profile updated",
    });
  } catch (err) {
    console.error("PUT /profile/me error:", err);
    res.status(500).json({ message: "Server error updating profile" });
  }
});
module.exports = router;
