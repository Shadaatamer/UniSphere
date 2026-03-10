const db = require("../../data/db");

async function getClassById(classId) {
  const r = await db.query(
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
      COALESCE(co.credits, 3) AS credits
    FROM classes c
    JOIN courses co ON co.course_id = c.course_id
    WHERE c.class_id = $1
    LIMIT 1
    `,
    [classId],
  );
  return r.rows[0] || null;
}

async function countEnrollments(classId) {
  const r = await db.query(
    "SELECT COUNT(*)::int AS c FROM enrollments WHERE class_id = $1",
    [classId],
  );
  return Number(r.rows[0]?.c || 0);
}

async function getEnrollment(studentId, classId) {
  const r = await db.query(
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

async function getStudentFirstCollegeYear(studentId) {
  const r = await db.query(
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

async function getRegistrationWindow(firstCollegeYear, semester, year) {
  const r = await db.query(
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

async function getRegisteredClasses(studentId, { semester, year } = {}) {
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

  const r = await db.query(
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
      COALESCE(co.credits, 3) AS credits
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
      co.code AS course_code,
      co.name AS course_name,
      COALESCE(co.credits, 3) AS credits,
      COUNT(e2.enrollment_id)::int AS enrolled_count,
      CASE WHEN es.enrollment_id IS NULL THEN FALSE ELSE TRUE END AS is_registered
    FROM classes c
    JOIN courses co ON co.course_id = c.course_id
    LEFT JOIN enrollments e2 ON e2.class_id = c.class_id
    LEFT JOIN enrollments es ON es.class_id = c.class_id AND es.student_id = $${studentParam}
    WHERE ${filters.join(" AND ")}
    GROUP BY
      c.class_id, c.semester, c.year, c.section, c.day, c.time_start, c.time_end, c.location, c.max_capacity,
      co.code, co.name, co.credits, es.enrollment_id
    ORDER BY c.year DESC NULLS LAST, c.semester DESC, co.code ASC
    `,
    params,
  );
  return r.rows;
}

async function createEnrollment(studentId, classId) {
  const r = await db.query(
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
  getClassById,
  countEnrollments,
  getEnrollment,
  getEnrollmentWithClass,
  getStudentFirstCollegeYear,
  getRegistrationWindow,
  getRegisteredClasses,
  getCatalog,
  createEnrollment,
  deleteEnrollment,
};
