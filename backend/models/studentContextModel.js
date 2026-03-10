const db = require("../data/db");

async function getStudentByUserId(userId) {
  const r = await db.query(
    `
    SELECT s.student_id, s.department_id, d.name AS department_name
    FROM students s
    LEFT JOIN departments d ON d.department_id = s.department_id
    WHERE s.user_id = $1
    LIMIT 1
    `,
    [userId],
  );
  return r.rows[0] || null;
}

module.exports = {
  getStudentByUserId,
};

