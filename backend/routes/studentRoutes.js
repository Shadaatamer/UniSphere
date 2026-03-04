const express = require("express");
const router = express.Router();

const db = require("../data/db");
const { verifyJWT, studentOnly } = require("../middleware/auth");

function getUserId(req) {
  return req.user?.userId ?? req.user?.user_id ?? req.user?.id;
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

async function getStudentContext(req) {
  const userId = getUserId(req);
  if (!userId) return null;

  const r = await db.query(
    `
    SELECT s.student_id, s.department_id, d.name AS department_name
    FROM students s
    LEFT JOIN departments d ON d.department_id = s.department_id
    WHERE s.user_id = $1
    `,
    [userId],
  );
  return r.rows[0] || null;
}

function semesterRank(semester) {
  const s = String(semester || "").toLowerCase();
  if (s.includes("spring") || s.includes("spr")) return 1;
  if (s.includes("summer") || s.includes("sum")) return 2;
  if (s.includes("fall") || s.includes("autumn")) return 3;
  if (s.includes("winter") || s.includes("win")) return 4;
  return 0;
}

function percentToGradePoint(percent) {
  const p = Number(percent || 0);
  if (p >= 93) return { letter: "A", points: 4.0 };
  if (p >= 90) return { letter: "A-", points: 3.7 };
  if (p >= 87) return { letter: "B+", points: 3.3 };
  if (p >= 83) return { letter: "B", points: 3.0 };
  if (p >= 80) return { letter: "B-", points: 2.7 };
  if (p >= 77) return { letter: "C+", points: 2.3 };
  if (p >= 73) return { letter: "C", points: 2.0 };
  if (p >= 70) return { letter: "C-", points: 1.7 };
  if (p >= 67) return { letter: "D+", points: 1.3 };
  if (p >= 63) return { letter: "D", points: 1.0 };
  if (p >= 60) return { letter: "D-", points: 0.7 };
  return { letter: "F", points: 0.0 };
}

async function fetchCourses(studentId) {
  const r = await db.query(
    `
    SELECT
      c.class_id,
      co.course_id,
      co.code AS course_code,
      co.name AS course_name,
      COALESCE(co.credits, 3) AS credits,
      c.semester,
      c.year,
      c.day,
      c.time_start,
      c.time_end,
      c.location,
      u.email AS professor_email
    FROM enrollments e
    JOIN classes c ON c.class_id = e.class_id
    JOIN courses co ON co.course_id = c.course_id
    LEFT JOIN professors p ON p.professor_id = c.professor_id
    LEFT JOIN users u ON u.user_id = p.user_id
    WHERE e.student_id = $1
    ORDER BY c.year DESC NULLS LAST, c.semester DESC, co.code ASC
    `,
    [studentId],
  );
  return r.rows;
}

async function fetchGrades(studentId) {
  const r = await db.query(
    `
    SELECT
      e.enrollment_id,
      c.class_id,
      co.code AS course_code,
      co.name AS course_name,
      COALESCE(co.credits, 3) AS credits,
      c.semester,
      c.year,
      COUNT(g.grade_id)::int AS graded_items,
      COALESCE(
        ROUND(AVG((g.score::numeric / NULLIF(g.max_score, 0)) * 100), 2),
        0
      ) AS avg_percent
    FROM enrollments e
    JOIN classes c ON c.class_id = e.class_id
    JOIN courses co ON co.course_id = c.course_id
    LEFT JOIN grades g ON g.enrollment_id = e.enrollment_id
    WHERE e.student_id = $1
    GROUP BY e.enrollment_id, c.class_id, co.code, co.name, co.credits, c.semester, c.year
    ORDER BY c.year DESC NULLS LAST, c.semester DESC, co.code ASC
    `,
    [studentId],
  );
  return r.rows;
}

function computeGpaSummary(gradeRows) {
  const enriched = gradeRows.map((r) => {
    const avg = Number(r.avg_percent || 0);
    const credits = Number(r.credits || 0);
    if (Number(r.graded_items || 0) === 0) {
      return {
        ...r,
        letter_grade: "IP",
        grade_points: 0,
        result_status: "In Progress",
      };
    }
    const gp = percentToGradePoint(avg);
    return {
      ...r,
      letter_grade: gp.letter,
      grade_points: gp.points,
      result_status: avg >= 60 ? "Pass" : "Fail",
      avg_percent: Number(avg.toFixed(2)),
      credits,
    };
  });

  const completed = enriched.filter((r) => Number(r.graded_items || 0) > 0);
  const creditsAttempted = completed.reduce((a, r) => a + Number(r.credits || 0), 0);
  const qualityPoints = completed.reduce(
    (a, r) => a + Number(r.grade_points || 0) * Number(r.credits || 0),
    0,
  );
  const cumulativeGpa = creditsAttempted
    ? Number((qualityPoints / creditsAttempted).toFixed(2))
    : 0;

  const latest = [...completed].sort((a, b) => {
    const y = Number(b.year || 0) - Number(a.year || 0);
    if (y !== 0) return y;
    return semesterRank(b.semester) - semesterRank(a.semester);
  });
  const latestYear = latest[0]?.year ?? null;
  const latestSemester = latest[0]?.semester ?? null;
  const latestTermRows = latest.filter(
    (r) => r.year === latestYear && String(r.semester || "") === String(latestSemester || ""),
  );
  const latestTermCredits = latestTermRows.reduce((a, r) => a + Number(r.credits || 0), 0);
  const latestTermQuality = latestTermRows.reduce(
    (a, r) => a + Number(r.grade_points || 0) * Number(r.credits || 0),
    0,
  );
  const semesterGpa = latestTermCredits
    ? Number((latestTermQuality / latestTermCredits).toFixed(2))
    : 0;

  const passedCourses = completed.filter((r) => r.result_status === "Pass").length;
  const failedCourses = completed.filter((r) => r.result_status === "Fail").length;

  return {
    rows: enriched,
    summary: {
      cumulativeGpa,
      semesterGpa,
      latestTerm: latestSemester && latestYear ? `${latestSemester} ${latestYear}` : null,
      creditsAttempted,
      completedCourses: completed.length,
      passedCourses,
      failedCourses,
    },
  };
}

// GET /api/student/dashboard
router.get("/dashboard", verifyJWT, studentOnly, async (req, res) => {
  try {
    const ctx = await getStudentContext(req);
    if (!ctx) return res.status(404).json({ message: "Student profile not found" });

    const [courses, gradesRaw, attendanceRaw] = await Promise.all([
      fetchCourses(ctx.student_id),
      fetchGrades(ctx.student_id),
      db.query(
        `
        SELECT
          COUNT(a.attendance_id)::int AS sessions_total,
          SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END)::int AS present_count
        FROM enrollments e
        LEFT JOIN attendance a ON a.enrollment_id = e.enrollment_id
        WHERE e.student_id = $1
        `,
        [ctx.student_id],
      ),
    ]);

    const gpa = computeGpaSummary(gradesRaw);
    const sessionsTotal = Number(attendanceRaw.rows[0]?.sessions_total || 0);
    const presentCount = Number(attendanceRaw.rows[0]?.present_count || 0);
    const attendancePercent = sessionsTotal
      ? `${Number(((presentCount / sessionsTotal) * 100).toFixed(2))}%`
      : "0%";

    const announcementsRes = await db.query(
      `
      SELECT title, created_at
      FROM announcements
      WHERE is_published = TRUE
      ORDER BY created_at DESC
      LIMIT 3
      `,
    );

    res.json({
      header: {
        title: "Welcome back",
        subtitle: "Here’s your academic overview",
      },
      department: ctx.department_name || "Faculty",
      stats: [
        { label: "Enrolled Courses", value: courses.length },
        { label: "Current GPA", value: gpa.summary.cumulativeGpa },
        {
          label: "Credit Hours",
          value: courses.reduce((a, c) => a + Number(c.credits || 0), 0),
        },
        { label: "Attendance", value: attendancePercent },
      ],
      quickActions: [
        { key: "courses", label: "My Courses" },
        { key: "grades", label: "View Grades" },
        { key: "transcript", label: "Request Transcript" },
      ],
      schedule: courses.slice(0, 6).map((c) => ({
        course: `${c.course_code} - ${c.course_name}`,
        time: c.time_start && c.time_end ? `${c.time_start} - ${c.time_end}` : "TBA",
        location: c.location || "TBA",
      })),
      announcements: announcementsRes.rows.map((a) => ({
        title: a.title,
        when: new Date(a.created_at).toLocaleString(),
      })),
      courseProgress: gpa.rows.slice(0, 6).map((r) => ({
        course: `${r.course_code} - ${r.course_name}`,
        progress: Number(r.avg_percent || 0),
      })),
      deadlines: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/courses
router.get("/courses", verifyJWT, studentOnly, async (req, res) => {
  try {
    const ctx = await getStudentContext(req);
    if (!ctx) return res.status(404).json({ message: "Student profile not found" });
    const rows = await fetchCourses(ctx.student_id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/grades
router.get("/grades", verifyJWT, studentOnly, async (req, res) => {
  try {
    const ctx = await getStudentContext(req);
    if (!ctx) return res.status(404).json({ message: "Student profile not found" });
    const rows = await fetchGrades(ctx.student_id);
    res.json(computeGpaSummary(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/exams
router.get("/exams", verifyJWT, studentOnly, async (req, res) => {
  try {
    const ctx = await getStudentContext(req);
    if (!ctx) return res.status(404).json({ message: "Student profile not found" });
    const r = await db.query(
      `
      SELECT
        es.exam_id,
        es.exam_type,
        es.exam_date,
        es.start_time,
        es.end_time,
        es.location,
        c.class_id,
        c.semester,
        c.year,
        co.code AS course_code,
        co.name AS course_name
      FROM enrollments e
      JOIN classes c ON c.class_id = e.class_id
      JOIN courses co ON co.course_id = c.course_id
      JOIN exam_schedules es ON es.class_id = c.class_id
      WHERE e.student_id = $1
      ORDER BY es.exam_date ASC, es.start_time ASC
      `,
      [ctx.student_id],
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/attendance
router.get("/attendance", verifyJWT, studentOnly, async (req, res) => {
  try {
    const ctx = await getStudentContext(req);
    if (!ctx) return res.status(404).json({ message: "Student profile not found" });
    const r = await db.query(
      `
      SELECT
        c.class_id,
        co.code AS course_code,
        co.name AS course_name,
        c.semester,
        c.year,
        COUNT(a.attendance_id)::int AS sessions_total,
        SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END)::int AS present_count,
        SUM(CASE WHEN LOWER(a.status) = 'absent' THEN 1 ELSE 0 END)::int AS absent_count,
        SUM(CASE WHEN LOWER(a.status) = 'late' THEN 1 ELSE 0 END)::int AS late_count,
        SUM(CASE WHEN LOWER(a.status) = 'excused' THEN 1 ELSE 0 END)::int AS excused_count,
        COALESCE(
          ROUND(
            CASE WHEN COUNT(a.attendance_id) = 0 THEN 0
            ELSE (SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(a.attendance_id)) * 100
            END
          , 2)
        , 0) AS attendance_percent
      FROM enrollments e
      JOIN classes c ON c.class_id = e.class_id
      JOIN courses co ON co.course_id = c.course_id
      LEFT JOIN attendance a ON a.enrollment_id = e.enrollment_id
      WHERE e.student_id = $1
      GROUP BY c.class_id, co.code, co.name, c.semester, c.year
      ORDER BY c.year DESC NULLS LAST, c.semester DESC, co.code ASC
      `,
      [ctx.student_id],
    );
    const rows = r.rows;
    const avg = rows.length
      ? Number(
          (
            rows.reduce((acc, row) => acc + Number(row.attendance_percent || 0), 0) / rows.length
          ).toFixed(2),
        )
      : 0;
    res.json({
      summary: {
        classes: rows.length,
        avgAttendance: `${avg}%`,
      },
      rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/student/transcript-requests
router.post("/transcript-requests", verifyJWT, studentOnly, async (req, res) => {
  try {
    const ctx = await getStudentContext(req);
    if (!ctx) return res.status(404).json({ message: "Student profile not found" });
    const { transcriptType } = req.body || {};
    const normalizedType = String(transcriptType || "official").toLowerCase();
    const allowedTypes = ["official", "unofficial", "graduation"];
    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({ message: "Invalid transcript type" });
    }

    const pending = await db.query(
      `SELECT request_id FROM transcript_requests WHERE student_id = $1 AND status = 'pending'`,
      [ctx.student_id],
    );
    if (pending.rows.length > 0) {
      return res.status(409).json({ message: "You already have a pending transcript request" });
    }

    const [hasTranscriptType, hasReadyForCollection] = await Promise.all([
      columnExists("transcript_requests", "transcript_type"),
      columnExists("transcript_requests", "ready_for_collection"),
    ]);

    let created;
    if (hasTranscriptType && hasReadyForCollection) {
      created = await db.query(
        `
        INSERT INTO transcript_requests (student_id, status, transcript_type, ready_for_collection)
        VALUES ($1, 'pending', $2, FALSE)
        RETURNING request_id
        `,
        [ctx.student_id, normalizedType],
      );
    } else if (hasTranscriptType) {
      created = await db.query(
        `
        INSERT INTO transcript_requests (student_id, status, transcript_type)
        VALUES ($1, 'pending', $2)
        RETURNING request_id
        `,
        [ctx.student_id, normalizedType],
      );
    } else {
      created = await db.query(
        `
        INSERT INTO transcript_requests (student_id, status)
        VALUES ($1, 'pending')
        RETURNING request_id
        `,
        [ctx.student_id],
      );
    }

    const requestId = created.rows[0]?.request_id;
    const r = await db.query(
      `
      SELECT
        request_id,
        status,
        ${hasTranscriptType ? "transcript_type" : "'official'::text AS transcript_type"},
        ${hasReadyForCollection ? "ready_for_collection" : "FALSE AS ready_for_collection"},
        created_at
      FROM transcript_requests
      WHERE request_id = $1
      `,
      [requestId],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/transcript-requests
router.get("/transcript-requests", verifyJWT, studentOnly, async (req, res) => {
  try {
    const ctx = await getStudentContext(req);
    if (!ctx) return res.status(404).json({ message: "Student profile not found" });
    const [hasTranscriptType, hasReadyForCollection] = await Promise.all([
      columnExists("transcript_requests", "transcript_type"),
      columnExists("transcript_requests", "ready_for_collection"),
    ]);

    const r = await db.query(
      `
      SELECT
        request_id,
        status,
        ${hasTranscriptType ? "transcript_type" : "'official'::text AS transcript_type"},
        ${hasReadyForCollection ? "ready_for_collection" : "FALSE AS ready_for_collection"},
        created_at
      FROM transcript_requests
      WHERE student_id = $1
      ORDER BY created_at DESC
      `,
      [ctx.student_id],
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/announcements
router.get("/announcements", verifyJWT, studentOnly, async (req, res) => {
  try {
    const ctx = await getStudentContext(req);
    if (!ctx) return res.status(404).json({ message: "Student profile not found" });

    const r = await db.query(
      `
      SELECT
        a.announcement_id AS id,
        a.title,
        a.body,
        a.created_at,
        'global'::text AS source,
        NULL::int AS class_id,
        NULL::text AS course_code,
        NULL::text AS course_name
      FROM announcements a
      WHERE a.is_published = TRUE

      UNION ALL

      SELECT
        ca.announcement_id AS id,
        ca.title,
        ca.body,
        ca.created_at,
        'course'::text AS source,
        c.class_id,
        co.code AS course_code,
        co.name AS course_name
      FROM enrollments e
      JOIN classes c ON c.class_id = e.class_id
      JOIN courses co ON co.course_id = c.course_id
      JOIN course_announcements ca ON ca.class_id = c.class_id
      WHERE e.student_id = $1
        AND ca.is_published = TRUE

      ORDER BY created_at DESC
      `,
      [ctx.student_id],
    );

    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
