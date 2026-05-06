const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const db = require("../data/db");
const cache = require("../data/cache");
const { verifyJWT, adminOnly } = require("../middleware/auth");

const ADMIN_CACHE_TTL_SECONDS = 60;

function getAdminCacheKey(name, suffix = "") {
  return suffix ? `admin:${name}:${suffix}` : `admin:${name}`;
}

async function withAdminCache(key, loader, ttlSeconds = ADMIN_CACHE_TTL_SECONDS) {
  const cached = await cache.getCache(key);
  if (cached !== null) {
    return cached;
  }

  const value = await loader();
  if (value !== undefined) {
    await cache.setCache(key, value, ttlSeconds);
  }

  return value;
}

async function invalidateAdminCacheKeys(keys) {
  await Promise.all(
    [...new Set(keys.filter(Boolean))].map((key) => cache.delCache(key)),
  );
}

/* =========================================================
   Helper: Check if table exists (Postgres)
========================================================= */
async function tableExists(tableName) {
  const r = await db.query("SELECT to_regclass($1) AS t", [
    `public.${tableName}`,
  ]);
  return !!r.rows[0]?.t;
}

async function columnExists(tableName, columnName) {
  const r = await db.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS exists
    `,
    [tableName, columnName],
  );
  return !!r.rows[0]?.exists;
}

async function resolveProfessorId(maybeId) {
  const numericId = Number(maybeId);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const r = await db.query(
    `SELECT professor_id
     FROM professors
     WHERE professor_id = $1 OR user_id = $1
     LIMIT 1`,
    [numericId],
  );
  return r.rows[0]?.professor_id ?? null;
}

async function ensurePrerequisitesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS prerequisites (
      prerequisite_id SERIAL PRIMARY KEY,
      course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
      required_course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (course_id, required_course_id),
      CHECK (course_id <> required_course_id)
    )
  `);
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_prerequisites_course_id ON prerequisites(course_id)",
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_prerequisites_required_course_id ON prerequisites(required_course_id)",
  );
}

/* =========================================================
   📊 ADMIN DASHBOARD
   GET /api/admin/dashboard
========================================================= */
router.get("/dashboard", verifyJWT, adminOnly, async (req, res) => {
  try {
    const payload = await withAdminCache(getAdminCacheKey("dashboard"), async () => {
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

    return {
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
          badge:
            pendingTranscripts === 1
              ? "1 pending request"
              : `${pendingTranscripts} pending requests`,
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
    };
    });

    res.json(payload);
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
    const rows = await withAdminCache(getAdminCacheKey("users"), async () => {
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

      return result.rows;
    });

    res.json(rows);
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

    await invalidateAdminCacheKeys([
      getAdminCacheKey("dashboard"),
      getAdminCacheKey("users"),
    ]);

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

    await invalidateAdminCacheKeys([
      getAdminCacheKey("dashboard"),
      getAdminCacheKey("users"),
    ]);

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

    await invalidateAdminCacheKeys([
      getAdminCacheKey("dashboard"),
      getAdminCacheKey("users"),
    ]);

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

    await invalidateAdminCacheKeys([getAdminCacheKey("users")]);

    res.json({ user_id, is_active: result.rows[0].is_active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


/* =========================================================
   🔹 COURSES
========================================================= */
router.get("/courses", verifyJWT, adminOnly, async (req, res) => {
  try {
    const rows = await withAdminCache(getAdminCacheKey("courses"), async () => {
      await ensurePrerequisitesTable();
      const result = await db.query(
        `
        SELECT
          c.course_id,
          c.name,
          c.code,
          c.department_id,
          COALESCE(c.credits, c.credit_hours, 3) AS credits,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'prerequisite_id', p.prerequisite_id,
                'required_course_id', rc.course_id,
                'required_course_code', rc.code,
                'required_course_name', rc.name
              )
              ORDER BY rc.code
            ) FILTER (WHERE p.prerequisite_id IS NOT NULL),
            '[]'::json
          ) AS prerequisites
        FROM courses c
        LEFT JOIN prerequisites p ON p.course_id = c.course_id
        LEFT JOIN courses rc ON rc.course_id = p.required_course_id
        GROUP BY c.course_id, c.name, c.code, c.department_id, c.credits, c.credit_hours
        ORDER BY c.course_id ASC
        `,
      );
      return result.rows;
    });
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.post("/courses", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { name, code, department_id } = req.body;
    const credits = Number(req.body?.credits ?? req.body?.credit_hours ?? 3);
    const result = await db.query(
      "INSERT INTO courses (name, code, department_id, credits, credit_hours) VALUES ($1,$2,$3,$4,$4) RETURNING *",
      [name, code, department_id, credits]
    );
    await invalidateAdminCacheKeys([
      getAdminCacheKey("dashboard"),
      getAdminCacheKey("courses"),
      getAdminCacheKey("course-prerequisites"),
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.get("/course-prerequisites", verifyJWT, adminOnly, async (req, res) => {
  try {
    const rows = await withAdminCache(
      getAdminCacheKey("course-prerequisites"),
      async () => {
        await ensurePrerequisitesTable();
        const result = await db.query(`
          SELECT
            p.prerequisite_id,
            p.course_id,
            c.code AS course_code,
            c.name AS course_name,
            p.required_course_id,
            rc.code AS required_course_code,
            rc.name AS required_course_name
          FROM prerequisites p
          JOIN courses c ON c.course_id = p.course_id
          JOIN courses rc ON rc.course_id = p.required_course_id
          ORDER BY c.code ASC, rc.code ASC
        `);
        return result.rows;
      },
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/courses/:courseId/prerequisites", verifyJWT, adminOnly, async (req, res) => {
  try {
    await ensurePrerequisitesTable();

    const courseId = Number(req.params.courseId);
    const rawIds = Array.isArray(req.body?.required_course_ids) ? req.body.required_course_ids : [];
    const requiredCourseIds = [...new Set(rawIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({ message: "Valid courseId is required" });
    }
    if (requiredCourseIds.includes(courseId)) {
      return res.status(400).json({ message: "A course cannot be a prerequisite of itself" });
    }

    const courseCheck = await db.query(
      "SELECT course_id FROM courses WHERE course_id = $1 LIMIT 1",
      [courseId],
    );
    if (!courseCheck.rows.length) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (requiredCourseIds.length) {
      const requiredCheck = await db.query(
        "SELECT course_id FROM courses WHERE course_id = ANY($1::int[])",
        [requiredCourseIds],
      );
      if (requiredCheck.rows.length !== requiredCourseIds.length) {
        return res.status(400).json({ message: "One or more prerequisite courses do not exist" });
      }
    }

    await db.query("DELETE FROM prerequisites WHERE course_id = $1", [courseId]);
    for (const requiredCourseId of requiredCourseIds) {
      await db.query(
        `
        INSERT INTO prerequisites (course_id, required_course_id)
        VALUES ($1, $2)
        ON CONFLICT (course_id, required_course_id) DO NOTHING
        `,
        [courseId, requiredCourseId],
      );
    }

    const result = await db.query(`
      SELECT
        p.prerequisite_id,
        p.course_id,
        p.required_course_id,
        rc.code AS required_course_code,
        rc.name AS required_course_name
      FROM prerequisites p
      JOIN courses rc ON rc.course_id = p.required_course_id
      WHERE p.course_id = $1
      ORDER BY rc.code ASC
    `, [courseId]);

    await invalidateAdminCacheKeys([
      getAdminCacheKey("courses"),
      getAdminCacheKey("course-prerequisites"),
    ]);

    res.json({
      message: "Course prerequisites updated",
      course_id: courseId,
      prerequisites: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   🔹 CLASSES
========================================================= */
// GET all classes with course & professor info
router.get("/classes", verifyJWT, adminOnly, async (req, res) => {
  try {
    const rows = await withAdminCache(getAdminCacheKey("classes"), async () => {
      const result = await db.query(`
        SELECT c.*,
               cr.name AS course_name,
               cr.code AS course_code,
               p.professor_id AS professor_id,
               p.user_id AS professor_user_id,
               u.email AS professor_email
        FROM classes c
        LEFT JOIN courses cr ON c.course_id = cr.course_id
        LEFT JOIN professors p ON c.professor_id = p.professor_id
        LEFT JOIN users u ON p.user_id = u.user_id
        ORDER BY c.class_id ASC
      `);
      return result.rows;
    });
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

// POST create class
router.post("/classes", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { course_id, semester, year, professor_id } = req.body;
    if (!course_id || !semester || !year || !professor_id) {
      return res.status(400).json({
        message: "course_id, semester, year, and professor_id are required",
      });
    }

    const resolvedProfessorId = await resolveProfessorId(professor_id);
    if (!resolvedProfessorId) {
      return res.status(400).json({ message: "Invalid professor_id" });
    }

    const result = await db.query(
      "INSERT INTO classes (course_id, semester, year, professor_id) VALUES ($1,$2,$3,$4) RETURNING *",
      [course_id, semester, year, resolvedProfessorId]
    );
    await invalidateAdminCacheKeys([getAdminCacheKey("classes")]);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

// PUT assign/change professor
router.put("/classes/:id/professor", verifyJWT, adminOnly, async (req, res) => {
  try {
    const class_id = req.params.id;
    const { professor_id } = req.body;
    const resolvedProfessorId = await resolveProfessorId(professor_id);
    if (!resolvedProfessorId) {
      return res.status(400).json({ message: "Invalid professor_id" });
    }

    const result = await db.query(
      "UPDATE classes SET professor_id=$1 WHERE class_id=$2 RETURNING *",
      [resolvedProfessorId, class_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Class not found" });
    }
    await invalidateAdminCacheKeys([getAdminCacheKey("classes")]);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

/* =========================================================
   🔹 EXAMS
========================================================= */
router.get("/classes/:id/exams", verifyJWT, adminOnly, async (req, res) => {
  try {
    const class_id = req.params.id;
    const rows = await withAdminCache(
      getAdminCacheKey("class-exams", class_id),
      async () => {
        const result = await db.query(
          "SELECT * FROM exam_schedules WHERE class_id=$1 ORDER BY exam_date ASC",
          [class_id]
        );
        return result.rows;
      },
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

// POST create exam
router.post("/classes/:id/exams", verifyJWT, adminOnly, async (req, res) => {
  const class_id = req.params.id;
  const { exam_type, exam_date, start_time, end_time, location } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO exam_schedules 
       (class_id, exam_type, exam_date, start_time, end_time, location) 
       VALUES ($1,$2,$3,$4,$5,$6) 
       RETURNING *`,
      [class_id, exam_type, exam_date, start_time, end_time, location]
    );
    await invalidateAdminCacheKeys([
      getAdminCacheKey("class-exams", class_id),
      getAdminCacheKey("exams"),
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET all exams with class + course info
router.get("/exams", verifyJWT, adminOnly, async (req, res) => {
  try {
    const rows = await withAdminCache(getAdminCacheKey("exams"), async () => {
      const result = await db.query(`
        SELECT es.*, c.semester, c.year, cr.course_id, cr.name AS course_name, cr.code AS course_code
        FROM exam_schedules es
        JOIN classes c ON es.class_id = c.class_id
        JOIN courses cr ON c.course_id = cr.course_id
        ORDER BY es.exam_date ASC
      `);
      return result.rows;
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* =========================================================
   🔹 TRANSCRIPT REQUESTS
========================================================= */
router.get("/transcript-requests", verifyJWT, adminOnly, async (req, res) => {
  try {
    const rows = await withAdminCache(
      getAdminCacheKey("transcript-requests"),
      async () => {
        const [hasTranscriptType, hasReadyForCollection] = await Promise.all([
          columnExists("transcript_requests", "transcript_type"),
          columnExists("transcript_requests", "ready_for_collection"),
        ]);
        const result = await db.query(`
          SELECT tr.request_id, tr.status, tr.created_at,
                 ${hasTranscriptType ? "tr.transcript_type" : "'official'::text AS transcript_type"},
                 ${hasReadyForCollection ? "tr.ready_for_collection" : "FALSE AS ready_for_collection"},
                 s.student_id, u.email AS student_email,
                 d.name AS department_name
          FROM transcript_requests tr
          JOIN students s ON tr.student_id = s.student_id
          JOIN users u ON s.user_id = u.user_id
          JOIN departments d ON s.department_id = d.department_id
          ORDER BY tr.created_at DESC
        `);
        return result.rows;
      },
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.put("/transcript-requests/:id", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { status, ready_for_collection } = req.body;
    const request_id = req.params.id;
    const hasReadyForCollection = await columnExists(
      "transcript_requests",
      "ready_for_collection",
    );

    if (!status && typeof ready_for_collection !== "boolean") {
      return res.status(400).json({ message: "status or ready_for_collection is required" });
    }
    if (!hasReadyForCollection && typeof ready_for_collection === "boolean") {
      return res.status(400).json({
        message: "Database schema is outdated. Run migration 004_transcript_request_fields.sql",
      });
    }

    const currentResult = await db.query(
      `SELECT status${
        hasReadyForCollection ? ", ready_for_collection" : ""
      } FROM transcript_requests WHERE request_id=$1`,
      [request_id]
    );
    if (!currentResult.rows.length) {
      return res.status(404).json({ message: "Transcript request not found" });
    }

    const current = currentResult.rows[0];
    const nextStatus = status || current.status;
    let result;
    if (hasReadyForCollection) {
      const nextReady =
        typeof ready_for_collection === "boolean"
          ? ready_for_collection
          : String(nextStatus || "").toLowerCase() === "approved"
            ? current.ready_for_collection
            : false;
      result = await db.query(
        "UPDATE transcript_requests SET status=$1, ready_for_collection=$2 WHERE request_id=$3 RETURNING *",
        [nextStatus, nextReady, request_id]
      );
    } else {
      result = await db.query(
        "UPDATE transcript_requests SET status=$1 WHERE request_id=$2 RETURNING *",
        [nextStatus, request_id]
      );
    }
    await invalidateAdminCacheKeys([
      getAdminCacheKey("dashboard"),
      getAdminCacheKey("transcript-requests"),
    ]);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

/* =========================================================
   🔹 FEES CONFIGURATION
========================================================= */
router.get("/fees/tuition-rules", verifyJWT, adminOnly, async (req, res) => {
  try {
    const rows = await withAdminCache(
      getAdminCacheKey("fees-tuition-rules"),
      async () => {
        const hasRules = await tableExists("tuition_rules");
        if (!hasRules) {
          return { __error: "Fees schema not initialized. Run migration 005_fees_module.sql" };
        }
        const result = await db.query(
          `
          SELECT rule_id, first_college_year, credit_hour_price, created_at
          FROM tuition_rules
          ORDER BY first_college_year ASC
          `,
        );
        return result.rows;
      },
    );
    if (rows?.__error) {
      return res.status(400).json({ message: rows.__error });
    }
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.post("/fees/tuition-rules", verifyJWT, adminOnly, async (req, res) => {
  try {
    const hasRules = await tableExists("tuition_rules");
    if (!hasRules) {
      return res.status(400).json({
        message: "Fees schema not initialized. Run migration 005_fees_module.sql",
      });
    }
    const firstCollegeYear = Number(req.body?.first_college_year);
    const creditHourPrice = Number(req.body?.credit_hour_price);
    if (!Number.isInteger(firstCollegeYear) || firstCollegeYear < 2000 || firstCollegeYear > 2100) {
      return res.status(400).json({ message: "first_college_year must be between 2000 and 2100" });
    }
    if (!Number.isFinite(creditHourPrice) || creditHourPrice <= 0) {
      return res.status(400).json({ message: "credit_hour_price must be greater than 0" });
    }

    const result = await db.query(
      `
      INSERT INTO tuition_rules (first_college_year, credit_hour_price)
      VALUES ($1, $2)
      ON CONFLICT (first_college_year)
      DO UPDATE SET credit_hour_price = EXCLUDED.credit_hour_price
      RETURNING rule_id, first_college_year, credit_hour_price, created_at
      `,
      [firstCollegeYear, creditHourPrice],
    );
    await invalidateAdminCacheKeys([getAdminCacheKey("fees-tuition-rules")]);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.delete("/fees/tuition-rules/:id", verifyJWT, adminOnly, async (req, res) => {
  try {
    const hasRules = await tableExists("tuition_rules");
    if (!hasRules) {
      return res.status(400).json({
        message: "Fees schema not initialized. Run migration 005_fees_module.sql",
      });
    }
    const ruleId = Number(req.params.id);
    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      return res.status(400).json({ message: "Invalid rule id" });
    }
    const result = await db.query(
      "DELETE FROM tuition_rules WHERE rule_id = $1 RETURNING rule_id",
      [ruleId],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Tuition rule not found" });
    }
    await invalidateAdminCacheKeys([getAdminCacheKey("fees-tuition-rules")]);
    res.json({ message: "Tuition rule deleted" });
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.get("/fees/components", verifyJWT, adminOnly, async (req, res) => {
  try {
    const rows = await withAdminCache(
      getAdminCacheKey("fees-components"),
      async () => {
        const hasComponents = await tableExists("fee_components");
        if (!hasComponents) {
          return { __error: "Fees schema not initialized. Run migration 005_fees_module.sql" };
        }
        const result = await db.query(
          `
          SELECT component_key, label, amount, is_active
          FROM fee_components
          ORDER BY component_key ASC
          `,
        );
        return result.rows;
      },
    );
    if (rows?.__error) {
      return res.status(400).json({ message: rows.__error });
    }
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.put("/fees/components/:key", verifyJWT, adminOnly, async (req, res) => {
  try {
    const hasComponents = await tableExists("fee_components");
    if (!hasComponents) {
      return res.status(400).json({
        message: "Fees schema not initialized. Run migration 005_fees_module.sql",
      });
    }
    const componentKey = String(req.params.key || "").trim();
    const { label, amount, is_active } = req.body || {};
    if (!componentKey) {
      return res.status(400).json({ message: "component key is required" });
    }
    if (label != null && String(label).trim().length === 0) {
      return res.status(400).json({ message: "label cannot be empty" });
    }
    if (amount != null && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      return res.status(400).json({ message: "amount must be a number >= 0" });
    }

    const current = await db.query(
      `
      SELECT component_key, label, amount, is_active
      FROM fee_components
      WHERE component_key = $1
      LIMIT 1
      `,
      [componentKey],
    );
    if (!current.rows.length) {
      return res.status(404).json({ message: "Fee component not found" });
    }
    const row = current.rows[0];
    const nextLabel = label != null ? String(label).trim() : row.label;
    const nextAmount = amount != null ? Number(amount) : row.amount;
    const nextActive = typeof is_active === "boolean" ? is_active : row.is_active;

    const updated = await db.query(
      `
      UPDATE fee_components
      SET label = $1, amount = $2, is_active = $3
      WHERE component_key = $4
      RETURNING component_key, label, amount, is_active
      `,
      [nextLabel, nextAmount, nextActive, componentKey],
    );
    await invalidateAdminCacheKeys([getAdminCacheKey("fees-components")]);
    res.json(updated.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

/* =========================================================
   🔹 REGISTRATION WINDOWS (by first college year)
========================================================= */
router.get("/registration-windows", verifyJWT, adminOnly, async (req, res) => {
  try {
    const rows = await withAdminCache(
      getAdminCacheKey("registration-windows"),
      async () => {
        const hasWindows = await tableExists("registration_windows");
        if (!hasWindows) {
          return {
            __error:
              "Registration windows schema not initialized. Run migration 007_registration_windows.sql",
          };
        }
        const result = await db.query(
          `
          SELECT window_id, first_college_year, semester, year, opens_at, closes_at, is_active, created_at
          FROM registration_windows
          ORDER BY year DESC, semester ASC, first_college_year ASC
          `,
        );
        return result.rows;
      },
    );
    if (rows?.__error) {
      return res.status(400).json({ message: rows.__error });
    }
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.post("/registration-windows", verifyJWT, adminOnly, async (req, res) => {
  try {
    const hasWindows = await tableExists("registration_windows");
    if (!hasWindows) {
      return res.status(400).json({
        message: "Registration windows schema not initialized. Run migration 007_registration_windows.sql",
      });
    }
    const firstCollegeYear = Number(req.body?.first_college_year);
    const semester = String(req.body?.semester || "").trim();
    const year = Number(req.body?.year);
    const opensAt = req.body?.opens_at;
    const closesAt = req.body?.closes_at;
    const isActive = req.body?.is_active == null ? true : !!req.body?.is_active;

    if (!Number.isInteger(firstCollegeYear) || firstCollegeYear < 2000 || firstCollegeYear > 2100) {
      return res.status(400).json({ message: "first_college_year must be between 2000 and 2100" });
    }
    if (!semester) {
      return res.status(400).json({ message: "semester is required" });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ message: "year must be between 2000 and 2100" });
    }
    if (!opensAt || !closesAt) {
      return res.status(400).json({ message: "opens_at and closes_at are required" });
    }

    const result = await db.query(
      `
      INSERT INTO registration_windows (first_college_year, semester, year, opens_at, closes_at, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (first_college_year, semester, year)
      DO UPDATE
      SET opens_at = EXCLUDED.opens_at,
          closes_at = EXCLUDED.closes_at,
          is_active = EXCLUDED.is_active
      RETURNING window_id, first_college_year, semester, year, opens_at, closes_at, is_active, created_at
      `,
      [firstCollegeYear, semester, year, opensAt, closesAt, isActive],
    );
    await invalidateAdminCacheKeys([getAdminCacheKey("registration-windows")]);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.delete("/registration-windows/:id", verifyJWT, adminOnly, async (req, res) => {
  try {
    const hasWindows = await tableExists("registration_windows");
    if (!hasWindows) {
      return res.status(400).json({
        message: "Registration windows schema not initialized. Run migration 007_registration_windows.sql",
      });
    }
    const windowId = Number(req.params.id);
    if (!Number.isInteger(windowId) || windowId <= 0) {
      return res.status(400).json({ message: "Invalid window id" });
    }
    const result = await db.query(
      "DELETE FROM registration_windows WHERE window_id = $1 RETURNING window_id",
      [windowId],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Registration window not found" });
    }
    await invalidateAdminCacheKeys([getAdminCacheKey("registration-windows")]);
    res.json({ message: "Registration window deleted" });
  } catch (err) { console.error(err); res.status(500).json({ message: err.message }); }
});

router.get("/registration-load-policy", verifyJWT, adminOnly, async (req, res) => {
  try {
    const row = await withAdminCache(
      getAdminCacheKey("registration-load-policy"),
      async () => {
        const hasPolicy = await tableExists("registration_load_policies");
        if (!hasPolicy) {
          return {
            __error:
              "Registration load policy schema not initialized. Run migration 012_registration_load_policy.sql",
          };
        }

        const result = await db.query(
          `
          SELECT
            policy_id,
            halfload_gpa_threshold,
            halfload_max_credits,
            regular_max_credits,
            overload_gpa_threshold,
            overload_max_credits,
            updated_at
          FROM registration_load_policies
          ORDER BY policy_id DESC
          LIMIT 1
          `,
        );

        return result.rows[0] || null;
      },
    );

    if (row?.__error) {
      return res.status(400).json({ message: row.__error });
    }

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/registration-load-policy", verifyJWT, adminOnly, async (req, res) => {
  try {
    const hasPolicy = await tableExists("registration_load_policies");
    if (!hasPolicy) {
      return res.status(400).json({
        message: "Registration load policy schema not initialized. Run migration 012_registration_load_policy.sql",
      });
    }

    const halfloadGpaThreshold = Number(req.body?.halfload_gpa_threshold);
    const halfloadMaxCredits = Number(req.body?.halfload_max_credits);
    const regularMaxCredits = Number(req.body?.regular_max_credits);
    const overloadGpaThreshold = Number(req.body?.overload_gpa_threshold);
    const overloadMaxCredits = Number(req.body?.overload_max_credits);
    const updatedBy = req.user?.userId ?? req.user?.user_id ?? req.user?.id;

    if (
      !Number.isFinite(halfloadGpaThreshold) ||
      !Number.isFinite(overloadGpaThreshold) ||
      halfloadGpaThreshold < 0 ||
      overloadGpaThreshold < 0 ||
      halfloadGpaThreshold > 4 ||
      overloadGpaThreshold > 4
    ) {
      return res.status(400).json({ message: "GPA thresholds must be between 0.00 and 4.00" });
    }

    if (
      !Number.isInteger(halfloadMaxCredits) ||
      !Number.isInteger(regularMaxCredits) ||
      !Number.isInteger(overloadMaxCredits) ||
      halfloadMaxCredits <= 0 ||
      regularMaxCredits < halfloadMaxCredits ||
      overloadMaxCredits < regularMaxCredits
    ) {
      return res.status(400).json({
        message: "Credit limits must be positive integers and satisfy halfload <= regular <= overload",
      });
    }

    if (overloadGpaThreshold < halfloadGpaThreshold) {
      return res.status(400).json({
        message: "The overload GPA threshold must be greater than or equal to the halfload threshold",
      });
    }

    const result = await db.query(
      `
      INSERT INTO registration_load_policies (
        halfload_gpa_threshold,
        halfload_max_credits,
        regular_max_credits,
        overload_gpa_threshold,
        overload_max_credits,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        policy_id,
        halfload_gpa_threshold,
        halfload_max_credits,
        regular_max_credits,
        overload_gpa_threshold,
        overload_max_credits,
        updated_at
      `,
      [
        halfloadGpaThreshold,
        halfloadMaxCredits,
        regularMaxCredits,
        overloadGpaThreshold,
        overloadMaxCredits,
        updatedBy,
      ],
    );

    await invalidateAdminCacheKeys([
      getAdminCacheKey("registration-load-policy"),
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
