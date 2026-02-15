const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../data/db"); // your MySQL connection
const { verifyJWT, adminOnly } = require("../middleware/auth"); // JWT & admin middleware

// GET all users
router.get("/users", verifyJWT, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT user_id, email, role, student_id, professor_id, is_active, created_at FROM Users");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST create student
router.post("/students", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { email, password, department_id } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO Users (email, password_hash, role, student_id, is_active)
       VALUES (?, ?, 'student', ?, TRUE)`,
      [email, hash, department_id]
    );
    res.json({ message: "Student created", user_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST create professor
router.post("/professors", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { email, password, department_id } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO Users (email, password_hash, role, professor_id, is_active)
       VALUES (?, ?, 'professor', ?, TRUE)`,
      [email, hash, department_id]
    );
    res.json({ message: "Professor created", user_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// PUT toggle user activation
router.put("/users/:id/toggle", verifyJWT, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;
    await db.query(
      `UPDATE Users
       SET is_active = NOT is_active
       WHERE user_id = ?`,
      [userId]
    );
    res.json({ message: "User status toggled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// PUT edit user
router.put("/users/:id", verifyJWT, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, role, department_id } = req.body; // Changed from username to email

    // Update Users table
    await db.query(
      `UPDATE Users
       SET email = ?, role = ?, 
           student_id = IF(role='student', ?, student_id),
           professor_id = IF(role='professor', ?, professor_id)
       WHERE user_id = ?`,
      [email, role, department_id, department_id, userId] // Changed from username to email
    );

    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;