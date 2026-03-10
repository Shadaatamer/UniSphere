const db = require("../../data/db");

async function feesSchemaReady() {
  const r = await db.query(
    `
    SELECT
      to_regclass('public.tuition_rules') AS tuition_rules,
      to_regclass('public.student_financial_profiles') AS student_financial_profiles,
      to_regclass('public.fee_components') AS fee_components
    `,
  );
  const row = r.rows[0] || {};
  return !!(row.tuition_rules && row.student_financial_profiles && row.fee_components);
}

async function hasUserFullNameColumn() {
  const r = await db.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'full_name'
    ) AS exists
    `,
  );
  return !!r.rows[0]?.exists;
}

async function getStudentFinancialProfile(studentId) {
  const hasFullName = await hasUserFullNameColumn();
  const r = await db.query(
    `
    SELECT
      s.student_id,
      u.email AS student_email,
      ${
        hasFullName
          ? "NULLIF(BTRIM(u.full_name), '') AS student_full_name,"
          : "NULL::text AS student_full_name,"
      }
      sfp.first_college_year,
      sfp.previous_balance
    FROM students s
    JOIN users u ON u.user_id = s.user_id
    LEFT JOIN student_financial_profiles sfp ON sfp.student_id = s.student_id
    WHERE s.student_id = $1
    LIMIT 1
    `,
    [studentId],
  );
  return r.rows[0] || null;
}

async function getStudentCourses(studentId) {
  const r = await db.query(
    `
    SELECT
      c.class_id,
      c.semester,
      c.year,
      co.code AS course_code,
      co.name AS course_name,
      COALESCE(co.credits, 3) AS credit_hours
    FROM enrollments e
    JOIN classes c ON c.class_id = e.class_id
    JOIN courses co ON co.course_id = c.course_id
    WHERE e.student_id = $1
    ORDER BY c.year DESC NULLS LAST, c.semester DESC, co.code ASC
    `,
    [studentId],
  );
  return r.rows;
}

async function getCreditHourPrice(firstCollegeYear) {
  const exact = await db.query(
    `
    SELECT first_college_year, credit_hour_price
    FROM tuition_rules
    WHERE first_college_year = $1
    LIMIT 1
    `,
    [firstCollegeYear],
  );
  if (exact.rows[0]) return exact.rows[0];

  const nearest = await db.query(
    `
    SELECT first_college_year, credit_hour_price
    FROM tuition_rules
    WHERE first_college_year <= $1
    ORDER BY first_college_year DESC
    LIMIT 1
    `,
    [firstCollegeYear],
  );
  if (nearest.rows[0]) return nearest.rows[0];

  const fallback = await db.query(
    `
    SELECT first_college_year, credit_hour_price
    FROM tuition_rules
    ORDER BY first_college_year ASC
    LIMIT 1
    `,
  );
  return fallback.rows[0] || null;
}

async function getActiveFeeComponents() {
  const r = await db.query(
    `
    SELECT component_key, label, amount
    FROM fee_components
    WHERE is_active = TRUE
    ORDER BY component_key ASC
    `,
  );
  return r.rows;
}

module.exports = {
  feesSchemaReady,
  getStudentFinancialProfile,
  getStudentCourses,
  getCreditHourPrice,
  getActiveFeeComponents,
};
