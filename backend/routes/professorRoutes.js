const express = require("express");
const router = express.Router();

const db = require("../data/db");
const { verifyJWT, professorOnly } = require("../middleware/auth");

function getUserId(req) {
  return req.user?.userId ?? req.user?.user_id ?? req.user?.id;
}

// =====================================================
// DASHBOARD & OVERVIEW
// =====================================================
router.get("/dashboard", verifyJWT, professorOnly, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Get professor info and department
    const profRes = await db.query(
      `
      SELECT p.professor_id, d.name AS department_name
      FROM professors p
      JOIN departments d ON d.department_id = p.department_id
      WHERE p.user_id = $1
      `,
      [userId]
    );

    if (profRes.rows.length === 0) {
      return res.status(404).json({ message: "Professor profile not found" });
    }

    const professor = profRes.rows[0];
    const professorId = professor.professor_id;

    // Active Courses
    const classesRes = await db.query(
      `SELECT COUNT(*)::int as count FROM classes WHERE professor_id = $1`,
      [professorId]
    );
    const activeCourses = classesRes.rows[0].count;

    // Total Students
    const studentsRes = await db.query(
      `
      SELECT COUNT(DISTINCT e.student_id)::int as count
      FROM enrollments e
      JOIN classes c ON e.class_id = c.class_id
      WHERE c.professor_id = $1
      `,
      [professorId]
    );
    const totalStudents = studentsRes.rows[0].count;

    // Pending Grading
    const pendingGradingRes = await db.query(
      `
      SELECT COUNT(*)::int AS count
      FROM enrollments e
      JOIN classes c ON c.class_id = e.class_id
      WHERE c.professor_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM grades g
          WHERE g.enrollment_id = e.enrollment_id
        )
      `,
      [professorId]
    );
    const pendingGrading = pendingGradingRes.rows[0]?.count ?? 0;

    // Classes Today
    const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const todayClassesRes = await db.query(
      `
      SELECT c.class_id, co.name, co.code, c.time_start, c.time_end, c.location, COUNT(e.student_id) as enrolled
      FROM classes c
      JOIN courses co ON c.course_id = co.course_id
      LEFT JOIN enrollments e ON c.class_id = e.class_id
      WHERE c.professor_id = $1 AND c.day = $2
      GROUP BY c.class_id, co.name, co.code, c.time_start, c.time_end, c.location
      ORDER BY c.time_start
      `,
      [professorId, dayName]
    );

    const recentActivityRes = await db.query(
      `
      SELECT *
      FROM (
        SELECT
          g.graded_at AS ts,
          'grade'::text AS kind,
          co.code AS course_code,
          co.name AS course_name,
          u.email AS student_email
        FROM grades g
        JOIN enrollments e ON e.enrollment_id = g.enrollment_id
        JOIN classes c ON c.class_id = e.class_id
        JOIN courses co ON co.course_id = c.course_id
        JOIN students s ON s.student_id = e.student_id
        JOIN users u ON u.user_id = s.user_id
        WHERE c.professor_id = $1

        UNION ALL

        SELECT
          a.recorded_at AS ts,
          'attendance'::text AS kind,
          co.code AS course_code,
          co.name AS course_name,
          u.email AS student_email
        FROM attendance a
        JOIN enrollments e ON e.enrollment_id = a.enrollment_id
        JOIN classes c ON c.class_id = e.class_id
        JOIN courses co ON co.course_id = c.course_id
        JOIN students s ON s.student_id = e.student_id
        JOIN users u ON u.user_id = s.user_id
        WHERE c.professor_id = $1
      ) x
      ORDER BY ts DESC
      LIMIT 8
      `,
      [professorId],
    );

    const coursePerfRes = await db.query(
      `
      SELECT
        c.class_id,
        co.code AS course_code,
        co.name AS course_name,
        COUNT(DISTINCT e.student_id)::int AS students,
        COALESCE(
          ROUND(AVG((g.score::numeric / NULLIF(g.max_score, 0)) * 100), 2),
          0
        ) AS avg_grade_percent,
        COALESCE(
          ROUND(
            CASE WHEN COUNT(a.attendance_id) = 0 THEN 0
            ELSE (SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(a.attendance_id)) * 100
            END
          , 2),
          0
        ) AS avg_attendance_percent
      FROM classes c
      JOIN courses co ON co.course_id = c.course_id
      LEFT JOIN enrollments e ON e.class_id = c.class_id
      LEFT JOIN grades g ON g.enrollment_id = e.enrollment_id
      LEFT JOIN attendance a ON a.enrollment_id = e.enrollment_id
      WHERE c.professor_id = $1
      GROUP BY c.class_id, co.code, co.name
      ORDER BY co.code ASC
      `,
      [professorId],
    );

    const pendingAttendanceRes = await db.query(
      `
      SELECT COUNT(*)::int AS count
      FROM enrollments e
      JOIN classes c ON c.class_id = e.class_id
      WHERE c.professor_id = $1
        AND c.day = $2
        AND NOT EXISTS (
          SELECT 1
          FROM attendance a
          WHERE a.enrollment_id = e.enrollment_id
            AND a.class_date = CURRENT_DATE
        )
      `,
      [professorId, dayName],
    );

    const pendingAnnouncementsRes = await db.query(
      `
      SELECT COUNT(*)::int AS count
      FROM course_announcements ca
      JOIN classes c ON c.class_id = ca.class_id
      WHERE c.professor_id = $1
        AND ca.is_published = FALSE
      `,
      [professorId],
    );

    const submissions = recentActivityRes.rows.map((r) => ({
      title:
        r.kind === "grade"
          ? `Graded ${r.student_email}`
          : `Attendance updated for ${r.student_email}`,
      meta: `${r.course_code} - ${r.course_name}`,
      when: r.ts,
    }));

    const coursePerformance = coursePerfRes.rows.map((r) => ({
      course: `${r.course_code} - ${r.course_name}`,
      avg: Number(r.avg_grade_percent || 0),
      attendance: Number(r.avg_attendance_percent || 0),
      students: Number(r.students || 0),
    }));

    const pendingTasks = [
      { key: "grading", title: "Pending Grading", count: pendingGrading, route: "/professor/grades" },
      {
        key: "attendance",
        title: "Attendance Not Marked Today",
        count: Number(pendingAttendanceRes.rows[0]?.count || 0),
        route: "/professor/attendance",
      },
      {
        key: "announcements",
        title: "Unpublished Course Announcements",
        count: Number(pendingAnnouncementsRes.rows[0]?.count || 0),
        route: "/professor/announcements",
      },
    ];

    res.json({
      header: {
        title: "Professor Portal",
        subtitle: "Overview of your teaching workload",
        department: professor.department_name || "Faculty",
      },
      stats: [
        { label: "Active Courses", value: activeCourses },
        { label: "Total Students", value: totalStudents },
        { label: "Pending Grading", value: pendingGrading },
        { label: "Classes Today", value: todayClassesRes.rows.length },
      ],
      quickActions: [
        { key: "attendance", label: "Mark Attendance" },
        { key: "grades", label: "Enter Grades" },
        { key: "announce", label: "View Announcements" },
        { key: "students", label: "My Classes" },
      ],
      todaySchedule: todayClassesRes.rows.map(c => ({
        course: c.code,
        name: c.name,
        time: `${c.time_start} - ${c.time_end}`,
        location: c.location,
        students: c.enrolled,
        classId: c.class_id,
      })),
      submissions: [],
      coursePerformance,
      pendingTasks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// =====================================================
// CLASSES MANAGEMENT
// =====================================================

async function listProfessorClasses(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const result = await db.query(
      `
      SELECT
        c.class_id,
        co.code,
        co.name,
        c.semester
      FROM classes c
      JOIN courses co ON co.course_id = c.course_id
      JOIN professors p ON c.professor_id = p.professor_id
      WHERE p.user_id = $1
      ORDER BY c.semester DESC, co.code ASC
      `,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/professor/classes
router.get("/classes", verifyJWT, professorOnly, listProfessorClasses);

// GET /api/professor/classes/list
router.get("/classes/list", verifyJWT, professorOnly, listProfessorClasses);

// GET /api/professor/classes/:classId
router.get("/classes/:classId", verifyJWT, professorOnly, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    if (isNaN(classId)) {
      return res.status(400).json({ message: "Invalid class ID" });
    }
    const userId = getUserId(req);

    const classRes = await db.query(
      `
      SELECT c.*, co.name, co.code, co.credits
      FROM classes c
      JOIN courses co ON c.course_id = co.course_id
      JOIN professors p ON c.professor_id = p.professor_id
      WHERE c.class_id = $1 AND p.user_id = $2
      `,
      [classId, userId]
    );

    if (classRes.rows.length === 0)
      return res.status(404).json({ message: "Class not found" });

    res.json(classRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// =====================================================
// STUDENT MANAGEMENT
// =====================================================
router.get("/classes/:classId/students", verifyJWT, professorOnly, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const userId = getUserId(req);

    // Verify professor owns class
    const classRes = await db.query(
      `SELECT c.class_id FROM classes c JOIN professors p ON c.professor_id = p.professor_id WHERE c.class_id = $1 AND p.user_id = $2`,
      [classId, userId]
    );
    if (classRes.rows.length === 0)
      return res.status(404).json({ message: "Class not found" });

    const result = await db.query(
      `
      SELECT 
        e.enrollment_id,
        s.student_id,
        u.email,
        u.user_id,
        COUNT(DISTINCT g.grade_id) as grades_count,
        COUNT(DISTINCT a.attendance_id) as attendance_count,
        ROUND(AVG(g.score)::numeric, 2) as avg_grade
      FROM enrollments e
      JOIN students s ON e.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN grades g ON e.enrollment_id = g.enrollment_id
      LEFT JOIN attendance a ON e.enrollment_id = a.enrollment_id
      WHERE e.class_id = $1
      GROUP BY e.enrollment_id, s.student_id, u.email, u.user_id
      ORDER BY u.email
      `,
      [classId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// =====================================================
// GRADES MANAGEMENT
// =====================================================

// GET /api/professor/classes/:classId/grades
router.get("/classes/:classId/grades", verifyJWT, professorOnly, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const userId = getUserId(req);

    const classRes = await db.query(
      `SELECT c.class_id FROM classes c JOIN professors p ON c.professor_id = p.professor_id WHERE c.class_id = $1 AND p.user_id = $2`,
      [classId, userId]
    );
    if (classRes.rows.length === 0)
      return res.status(404).json({ message: "Class not found" });

    const result = await db.query(
      `
      SELECT g.grade_id, g.enrollment_id, g.assessment_type, g.score, g.max_score, g.graded_at,
             u.email, s.student_id
      FROM grades g
      JOIN enrollments e ON g.enrollment_id = e.enrollment_id
      JOIN students s ON e.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      WHERE e.class_id = $1
      ORDER BY u.email, g.assessment_type
      `,
      [classId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/professor/grades
router.post("/grades", verifyJWT, professorOnly, async (req, res) => {
  try {
    const { enrollmentId, assessmentType, score, maxScore } = req.body;
    const userId = getUserId(req);

    if (!enrollmentId || !assessmentType || score === undefined)
      return res.status(400).json({ message: "Missing required fields" });

    const verifyRes = await db.query(
      `SELECT e.enrollment_id FROM enrollments e
       JOIN classes c ON e.class_id = c.class_id
       JOIN professors p ON c.professor_id = p.professor_id
       WHERE e.enrollment_id = $1 AND p.user_id = $2`,
      [enrollmentId, userId]
    );
    if (verifyRes.rows.length === 0)
      return res.status(403).json({ message: "Access denied" });

    const existingRes = await db.query(
      `SELECT grade_id FROM grades WHERE enrollment_id = $1 AND assessment_type = $2`,
      [enrollmentId, assessmentType]
    );

    let result;
    if (existingRes.rows.length > 0) {
      result = await db.query(
        `UPDATE grades SET score=$1, max_score=$2, graded_at=NOW()
         WHERE enrollment_id=$3 AND assessment_type=$4 RETURNING *`,
        [score, maxScore || 100, enrollmentId, assessmentType]
      );
    } else {
      result = await db.query(
        `INSERT INTO grades (enrollment_id, assessment_type, score, max_score, graded_at)
         VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
        [enrollmentId, assessmentType, score, maxScore || 100]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// =====================================================
// ATTENDANCE MANAGEMENT
// =====================================================
router.get("/classes/:classId/attendance", verifyJWT, professorOnly, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const userId = getUserId(req);

    const classRes = await db.query(
      `SELECT c.class_id FROM classes c JOIN professors p ON c.professor_id = p.professor_id WHERE c.class_id = $1 AND p.user_id = $2`,
      [classId, userId]
    );
    if (classRes.rows.length === 0)
      return res.status(404).json({ message: "Class not found" });

    const result = await db.query(
      `
      SELECT a.attendance_id, a.enrollment_id, a.class_date, a.status, a.notes, a.recorded_at,
             u.email, s.student_id
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.enrollment_id
      JOIN students s ON e.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      WHERE e.class_id = $1
      ORDER BY a.class_date DESC, u.email
      `,
      [classId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/professor/attendance
router.post("/attendance", verifyJWT, professorOnly, async (req, res) => {
  try {
    const { enrollmentId, classDate, status, notes } = req.body;
    const userId = getUserId(req);

    if (!enrollmentId || !classDate || !status)
      return res.status(400).json({ message: "Missing required fields" });

    const validStatuses = ["Present", "Absent", "Late", "Excused"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const verifyRes = await db.query(
      `SELECT e.enrollment_id FROM enrollments e
       JOIN classes c ON e.class_id = c.class_id
       JOIN professors p ON c.professor_id = p.professor_id
       WHERE e.enrollment_id = $1 AND p.user_id = $2`,
      [enrollmentId, userId]
    );
    if (verifyRes.rows.length === 0)
      return res.status(403).json({ message: "Access denied" });

    const existingRes = await db.query(
      `SELECT attendance_id FROM attendance WHERE enrollment_id = $1 AND class_date = $2`,
      [enrollmentId, classDate]
    );

    let result;
    if (existingRes.rows.length > 0) {
      result = await db.query(
        `UPDATE attendance SET status=$1, notes=$2, recorded_at=NOW()
         WHERE enrollment_id=$3 AND class_date=$4 RETURNING *`,
        [status, notes || null, enrollmentId, classDate]
      );
    } else {
      result = await db.query(
        `INSERT INTO attendance (enrollment_id, class_date, status, notes, recorded_at)
         VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
        [enrollmentId, classDate, status, notes || null]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// =====================================================
// ANNOUNCEMENTS MANAGEMENT
// =====================================================
router.get("/classes/:classId/announcements", verifyJWT, professorOnly, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const userId = getUserId(req);

    const classRes = await db.query(
      `SELECT c.class_id FROM classes c JOIN professors p ON c.professor_id = p.professor_id WHERE c.class_id = $1 AND p.user_id = $2`,
      [classId, userId]
    );
    if (classRes.rows.length === 0)
      return res.status(404).json({ message: "Class not found" });

    const result = await db.query(
      `SELECT announcement_id, title, body, is_published, created_at, updated_at
       FROM course_announcements
       WHERE class_id = $1
       ORDER BY created_at DESC`,
      [classId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/professor/announcements
router.post("/announcements", verifyJWT, professorOnly, async (req, res) => {
  try {
    const { classId, title, body, isPublished } = req.body;
    const userId = getUserId(req);

    if (!classId || !title || !body)
      return res.status(400).json({ message: "Missing required fields" });

    const classRes = await db.query(
      `SELECT c.class_id FROM classes c JOIN professors p ON c.professor_id = p.professor_id WHERE c.class_id = $1 AND p.user_id = $2`,
      [classId, userId]
    );
    if (classRes.rows.length === 0)
      return res.status(403).json({ message: "Access denied" });

    const result = await db.query(
      `INSERT INTO course_announcements (class_id, title, body, created_by, is_published)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [classId, title, body, userId, isPublished !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/professor/announcements/:announcementId
router.put("/announcements/:announcementId", verifyJWT, professorOnly, async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { title, body, isPublished } = req.body;
    const userId = getUserId(req);

    const annRes = await db.query(
      `SELECT ca.announcement_id FROM course_announcements ca
       JOIN classes c ON ca.class_id = c.class_id
       JOIN professors p ON c.professor_id = p.professor_id
       WHERE ca.announcement_id=$1 AND p.user_id=$2`,
      [announcementId, userId]
    );
    if (annRes.rows.length === 0)
      return res.status(403).json({ message: "Access denied" });

    const result = await db.query(
      `UPDATE course_announcements SET title=$1, body=$2, is_published=$3, updated_at=NOW()
       WHERE announcement_id=$4 RETURNING *`,
      [title, body, isPublished !== false, announcementId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/professor/announcements/:announcementId
router.delete("/announcements/:announcementId", verifyJWT, professorOnly, async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = getUserId(req);

    const annRes = await db.query(
      `SELECT ca.announcement_id FROM course_announcements ca
       JOIN classes c ON ca.class_id = c.class_id
       JOIN professors p ON c.professor_id = p.professor_id
       WHERE ca.announcement_id=$1 AND p.user_id=$2`,
      [announcementId, userId]
    );
    if (annRes.rows.length === 0)
      return res.status(403).json({ message: "Access denied" });

    await db.query(`DELETE FROM course_announcements WHERE announcement_id=$1`, [announcementId]);
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
