const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const db = require("../data/db");
const { verifyJWT, adminOnly } = require("../middleware/auth");

/* =========================================================
   Helper: Check if table exists (Postgres)
========================================================= */
async function tableExists(tableName) {
  const r = await db.query("SELECT to_regclass($1) AS t", [
    `public.${tableName}`,
  ]);
  return !!r.rows[0]?.t;
}

/* =========================================================
   📊 ADMIN DASHBOARD
   GET /api/admin/dashboard
========================================================= */
router.get("/dashboard", verifyJWT, adminOnly, async (req, res) => {
  try {
    const totalStudentsRes = await db.query(
      "SELECT COUNT(*)::int AS c FROM students",
    );
    const totalStudents = totalStudentsRes.rows[0].c;

    const totalUsersRes = await db.query(
      "SELECT COUNT(*)::int AS c FROM users",
    );
    const totalUsers = totalUsersRes.rows[0].c;

    const hasCourses = await tableExists("courses");
    const hasTranscripts = await tableExists("transcript_requests");
    const hasMessages = await tableExists("messages");

    const totalCourses = hasCourses
      ? (await db.query("SELECT COUNT(*)::int AS c FROM courses")).rows[0].c
      : 0;

    const pendingTranscripts = hasTranscripts
      ? (
          await db.query(
            "SELECT COUNT(*)::int AS c FROM transcript_requests WHERE status = 'pending'",
          )
        ).rows[0].c
      : 0;

    const recentMessages = hasMessages
      ? (
          await db.query(
            "SELECT COUNT(*)::int AS c FROM messages WHERE created_at >= NOW() - INTERVAL '7 days'",
          )
        ).rows[0].c
      : 0;

    const deptRes = await db.query(`
      SELECT d.name, COUNT(s.student_id)::int AS students
      FROM departments d
      LEFT JOIN students s ON s.department_id = d.department_id
      GROUP BY d.department_id
      ORDER BY students DESC, d.name ASC
      LIMIT 6
    `);

    const recentActivity = [
      { icon: "👤", title: "New student enrolled in EE401", time: "5 min ago" },
      {
        icon: "✅",
        title: "Transcript request approved for Ahmed Hassan",
        time: "15 min ago",
      },
      {
        icon: "⚠️",
        title: "Course schedule conflict detected in CS303",
        time: "1 hour ago",
      },
      {
        icon: "💬",
        title: "New message from Dr. Mona Ibrahim",
        time: "2 hours ago",
      },
    ];

    res.json({
      header: {
        title: "Admin Dashboard",
        subtitle: "Overview of student portal statistics",
      },
      topStats: [
        {
          key: "students",
          label: "Total Students",
          value: totalStudents,
          badge: "+12.5%",
          theme: "blue",
        },
        {
          key: "courses",
          label: "Total Courses",
          value: totalCourses,
          badge: "+5.2%",
          theme: "green",
        },
        {
          key: "transcripts",
          label: "Pending Transcripts",
          value: pendingTranscripts,
          badge: "Pending",
          theme: "orange",
        },
        {
          key: "messages",
          label: "Recent Messages",
          value: recentMessages,
          badge: "New",
          theme: "purple",
        },
      ],
      studentsByDepartment: deptRes.rows,
      recentActivity,
      bottomStats: [
        {
          label: "Active Courses",
          value: totalCourses,
          theme: "blue",
        },
        { label: "New Enrollments", value: 328, theme: "green" },
        { label: "Completed Requests", value: 156, theme: "orange" },
      ],
      meta: { totalUsers },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   👥 USERS LIST
   GET /api/admin/users
========================================================= */
router.get("/users", verifyJWT, adminOnly, async (req, res) => {
  try {
    // join department IDs like your frontend expects:
    // - student_department_id OR prof_department_id
    const result = await db.query(`
      SELECT
        u.user_id,
        u.email,
        u.role,
        u.is_active,
        s.department_id AS student_department_id,
        p.department_id AS prof_department_id
      FROM users u
      LEFT JOIN students s ON s.user_id = u.user_id
      LEFT JOIN professors p ON p.user_id = u.user_id
      ORDER BY u.user_id ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   ➕ CREATE STUDENT
   POST /api/admin/students
   body: { email, password, department_id }
========================================================= */
router.post("/students", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { email, password, department_id } = req.body;

    const existing = await db.query(
      "SELECT user_id FROM users WHERE email=$1",
      [email],
    );
    if (existing.rows.length) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const userRes = await db.query(
      `
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES ($1, $2, 'student', true)
      RETURNING user_id
      `,
      [email, password_hash],
    );

    const user_id = userRes.rows[0].user_id;

    await db.query(
      `
      INSERT INTO students (user_id, department_id)
      VALUES ($1, $2)
      `,
      [user_id, department_id],
    );

    res.status(201).json({ message: "Student created", user_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   ➕ CREATE PROFESSOR
   POST /api/admin/professors
   body: { email, password, department_id }
========================================================= */
router.post("/professors", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { email, password, department_id } = req.body;

    const existing = await db.query(
      "SELECT user_id FROM users WHERE email=$1",
      [email],
    );
    if (existing.rows.length) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const userRes = await db.query(
      `
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES ($1, $2, 'professor', true)
      RETURNING user_id
      `,
      [email, password_hash],
    );

    const user_id = userRes.rows[0].user_id;

    await db.query(
      `
      INSERT INTO professors (user_id, department_id)
      VALUES ($1, $2)
      `,
      [user_id, department_id],
    );

    res.status(201).json({ message: "Professor created", user_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   ✏ UPDATE USER
   PUT /api/admin/users/:id
   body: { email, role, department_id }
========================================================= */
router.put("/users/:id", verifyJWT, adminOnly, async (req, res) => {
  try {
    const user_id = req.params.id;
    const { email, role, department_id } = req.body;

    // update users table
    await db.query(`UPDATE users SET email=$1, role=$2 WHERE user_id=$3`, [
      email,
      role,
      user_id,
    ]);

    // update student/professor department based on role
    if (role === "student") {
      await db.query(`DELETE FROM professors WHERE user_id=$1`, [user_id]);
      const exists = await db.query(
        `SELECT student_id FROM students WHERE user_id=$1`,
        [user_id],
      );
      if (exists.rows.length) {
        await db.query(
          `UPDATE students SET department_id=$1 WHERE user_id=$2`,
          [department_id, user_id],
        );
      } else {
        await db.query(
          `INSERT INTO students (user_id, department_id) VALUES ($1,$2)`,
          [user_id, department_id],
        );
      }
    }

    if (role === "professor") {
      await db.query(`DELETE FROM students WHERE user_id=$1`, [user_id]);
      const exists = await db.query(
        `SELECT professor_id FROM professors WHERE user_id=$1`,
        [user_id],
      );
      if (exists.rows.length) {
        await db.query(
          `UPDATE professors SET department_id=$1 WHERE user_id=$2`,
          [department_id, user_id],
        );
      } else {
        await db.query(
          `INSERT INTO professors (user_id, department_id) VALUES ($1,$2)`,
          [user_id, department_id],
        );
      }
    }

    res.json({ message: "User updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   🔁 TOGGLE ACTIVE
   PUT /api/admin/users/:id/toggle
========================================================= */
router.put("/users/:id/toggle", verifyJWT, adminOnly, async (req, res) => {
  try {
    const user_id = req.params.id;

    const result = await db.query(
      `UPDATE users
       SET is_active = NOT is_active
       WHERE user_id = $1
       RETURNING is_active`,
      [user_id],
    );

    res.json({ user_id, is_active: result.rows[0].is_active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
