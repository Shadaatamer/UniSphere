const express = require("express");
const router = express.Router();
const db = require("../data/db");

router.post("/predict-risk", async (req, res) => {
  try {
    const { student_id, course_code } = req.body;

    if (!student_id || !course_code) {
      return res
        .status(400)
        .json({ error: "student_id and course_code required" });
    }

    // 1️⃣ Get enrollment
    const enrollmentResult = await db.query(
      `
      SELECT
        e.enrollment_id,
        e.student_id,
        e.class_id,
        co.code    AS code_module,
        co.name    AS course_name,
        co.credits AS studied_credits
      FROM enrollments e
      JOIN classes  c  ON e.class_id  = c.class_id
      JOIN courses  co ON c.course_id = co.course_id
      WHERE e.student_id = $1
        AND co.code      = $2
      LIMIT 1
      `,
      [student_id, course_code],
    );
    const enrollment = enrollmentResult.rows;

    if (enrollment.length === 0) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    const enrollment_id = enrollment[0].enrollment_id;

    // 2️⃣ Get grades
    const gradesResult = await db.query(
      `
      SELECT
        COALESCE(AVG(score), 0) AS avg_score,
        COUNT(*)                AS assessments_done
      FROM grades
      WHERE enrollment_id = $1
      `,
      [enrollment_id],
    );
    const grades = gradesResult.rows;

    // 3️⃣ Get attendance — calculate rate for display, not sent to ML model
    const attendanceResult = await db.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'Present') AS attended,
        COUNT(*)                                   AS total
      FROM attendance
      WHERE enrollment_id = $1
      `,
      [enrollment_id],
    );
    const attendance = attendanceResult.rows;

    // 4️⃣ Get student info
    const studentResult = await db.query(
      `
      SELECT s.student_id, u.full_name
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.student_id = $1
      `,
      [student_id],
    );
    const student = studentResult.rows;

    if (student.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const attended = Number(attendance[0]?.attended || 0);
    const total = Number(attendance[0]?.total || 0);
    const attendance_rate =
      total > 0 ? ((attended / total) * 100).toFixed(1) : "0.0";

    const avg_score = Number(grades[0]?.avg_score || 0);
    const assessments_done = Number(grades[0]?.assessments_done || 0);
    const gpa = Math.min(4.0, (avg_score / 100) * 4).toFixed(2);

    // 5️⃣ Build ML payload — no sum_click
    const payload = {
      studied_credits: Number(enrollment[0].studied_credits || 0),
      code_module: enrollment[0].code_module,
      avg_score,
      assessments_done,
    };

    // 6️⃣ Call Flask AI service
    let aiData = {};
    try {
      const aiResponse = await fetch("http://localhost:5001/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      aiData = await aiResponse.json();
      console.log("aiData:", aiData);
    } catch (flaskError) {
      console.error("Flask call failed:", flaskError.message);
    }

    return res.json({
      ...aiData,
      student_name: student[0].full_name,
      course_name: enrollment[0].course_name,
      gpa,
      input_features: {
        ...payload,
        attendance_rate, // sent separately for display only, not used in ML
        attended,
        total,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Prediction pipeline failed" });
  }
});

module.exports = router;
