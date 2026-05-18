const express = require("express");
const router = express.Router();

const db = require("../data/db");
const cache = require("../data/cache");
const { verifyJWT, professorOnly } = require("../middleware/auth");

const PROFESSOR_DASHBOARD_CACHE_TTL_SECONDS = 30;
const PROFESSOR_ASSIGNMENT_SUBMISSIONS_CACHE_TTL_SECONDS = 30;
const PROFESSOR_CLASS_GRADES_CACHE_TTL_SECONDS = 30;
const PROFESSOR_CLASS_ATTENDANCE_CACHE_TTL_SECONDS = 30;

function getUserId(req) {
  return req.user?.userId ?? req.user?.user_id ?? req.user?.id;
}

function getProfessorDashboardCacheKey(userId) {
  return `professor-dashboard:${userId}`;
}

async function getCachedProfessorDashboard(userId) {
  return cache.getCache(getProfessorDashboardCacheKey(userId));
}

async function setCachedProfessorDashboard(userId, payload) {
  await cache.setCache(
    getProfessorDashboardCacheKey(userId),
    payload,
    PROFESSOR_DASHBOARD_CACHE_TTL_SECONDS,
  );
}

async function invalidateProfessorDashboardCache(userId) {
  if (!userId) {
    return;
  }
  await cache.delCache(getProfessorDashboardCacheKey(userId));
}

function getProfessorAssignmentSubmissionsCacheKey(userId, assignmentId) {
  return `professor-assignment-submissions:${userId}:${assignmentId}`;
}

async function getCachedProfessorAssignmentSubmissions(userId, assignmentId) {
  return cache.getCache(
    getProfessorAssignmentSubmissionsCacheKey(userId, assignmentId),
  );
}

async function setCachedProfessorAssignmentSubmissions(
  userId,
  assignmentId,
  payload,
) {
  await cache.setCache(
    getProfessorAssignmentSubmissionsCacheKey(userId, assignmentId),
    payload,
    PROFESSOR_ASSIGNMENT_SUBMISSIONS_CACHE_TTL_SECONDS,
  );
}

async function invalidateProfessorAssignmentSubmissionsCache(userId, assignmentId) {
  if (!userId || !assignmentId) {
    return;
  }
  await cache.delCache(
    getProfessorAssignmentSubmissionsCacheKey(userId, assignmentId),
  );
}

function getProfessorClassGradesCacheKey(userId, classId) {
  return `professor-class-grades:${userId}:${classId}`;
}

async function getCachedProfessorClassGrades(userId, classId) {
  return cache.getCache(getProfessorClassGradesCacheKey(userId, classId));
}

async function setCachedProfessorClassGrades(userId, classId, payload) {
  await cache.setCache(
    getProfessorClassGradesCacheKey(userId, classId),
    payload,
    PROFESSOR_CLASS_GRADES_CACHE_TTL_SECONDS,
  );
}

async function invalidateProfessorClassGradesCache(userId, classId) {
  if (!userId || !classId) {
    return;
  }
  await cache.delCache(getProfessorClassGradesCacheKey(userId, classId));
}

function getProfessorClassAttendanceCacheKey(userId, classId) {
  return `professor-class-attendance:${userId}:${classId}`;
}

async function getCachedProfessorClassAttendance(userId, classId) {
  return cache.getCache(getProfessorClassAttendanceCacheKey(userId, classId));
}

async function setCachedProfessorClassAttendance(userId, classId, payload) {
  await cache.setCache(
    getProfessorClassAttendanceCacheKey(userId, classId),
    payload,
    PROFESSOR_CLASS_ATTENDANCE_CACHE_TTL_SECONDS,
  );
}

async function invalidateProfessorClassAttendanceCache(userId, classId) {
  if (!userId || !classId) {
    return;
  }
  await cache.delCache(getProfessorClassAttendanceCacheKey(userId, classId));
}

async function tableExists(tableName) {
  const r = await db.query(
    `
    SELECT to_regclass($1) IS NOT NULL AS exists
    `,
    [`public.${tableName}`],
  );
  return !!r.rows[0]?.exists;
}

async function getProfessorIdByUserId(userId) {
  const r = await db.query(
    `SELECT professor_id FROM professors WHERE user_id = $1`,
    [userId],
  );
  return r.rows[0]?.professor_id || null;
}

async function getAssignmentIdBySubmissionId(submissionId) {
  const r = await db.query(
    `SELECT assignment_id FROM assignment_submissions WHERE submission_id = $1`,
    [submissionId],
  );
  return r.rows[0]?.assignment_id || null;
}

async function getClassIdByEnrollmentId(enrollmentId) {
  const r = await db.query(
    `SELECT class_id FROM enrollments WHERE enrollment_id = $1`,
    [enrollmentId],
  );
  return r.rows[0]?.class_id || null;
}

async function assertAssignmentsSchema() {
  const [assignmentsOk, submissionsOk] = await Promise.all([
    tableExists("assignments"),
    tableExists("assignment_submissions"),
  ]);
  return assignmentsOk && submissionsOk;
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

    const cachedResponse = await getCachedProfessorDashboard(userId);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const [profRes, assignmentsSchemaOk] = await Promise.all([
      db.query(
        `
        SELECT p.professor_id, d.name AS department_name
        FROM professors p
        JOIN departments d ON d.department_id = p.department_id
        WHERE p.user_id = $1
        `,
        [userId],
      ),
      assertAssignmentsSchema(),
    ]);

    if (profRes.rows.length === 0) {
      return res.status(404).json({ message: "Professor profile not found" });
    }

    const professor = profRes.rows[0];
    const professorId = professor.professor_id;

    const summaryQuery = db.query(
      `
      WITH professor_classes AS (
        SELECT class_id, day
        FROM classes
        WHERE professor_id = $1
      ),
      professor_enrollments AS (
        SELECT e.enrollment_id, e.student_id, e.class_id
        FROM enrollments e
        JOIN professor_classes pc ON pc.class_id = e.class_id
      )
      SELECT
        (SELECT COUNT(*)::int FROM professor_classes) AS active_courses,
        (SELECT COUNT(DISTINCT student_id)::int FROM professor_enrollments) AS total_students,
        (
          SELECT COUNT(*)::int
          FROM professor_enrollments pe
          WHERE NOT EXISTS (
            SELECT 1
            FROM grades g
            WHERE g.enrollment_id = pe.enrollment_id
          )
        ) AS pending_grading,
        (
          SELECT COUNT(*)::int
          FROM professor_enrollments pe
          JOIN professor_classes pc ON pc.class_id = pe.class_id
          WHERE pc.day = $2
            AND NOT EXISTS (
              SELECT 1
              FROM attendance a
              WHERE a.enrollment_id = pe.enrollment_id
                AND a.class_date = CURRENT_DATE
            )
        ) AS pending_attendance,
        (
          SELECT COUNT(*)::int
          FROM course_announcements ca
          JOIN professor_classes pc ON pc.class_id = ca.class_id
          WHERE ca.is_published = FALSE
        ) AS pending_announcements
      `,
      [professorId, dayName],
    );

    const todayClassesQuery = db.query(
      `
      SELECT c.class_id, co.name, co.code, c.time_start, c.time_end, c.location, COUNT(e.student_id) as enrolled
      FROM classes c
      JOIN courses co ON c.course_id = co.course_id
      LEFT JOIN enrollments e ON c.class_id = e.class_id
      WHERE c.professor_id = $1 AND c.day = $2
      GROUP BY c.class_id, co.name, co.code, c.time_start, c.time_end, c.location
      ORDER BY c.time_start
      `,
      [professorId, dayName],
    );

    const recentActivityQuery = db.query(
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

    const coursePerfQuery = db.query(
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

    let pendingAssignmentReviews = 0;
    let recentSubmissionRows = [];
    const assignmentMetricsQuery = assignmentsSchemaOk
      ? Promise.all([
          db.query(
            `
            SELECT COUNT(*)::int AS count
            FROM assignment_submissions s
            JOIN assignments a ON a.assignment_id = s.assignment_id
            JOIN classes c ON c.class_id = a.class_id
            WHERE c.professor_id = $1
              AND LOWER(COALESCE(s.status, 'submitted')) = 'submitted'
            `,
            [professorId],
          ),
          db.query(
            `
            SELECT
              s.submitted_at AS ts,
              co.code AS course_code,
              co.name AS course_name,
              u.email AS student_email,
              a.title AS assignment_title
            FROM assignment_submissions s
            JOIN assignments a ON a.assignment_id = s.assignment_id
            JOIN classes c ON c.class_id = a.class_id
            JOIN courses co ON co.course_id = c.course_id
            JOIN students st ON st.student_id = s.student_id
            JOIN users u ON u.user_id = st.user_id
            WHERE c.professor_id = $1
            ORDER BY s.submitted_at DESC
            LIMIT 8
            `,
            [professorId],
          ),
        ])
      : Promise.resolve([null, null]);

    const [
      summaryRes,
      todayClassesRes,
      recentActivityRes,
      coursePerfRes,
      assignmentMetrics,
    ] = await Promise.all([
      summaryQuery,
      todayClassesQuery,
      recentActivityQuery,
      coursePerfQuery,
      assignmentMetricsQuery,
    ]);

    if (assignmentsSchemaOk) {
      const [pendingAssignmentRes, recentAssignmentSubmissionsRes] = assignmentMetrics;
      pendingAssignmentReviews = Number(pendingAssignmentRes.rows[0]?.count || 0);
      recentSubmissionRows = recentAssignmentSubmissionsRes.rows;
    }

    const summary = summaryRes.rows[0] || {};
    const activeCourses = Number(summary.active_courses || 0);
    const totalStudents = Number(summary.total_students || 0);
    const pendingGrading = Number(summary.pending_grading || 0);
    const pendingAttendance = Number(summary.pending_attendance || 0);
    const pendingAnnouncements = Number(summary.pending_announcements || 0);

    const submissions = recentActivityRes.rows.map((r) => ({
      title:
        r.kind === "grade"
          ? `Graded ${r.student_email}`
          : `Attendance updated for ${r.student_email}`,
      meta: `${r.course_code} - ${r.course_name}`,
      when: r.ts,
    })).concat(
      recentSubmissionRows.map((r) => ({
        title: `Submitted: ${r.assignment_title}`,
        meta: `${r.course_code} - ${r.course_name} (${r.student_email})`,
        when: r.ts,
      })),
    ).sort((a, b) => new Date(b.when) - new Date(a.when)).slice(0, 8);

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
        count: pendingAttendance,
        route: "/professor/attendance",
      },
      {
        key: "announcements",
        title: "Unpublished Course Announcements",
        count: pendingAnnouncements,
        route: "/professor/announcements",
      },
      {
        key: "assignments",
        title: "Pending Assignment Reviews",
        count: pendingAssignmentReviews,
        route: "/professor/assignments",
      },
    ];

    const responsePayload = {
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
        { key: "assignments", label: "Manage Assignments" },
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
      submissions,
      coursePerformance,
      pendingTasks,
    };

    await setCachedProfessorDashboard(userId, responsePayload);
    res.json(responsePayload);
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
    const cachedResponse = await getCachedProfessorClassGrades(userId, classId);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const classRes = await db.query(
      `SELECT c.class_id FROM classes c JOIN professors p ON c.professor_id = p.professor_id WHERE c.class_id = $1 AND p.user_id = $2`,
      [classId, userId]
    );
    if (classRes.rows.length === 0)
      return res.status(404).json({ message: "Class not found" });

    const [result, assignmentGradesRes] = await Promise.all([
      db.query(
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
      ),
      db.query(
        `
        SELECT
          sub.submission_id,
          sub.student_id,
          u.email,
          a.assignment_id,
          a.title AS assignment_title,
          sub.grade,
          a.max_points,
          sub.feedback,
          sub.graded_at
        FROM assignment_submissions sub
        JOIN assignments a ON a.assignment_id = sub.assignment_id
        JOIN students s ON s.student_id = sub.student_id
        JOIN users u ON u.user_id = s.user_id
        WHERE a.class_id = $1
          AND sub.grade IS NOT NULL
        ORDER BY u.email, a.title
        `,
        [classId],
      ),
    ]);

    const responsePayload = {
      manualGrades: result.rows,
      assignmentGrades: assignmentGradesRes.rows,
    };

    await setCachedProfessorClassGrades(userId, classId, responsePayload);
    res.json(responsePayload);
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
      `SELECT e.enrollment_id, e.class_id FROM enrollments e
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

    await invalidateProfessorDashboardCache(userId);
    await invalidateProfessorClassGradesCache(userId, verifyRes.rows[0]?.class_id);
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
    const cachedResponse = await getCachedProfessorClassAttendance(userId, classId);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

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
    await setCachedProfessorClassAttendance(userId, classId, result.rows);
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
      `SELECT e.enrollment_id, e.class_id FROM enrollments e
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

    await invalidateProfessorDashboardCache(userId);
    await invalidateProfessorClassAttendanceCache(userId, verifyRes.rows[0]?.class_id);
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

    await invalidateProfessorDashboardCache(userId);
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

    await invalidateProfessorDashboardCache(userId);
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
    await invalidateProfessorDashboardCache(userId);
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// =====================================================
// ASSIGNMENTS MANAGEMENT
// =====================================================
router.get("/classes/:classId/assignments", verifyJWT, professorOnly, async (req, res) => {
  try {
    if (!(await assertAssignmentsSchema())) {
      return res.status(500).json({ message: "Assignments schema is not available. Run migration 017_assignments.sql" });
    }

    const classId = parseInt(req.params.classId, 10);
    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ message: "Invalid class ID" });
    }

    const userId = getUserId(req);
    const classRes = await db.query(
      `
      SELECT c.class_id
      FROM classes c
      JOIN professors p ON p.professor_id = c.professor_id
      WHERE c.class_id = $1 AND p.user_id = $2
      `,
      [classId, userId],
    );
    if (!classRes.rows.length) {
      return res.status(404).json({ message: "Class not found" });
    }

    const result = await db.query(
      `
      SELECT
        a.assignment_id,
        a.class_id,
        a.title,
        a.description,
        a.attachment_url,
        a.due_at,
        a.max_points,
        a.is_published,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT e.student_id)::int AS assigned_students,
        COUNT(DISTINCT s.student_id)::int AS submitted_students
      FROM assignments a
      LEFT JOIN enrollments e ON e.class_id = a.class_id
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.assignment_id
      WHERE a.class_id = $1
      GROUP BY a.assignment_id
      ORDER BY a.created_at DESC
      `,
      [classId],
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

router.post("/assignments", verifyJWT, professorOnly, async (req, res) => {
  try {
    if (!(await assertAssignmentsSchema())) {
      return res.status(500).json({ message: "Assignments schema is not available. Run migration 017_assignments.sql" });
    }

    const { classId, title, description, dueAt, maxPoints, attachmentUrl, isPublished } = req.body || {};
    if (!classId || !title || !dueAt) {
      return res.status(400).json({ message: "classId, title, and dueAt are required" });
    }

    const userId = getUserId(req);
    const professorId = await getProfessorIdByUserId(userId);
    if (!professorId) {
      return res.status(404).json({ message: "Professor profile not found" });
    }

    const classRes = await db.query(
      `SELECT class_id FROM classes WHERE class_id = $1 AND professor_id = $2`,
      [Number(classId), professorId],
    );
    if (!classRes.rows.length) {
      return res.status(403).json({ message: "Access denied for this class" });
    }

    const result = await db.query(
      `
      INSERT INTO assignments (
        class_id, title, description, attachment_url, due_at, max_points, created_by, is_published
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        Number(classId),
        String(title).trim(),
        description ? String(description).trim() : null,
        attachmentUrl ? String(attachmentUrl).trim() : null,
        dueAt,
        Number(maxPoints || 100),
        userId,
        isPublished !== false,
      ],
    );
    await invalidateProfessorDashboardCache(userId);
    await invalidateProfessorAssignmentSubmissionsCache(userId, result.rows[0]?.assignment_id);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

router.put("/assignments/:assignmentId", verifyJWT, professorOnly, async (req, res) => {
  try {
    if (!(await assertAssignmentsSchema())) {
      return res.status(500).json({ message: "Assignments schema is not available. Run migration 017_assignments.sql" });
    }

    const assignmentId = parseInt(req.params.assignmentId, 10);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return res.status(400).json({ message: "Invalid assignment ID" });
    }

    const { title, description, dueAt, maxPoints, attachmentUrl, isPublished } = req.body || {};
    if (!title || !dueAt) {
      return res.status(400).json({ message: "title and dueAt are required" });
    }

    const userId = getUserId(req);
    const existing = await db.query(
      `
      SELECT a.assignment_id
      FROM assignments a
      JOIN classes c ON c.class_id = a.class_id
      JOIN professors p ON p.professor_id = c.professor_id
      WHERE a.assignment_id = $1 AND p.user_id = $2
      `,
      [assignmentId, userId],
    );
    if (!existing.rows.length) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updated = await db.query(
      `
      UPDATE assignments
      SET
        title = $1,
        description = $2,
        attachment_url = $3,
        due_at = $4,
        max_points = $5,
        is_published = $6,
        updated_at = NOW()
      WHERE assignment_id = $7
      RETURNING *
      `,
      [
        String(title).trim(),
        description ? String(description).trim() : null,
        attachmentUrl ? String(attachmentUrl).trim() : null,
        dueAt,
        Number(maxPoints || 100),
        isPublished !== false,
        assignmentId,
      ],
    );
    await invalidateProfessorDashboardCache(userId);
    await invalidateProfessorAssignmentSubmissionsCache(userId, assignmentId);
    return res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

router.delete("/assignments/:assignmentId", verifyJWT, professorOnly, async (req, res) => {
  try {
    if (!(await assertAssignmentsSchema())) {
      return res.status(500).json({ message: "Assignments schema is not available. Run migration 017_assignments.sql" });
    }

    const assignmentId = parseInt(req.params.assignmentId, 10);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return res.status(400).json({ message: "Invalid assignment ID" });
    }

    const userId = getUserId(req);
    const existing = await db.query(
      `
      SELECT a.assignment_id
      FROM assignments a
      JOIN classes c ON c.class_id = a.class_id
      JOIN professors p ON p.professor_id = c.professor_id
      WHERE a.assignment_id = $1 AND p.user_id = $2
      `,
      [assignmentId, userId],
    );
    if (!existing.rows.length) {
      return res.status(403).json({ message: "Access denied" });
    }

    await db.query(`DELETE FROM assignments WHERE assignment_id = $1`, [assignmentId]);
    await invalidateProfessorDashboardCache(userId);
    await invalidateProfessorAssignmentSubmissionsCache(userId, assignmentId);
    return res.json({ message: "Assignment deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

router.get("/assignments/:assignmentId/submissions", verifyJWT, professorOnly, async (req, res) => {
  try {
    if (!(await assertAssignmentsSchema())) {
      return res.status(500).json({ message: "Assignments schema is not available. Run migration 017_assignments.sql" });
    }

    const assignmentId = parseInt(req.params.assignmentId, 10);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return res.status(400).json({ message: "Invalid assignment ID" });
    }

    const userId = getUserId(req);
    const cachedResponse = await getCachedProfessorAssignmentSubmissions(userId, assignmentId);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const assignmentRes = await db.query(
      `
      SELECT
        a.assignment_id,
        a.class_id,
        a.title,
        a.description,
        a.due_at,
        a.max_points,
        c.semester,
        c.year,
        co.code AS course_code,
        co.name AS course_name
      FROM assignments a
      JOIN classes c ON c.class_id = a.class_id
      JOIN courses co ON co.course_id = c.course_id
      JOIN professors p ON p.professor_id = c.professor_id
      WHERE a.assignment_id = $1 AND p.user_id = $2
      `,
      [assignmentId, userId],
    );
    if (!assignmentRes.rows.length) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    const assignment = assignmentRes.rows[0];

    const submissionsRes = await db.query(
      `
      SELECT
        s.student_id,
        u.email AS student_email,
        sub.submission_id,
        sub.submission_text,
        sub.attachment_url,
        sub.status,
        sub.grade,
        sub.feedback,
        sub.submitted_at,
        sub.updated_at
      FROM enrollments e
      JOIN students s ON s.student_id = e.student_id
      JOIN users u ON u.user_id = s.user_id
      LEFT JOIN assignment_submissions sub
        ON sub.assignment_id = $1
       AND sub.student_id = s.student_id
      WHERE e.class_id = $2
      ORDER BY u.email ASC
      `,
      [assignmentId, assignment.class_id],
    );

    const summary = submissionsRes.rows.reduce(
      (acc, row) => {
        if (row.submission_id) acc.submitted += 1;
        else acc.not_submitted += 1;
        if (String(row.status || "").toLowerCase() === "graded") acc.graded += 1;
        return acc;
      },
      { submitted: 0, not_submitted: 0, graded: 0 },
    );

    const responsePayload = {
      assignment,
      summary: { ...summary, total_students: submissionsRes.rows.length },
      submissions: submissionsRes.rows,
    };

    await setCachedProfessorAssignmentSubmissions(userId, assignmentId, responsePayload);
    return res.json(responsePayload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

router.patch("/submissions/:submissionId/review", verifyJWT, professorOnly, async (req, res) => {
  try {
    if (!(await assertAssignmentsSchema())) {
      return res.status(500).json({ message: "Assignments schema is not available. Run migration 017_assignments.sql" });
    }

    const submissionId = parseInt(req.params.submissionId, 10);
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      return res.status(400).json({ message: "Invalid submission ID" });
    }

    const { grade, feedback } = req.body || {};

    const userId = getUserId(req);
    const assignmentId = await getAssignmentIdBySubmissionId(submissionId);
    const allowed = await db.query(
      `
      SELECT sub.submission_id
      FROM assignment_submissions sub
      JOIN assignments a ON a.assignment_id = sub.assignment_id
      JOIN classes c ON c.class_id = a.class_id
      JOIN professors p ON p.professor_id = c.professor_id
      WHERE sub.submission_id = $1 AND p.user_id = $2
      `,
      [submissionId, userId],
    );
    if (!allowed.rows.length) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updated = await db.query(
      `
      UPDATE assignment_submissions
      SET
        status = 'graded',
        grade = $1::numeric,
        feedback = $2::text,
        graded_at = NOW(),
        updated_at = NOW()
      WHERE submission_id = $3
      RETURNING *
      `,
      [
        grade == null || grade === "" ? null : Number(grade),
        feedback || null,
        submissionId,
      ],
    );
    await invalidateProfessorDashboardCache(userId);
    await invalidateProfessorAssignmentSubmissionsCache(userId, assignmentId);
    return res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
