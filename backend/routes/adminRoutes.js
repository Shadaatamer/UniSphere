const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../data/db");
const { verifyJWT, adminOnly } = require("../middleware/auth");

// GET all users (with dept info if student/prof)
router.get("/users", verifyJWT, adminOnly, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.user_id,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        s.department_id AS student_department_id,
        p.department_id AS prof_department_id
      FROM users u
      LEFT JOIN students s ON s.user_id = u.user_id
      LEFT JOIN professors p ON p.user_id = u.user_id
      ORDER BY u.user_id;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST create student
router.post("/students", verifyJWT, adminOnly, async (req, res) => {
  const client = await db.connect();
  try {
    const { email, password, department_id } = req.body;
    const hash = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES ($1, $2, 'student', TRUE)
       RETURNING user_id`,
      [email, hash],
    );

    const user_id = userRes.rows[0].user_id;

    await client.query(
      `INSERT INTO students (user_id, department_id)
       VALUES ($1, $2)`,
      [user_id, department_id],
    );

    await client.query("COMMIT");
    res.json({ message: "Student created", user_id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST create professor
router.post("/professors", verifyJWT, adminOnly, async (req, res) => {
  const client = await db.connect();
  try {
    const { email, password, department_id } = req.body;
    const hash = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES ($1, $2, 'professor', TRUE)
       RETURNING user_id`,
      [email, hash],
    );

    const user_id = userRes.rows[0].user_id;

    await client.query(
      `INSERT INTO professors (user_id, department_id)
       VALUES ($1, $2)`,
      [user_id, department_id],
    );

    await client.query("COMMIT");
    res.json({ message: "Professor created", user_id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// PUT toggle user activation
router.put("/users/:id/toggle", verifyJWT, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    await db.query(
      `UPDATE users
       SET is_active = NOT is_active
       WHERE user_id = $1`,
      [userId],
    );

    res.json({ message: "User status toggled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// PUT edit user (email + role + dept)
router.put("/users/:id", verifyJWT, adminOnly, async (req, res) => {
  const client = await db.connect();
  try {
    const userId = req.params.id;
    const { email, role, department_id } = req.body;

    await client.query("BEGIN");

    // update user basic info
    await client.query(
      `UPDATE users
       SET email = $1, role = $2
       WHERE user_id = $3`,
      [email, role, userId],
    );

    // clean old role tables (so role switching works)
    await client.query(`DELETE FROM students WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM professors WHERE user_id = $1`, [userId]);

    // insert into correct role table
    if (role === "student") {
      await client.query(
        `INSERT INTO students (user_id, department_id) VALUES ($1, $2)`,
        [userId, department_id],
      );
    } else if (role === "professor") {
      await client.query(
        `INSERT INTO professors (user_id, department_id) VALUES ($1, $2)`,
        [userId, department_id],
      );
    }

    await client.query("COMMIT");
    res.json({ message: "User updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
