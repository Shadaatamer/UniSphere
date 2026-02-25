// routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../data/db"); // your PostgreSQL client
const { verifyJWT } = require("../middleware/auth"); // your auth middleware

// GET /api/profile/me
router.get("/me", verifyJWT, async (req, res) => {
  try {
    // Base user info
    const { rows: users } = await pool.query(
      `SELECT user_id, email, role 
       FROM users 
       WHERE user_id = $1`,
      [req.user.id],
    );

    if (!users[0]) return res.status(404).json({ message: "User not found" });

    const user = users[0];

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
module.exports = router;
