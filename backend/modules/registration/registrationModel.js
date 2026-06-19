const db = require("../../data/db");

async function withTransaction(work) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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

async function getClassById(classId, { forUpdate = false, client = db } = {}) {
  const r = await client.query(
    `
    SELECT
      c.class_id,
      c.course_id,
      c.professor_id,
      c.semester,
      c.year,
      c.section,
      c.max_capacity,
      c.day,
      c.time_start,
      c.time_end,
      c.location,
      co.code AS course_code,
      co.name AS course_name,
      COALESCE(co.credits, co.credit_hours, 3) AS credits
    FROM classes c
    JOIN courses co ON co.course_id = c.course_id
    WHERE c.class_id = $1
    LIMIT 1
    ${forUpdate ? "FOR UPDATE OF c" : ""}
    `,
    [classId],
  );
  return r.rows[0] || null;
}

async function countEnrollments(classId, client = db) {
  const r = await client.query(
    "SELECT COUNT(*)::int AS c FROM enrollments WHERE class_id = $1",
    [classId],
  );
  return Number(r.rows[0]?.c || 0);
}

async function getEnrollment(studentId, classId, client = db) {
  const r = await client.query(
    `
    SELECT enrollment_id, class_id, student_id
    FROM enrollments
    WHERE student_id = $1 AND class_id = $2
    LIMIT 1
    `,
    [studentId, classId],
  );
  return r.rows[0] || null;
}

async function getEnrollmentWithClass(studentId, classId) {
  const r = await db.query(
    `
    SELECT
      e.enrollment_id,
      c.class_id,
      c.semester,
      c.year
    FROM enrollments e
    JOIN classes c ON c.class_id = e.class_id
    WHERE e.student_id = $1 AND e.class_id = $2
    LIMIT 1
    `,
    [studentId, classId],
  );
  return r.rows[0] || null;
}

async function getStudentFirstCollegeYear(studentId, client = db) {
  const r = await client.query(
    `
    SELECT first_college_year
    FROM student_financial_profiles
    WHERE student_id = $1
    LIMIT 1
    `,
    [studentId],
  );
  return r.rows[0]?.first_college_year ?? null;
}

async function getRegistrationWindow(firstCollegeYear, semester, year, client = db) {
  const r = await client.query(
    `
    SELECT
      window_id,
      first_college_year,
      semester,
      year,
      opens_at,
      closes_at,
      is_active
    FROM registration_windows
    WHERE first_college_year = $1
      AND LOWER(semester) = LOWER($2)
      AND year = $3
      AND is_active = TRUE
    LIMIT 1
    `,
    [firstCollegeYear, semester, Number(year)],
  );
  return r.rows[0] || null;
}

async function getRegisteredClasses(studentId, { semester, year, client = db } = {}) {
  const filters = ["e.student_id = $1"];
  const params = [studentId];
  if (semester) {
    params.push(semester);
    filters.push(`LOWER(c.semester) = LOWER($${params.length})`);
  }
  if (year) {
    params.push(Number(year));
    filters.push(`c.year = $${params.length}`);
  }

  const r = await client.query(
    `
    SELECT
      e.enrollment_id,
      c.class_id,
      c.semester,
      c.year,
      c.section,
      c.day,
      c.time_start,
      c.time_end,
      c.location,
      co.code AS course_code,
      co.name AS course_name,
      COALESCE(co.credits, co.credit_hours, 3) AS credits
    FROM enrollments e
    JOIN classes c ON c.class_id = e.class_id
    JOIN courses co ON co.course_id = c.course_id
    WHERE ${filters.join(" AND ")}
    ORDER BY c.year DESC NULLS LAST, c.semester DESC, co.code ASC
    `,
    params,
  );
  return r.rows;
}

async function getCatalog(studentId, departmentId, { semester, year } = {}) {
  const filters = ["co.department_id = $1"];
  const params = [departmentId];

  if (semester) {
    params.push(semester);
    filters.push(`LOWER(c.semester) = LOWER($${params.length})`);
  }
  if (year) {
    params.push(Number(year));
    filters.push(`c.year = $${params.length}`);
  }

  params.push(studentId);
  const studentParam = params.length;

  const r = await db.query(
    `
    SELECT
      c.class_id,
      c.semester,
      c.year,
      c.section,
      c.day,
      c.time_start,
      c.time_end,
      c.location,
      c.max_capacity,
      co.course_id,
      co.code AS course_code,
      co.name AS course_name,
      COALESCE(co.credits, co.credit_hours, 3) AS credits,
      COUNT(e2.enrollment_id)::int AS enrolled_count,
      CASE WHEN es.enrollment_id IS NULL THEN FALSE ELSE TRUE END AS is_registered
    FROM classes c
    JOIN courses co ON co.course_id = c.course_id
    LEFT JOIN enrollments e2 ON e2.class_id = c.class_id
    LEFT JOIN enrollments es ON es.class_id = c.class_id AND es.student_id = $${studentParam}
    WHERE ${filters.join(" AND ")}
    GROUP BY
      c.class_id, c.semester, c.year, c.section, c.day, c.time_start, c.time_end, c.location, c.max_capacity,
      co.course_id, co.code, co.name, co.credits, co.credit_hours, es.enrollment_id
    ORDER BY c.year DESC NULLS LAST, c.semester DESC, co.code ASC
    `,
    params,
  );
  return r.rows;
}

async function getPrerequisitesForCourseIds(courseIds) {
  await ensurePrerequisitesTable();
  if (!courseIds?.length) return [];
  const uniqueIds = [...new Set(courseIds.map((id) => Number(id)).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const r = await db.query(
    `
    SELECT
      p.prerequisite_id,
      p.course_id,
      p.required_course_id,
      required.code AS required_course_code,
      required.name AS required_course_name
    FROM prerequisites p
    JOIN courses required ON required.course_id = p.required_course_id
    WHERE p.course_id = ANY($1::int[])
    ORDER BY p.course_id ASC, required.code ASC
    `,
    [uniqueIds],
  );
  return r.rows;
}

async function getCompletedCourseIds(studentId, client = db) {
  const r = await client.query(
    `
    WITH course_results AS (
      SELECT
        c.course_id,
        COUNT(g.grade_id)::int AS graded_items,
        COALESCE(
          ROUND(AVG((g.score::numeric / NULLIF(g.max_score, 0)) * 100), 2),
          0
        ) AS avg_percent
      FROM enrollments e
      JOIN classes c ON c.class_id = e.class_id
      LEFT JOIN grades g ON g.enrollment_id = e.enrollment_id
      WHERE e.student_id = $1
      GROUP BY c.course_id, e.enrollment_id
    )
    SELECT DISTINCT course_id
    FROM course_results
    WHERE graded_items > 0
      AND avg_percent >= 60
    `,
    [studentId],
  );
  return r.rows.map((row) => Number(row.course_id));
}

async function getRegistrationLoadPolicy(client = db) {
  const r = await client.query(
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
  return r.rows[0] || null;
}

async function getStudentGpa(studentId, client = db) {
  const r = await client.query(
    `
    WITH course_grades AS (
      SELECT
        e.enrollment_id,
        COALESCE(co.credits, co.credit_hours, 3) AS credits,
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
      GROUP BY e.enrollment_id, co.credits, co.credit_hours
    )
    SELECT
      COALESCE(
        ROUND(
          SUM(
            CASE
              WHEN graded_items = 0 THEN 0
              WHEN avg_percent >= 93 THEN 4.0 * credits
              WHEN avg_percent >= 90 THEN 3.7 * credits
              WHEN avg_percent >= 87 THEN 3.3 * credits
              WHEN avg_percent >= 83 THEN 3.0 * credits
              WHEN avg_percent >= 80 THEN 2.7 * credits
              WHEN avg_percent >= 77 THEN 2.3 * credits
              WHEN avg_percent >= 73 THEN 2.0 * credits
              WHEN avg_percent >= 70 THEN 1.7 * credits
              WHEN avg_percent >= 67 THEN 1.3 * credits
              WHEN avg_percent >= 63 THEN 1.0 * credits
              WHEN avg_percent >= 60 THEN 0.7 * credits
              ELSE 0
            END
          ) / NULLIF(SUM(CASE WHEN graded_items = 0 THEN 0 ELSE credits END), 0),
        2),
      0) AS cumulative_gpa,
      COALESCE(SUM(CASE WHEN graded_items = 0 THEN 0 ELSE credits END), 0)::int AS completed_credits
    FROM course_grades
    `,
    [studentId],
  );
  return {
    cumulative_gpa: Number(r.rows[0]?.cumulative_gpa || 0),
    completed_credits: Number(r.rows[0]?.completed_credits || 0),
  };
}

async function getRegisteredCredits(studentId, semester, year, client = db) {
  const r = await client.query(
    `
    SELECT COALESCE(SUM(COALESCE(co.credits, co.credit_hours, 3)), 0)::int AS total_credits
    FROM enrollments e
    JOIN classes c ON c.class_id = e.class_id
    JOIN courses co ON co.course_id = c.course_id
    WHERE e.student_id = $1
      AND LOWER(c.semester) = LOWER($2)
      AND c.year = $3
    `,
    [studentId, semester, Number(year)],
  );
  return Number(r.rows[0]?.total_credits || 0);
}

async function createEnrollment(studentId, classId, client = db) {
  const r = await client.query(
    `
    INSERT INTO enrollments (student_id, class_id)
    VALUES ($1, $2)
    RETURNING enrollment_id, student_id, class_id
    `,
    [studentId, classId],
  );
  return r.rows[0];
}

async function deleteEnrollment(studentId, classId) {
  const r = await db.query(
    `
    DELETE FROM enrollments
    WHERE student_id = $1 AND class_id = $2
    RETURNING enrollment_id
    `,
    [studentId, classId],
  );
  return r.rows[0] || null;
}

module.exports = {
  withTransaction,
  ensurePrerequisitesTable,
  getClassById,
  countEnrollments,
  getEnrollment,
  getEnrollmentWithClass,
  getStudentFirstCollegeYear,
  getRegistrationWindow,
  getRegisteredClasses,
  getCatalog,
  getPrerequisitesForCourseIds,
  getCompletedCourseIds,
  getRegistrationLoadPolicy,
  getStudentGpa,
  getRegisteredCredits,
  createEnrollment,
  deleteEnrollment,
};
