const express = require("express");
const router = express.Router();
const db = require("../data/db");
const { verifyJWT } = require("../middleware/auth");

const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

// -------- helpers: auth + role --------
function getUserId(req) {
  // supports different token payload styles
  return req.user?.userId ?? req.user?.user_id ?? req.user?.id;
}

function getRole(req) {
  return String(req.user?.role ?? "").toLowerCase();
}

function allowAdminOrProfessor(req, res, next) {
  const role = getRole(req);
  if (role !== "admin" && role !== "professor") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
}

// Ownership check: professor can only access their own classes
async function assertClassAccess(req, res, next) {
  try {
    const role = getRole(req);
    if (role === "admin") return next();

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const classId = req.query.classId;
    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    // In YOUR DB currently classes.professor_id stores the professor's user_id
    const classRes = await db.query(
      "SELECT class_id FROM classes WHERE class_id = $1 AND professor_id = $2",
      [classId, userId],
    );

    if (classRes.rows.length === 0) {
      return res.status(403).json({ message: "You don't own this class" });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// -------- export helpers --------
function sendCSV(res, filename, rows, fields) {
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

function sendPDF(res, filename, title, summary, rows, columns) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(res);

  doc.on("error", (err) => {
    console.error("PDF error:", err);
    try {
      res.end();
    } catch {}
  });

  // ---------------------
  // Title
  // ---------------------
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#111827").text(title);
  doc.moveDown(0.4);

  doc
    .fontSize(11)
    .font("Helvetica")
    .fillColor("#6b7280")
    .text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown(1);

  // ---------------------
  // Summary (multi-line)
  // ---------------------
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#111827").text("Summary");
  doc.moveDown(0.4);

  Object.entries(summary).forEach(([k, v]) => {
    const label = String(k)
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase());
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#0f766e")
      .text(`${label}: ${v}`);
  });

  doc.moveDown(1.5);
  doc.fillColor("#111827");

  // ---------------------
  // Table
  // ---------------------
  const startX = doc.x;
  let y = doc.y;

  const colWidths = columns.map((c) => c.width || 100);
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  // Header background (light gray)
  doc.rect(startX, y, tableWidth, 20).fillOpacity(1).fill("#e5e7eb");

  doc.fillOpacity(1).fillColor("#111827").font("Helvetica-Bold").fontSize(10);

  let x = startX;
  columns.forEach((c, i) => {
    doc.text(c.label, x + 6, y + 5, { width: colWidths[i] - 12 });
    x += colWidths[i];
  });

  y += 25;
  doc.font("Helvetica").fontSize(10);

  if (!rows || rows.length === 0) {
    doc.fillColor("#6b7280").text("No data available.", startX, y);
    doc.end();
    return;
  }

  rows.forEach((r, index) => {
    if (y > 750) {
      doc.addPage();
      y = 50;
    }

    let x2 = startX;

    // zebra stripe
    if (index % 2 === 0) {
      doc
        .rect(startX, y - 2, tableWidth, 18)
        .fillOpacity(0.05)
        .fill("#111827");
      doc.fillOpacity(1);
    }

    columns.forEach((c, i) => {
      const value = c.render ? c.render(r) : r[c.key];
      doc.fillColor("#111827").text(String(value ?? ""), x2 + 6, y, {
        width: colWidths[i] - 12,
      });
      x2 += colWidths[i];
    });

    y += 18;
  });

  // Footer
  doc.moveDown(2);
  doc
    .fontSize(9)
    .fillColor("#9ca3af")
    .text("UniSphere Academic Information System", {
      align: "center",
    });

  doc.end();
}

// helper: fetch class/course info for a nicer title
async function getClassCourseInfo(classId) {
  const r = await db.query(
    `
    SELECT co.name, co.code, c.semester, c.year
    FROM classes c
    JOIN courses co ON co.course_id = c.course_id
    WHERE c.class_id = $1
    `,
    [classId],
  );
  return r.rows[0] || null;
}

// ============================
// 1) GRADES OVERVIEW (JSON)
// GET /api/reports/grades/overview?classId=123
// ============================
router.get(
  "/grades/overview",
  verifyJWT,
  allowAdminOrProfessor,
  assertClassAccess,
  async (req, res) => {
    try {
      const { classId } = req.query;

      const q = `
        SELECT
          s.student_id,
          u.email,
          COUNT(g.grade_id)::int AS graded_items,
          COALESCE(
            ROUND(AVG((g.score::numeric / NULLIF(g.max_score, 0)) * 100), 2),
            0
          ) AS avg_percent
        FROM enrollments e
        JOIN students s ON s.student_id = e.student_id
        JOIN users u ON u.user_id = s.user_id
        LEFT JOIN grades g
          ON g.class_id = e.class_id
         AND g.student_id = e.student_id
        WHERE e.class_id = $1
        GROUP BY s.student_id, u.email
        ORDER BY avg_percent DESC;
      `;

      const rows = (await db.query(q, [classId])).rows;

      const summary = {
        classId: Number(classId),
        students: rows.length,
        classAvg:
          rows.length === 0
            ? "0.00%"
            : `${Number(
                (
                  rows.reduce((acc, r) => acc + Number(r.avg_percent || 0), 0) /
                  rows.length
                ).toFixed(2),
              ).toFixed(2)}%`,
      };

      res.json({ summary, rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// ============================
// 2) ATTENDANCE OVERVIEW (JSON)
// GET /api/reports/attendance/overview?classId=123
// ============================
router.get(
  "/attendance/overview",
  verifyJWT,
  allowAdminOrProfessor,
  assertClassAccess,
  async (req, res) => {
    try {
      const { classId } = req.query;

      const q = `
        SELECT
          s.student_id,
          u.email,
          COUNT(ar.record_id)::int AS sessions_total,
          SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END)::int AS present_count,
          SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END)::int AS absent_count,
          SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END)::int AS late_count,
          SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END)::int AS excused_count,
          COALESCE(
            ROUND(
              CASE WHEN COUNT(ar.record_id) = 0 THEN 0
              ELSE (SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(ar.record_id)) * 100
              END
            , 2)
          , 0) AS attendance_percent
        FROM enrollments e
        JOIN students s ON s.student_id = e.student_id
        JOIN users u ON u.user_id = s.user_id
        LEFT JOIN attendance_sessions asess
          ON asess.class_id = e.class_id
        LEFT JOIN attendance_records ar
          ON ar.session_id = asess.session_id
         AND ar.student_id = e.student_id
        WHERE e.class_id = $1
        GROUP BY s.student_id, u.email
        ORDER BY attendance_percent DESC;
      `;

      const rows = (await db.query(q, [classId])).rows;

      const avg =
        rows.length === 0
          ? 0
          : rows.reduce(
              (acc, r) => acc + Number(r.attendance_percent || 0),
              0,
            ) / rows.length;

      const summary = {
        classId: Number(classId),
        students: rows.length,
        avgAttendance: `${avg.toFixed(2)}%`,
      };

      res.json({ summary, rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// ============================
// 3) GRADES EXPORT
// GET /api/reports/grades/export?classId=123&format=csv|pdf
// ============================
router.get(
  "/grades/export",
  verifyJWT,
  allowAdminOrProfessor,
  assertClassAccess,
  async (req, res) => {
    try {
      const { classId, format = "csv" } = req.query;

      const q = `
        SELECT
          s.student_id,
          u.email,
          COUNT(g.grade_id)::int AS graded_items,
          COALESCE(
            ROUND(AVG((g.score::numeric / NULLIF(g.max_score, 0)) * 100), 2),
            0
          ) AS avg_percent
        FROM enrollments e
        JOIN students s ON s.student_id = e.student_id
        JOIN users u ON u.user_id = s.user_id
        LEFT JOIN grades g
          ON g.class_id = e.class_id
         AND g.student_id = e.student_id
        WHERE e.class_id = $1
        GROUP BY s.student_id, u.email
        ORDER BY avg_percent DESC;
      `;

      const rows = (await db.query(q, [classId])).rows;

      if (String(format).toLowerCase() === "pdf") {
        const info = await getClassCourseInfo(classId);
        const title = info
          ? `Grades Overview Report\n${info.code} - ${info.name} (${info.semester} ${info.year})`
          : "Grades Overview Report";

        const avg =
          rows.length === 0
            ? 0
            : rows.reduce((acc, r) => acc + Number(r.avg_percent || 0), 0) /
              rows.length;

        return sendPDF(
          res,
          `grades_report_class_${classId}.pdf`,
          title,
          {
            classId: Number(classId),
            students: rows.length,
            classAvg: `${avg.toFixed(2)}%`,
          },
          rows,
          [
            { key: "student_id", label: "Student ID", width: 80 },
            { key: "email", label: "Email", width: 230 },
            { key: "graded_items", label: "Items", width: 70 },
            {
              key: "avg_percent",
              label: "Avg %",
              width: 80,
              render: (r) => `${Number(r.avg_percent || 0).toFixed(2)}%`,
            },
          ],
        );
      }

      return sendCSV(res, `grades_report_class_${classId}.csv`, rows, [
        "student_id",
        "email",
        "graded_items",
        "avg_percent",
      ]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// ============================
// 4) ATTENDANCE EXPORT
// GET /api/reports/attendance/export?classId=123&format=csv|pdf
// ============================
router.get(
  "/attendance/export",
  verifyJWT,
  allowAdminOrProfessor,
  assertClassAccess,
  async (req, res) => {
    try {
      const { classId, format = "csv" } = req.query;

      const q = `
        SELECT
          s.student_id,
          u.email,
          COUNT(ar.record_id)::int AS sessions_total,
          SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END)::int AS present_count,
          SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END)::int AS absent_count,
          SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END)::int AS late_count,
          SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END)::int AS excused_count,
          COALESCE(
            ROUND(
              CASE WHEN COUNT(ar.record_id) = 0 THEN 0
              ELSE (SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(ar.record_id)) * 100
              END
            , 2)
          , 0) AS attendance_percent
        FROM enrollments e
        JOIN students s ON s.student_id = e.student_id
        JOIN users u ON u.user_id = s.user_id
        LEFT JOIN attendance_sessions asess
          ON asess.class_id = e.class_id
        LEFT JOIN attendance_records ar
          ON ar.session_id = asess.session_id
         AND ar.student_id = e.student_id
        WHERE e.class_id = $1
        GROUP BY s.student_id, u.email
        ORDER BY attendance_percent DESC;
      `;

      const rows = (await db.query(q, [classId])).rows;

      if (String(format).toLowerCase() === "pdf") {
        const info = await getClassCourseInfo(classId);
        const title = info
          ? `Attendance Overview Report\n${info.code} - ${info.name} (${info.semester} ${info.year})`
          : "Attendance Overview Report";

        const avg =
          rows.length === 0
            ? 0
            : rows.reduce(
                (acc, r) => acc + Number(r.attendance_percent || 0),
                0,
              ) / rows.length;

        return sendPDF(
          res,
          `attendance_report_class_${classId}.pdf`,
          title,
          {
            classId: Number(classId),
            students: rows.length,
            avgAttendance: `${avg.toFixed(2)}%`,
          },
          rows,
          [
            { key: "student_id", label: "Student ID", width: 80 },
            { key: "email", label: "Email", width: 110 },
            { key: "sessions_total", label: "Sessions", width: 70 },
            { key: "present_count", label: "Present", width: 60 },
            { key: "absent_count", label: "Absent", width: 60 },
            { key: "late_count", label: "Late", width: 50 },
            { key: "excused_count", label: "Excused", width: 65 },
            {
              key: "attendance_percent",
              label: "Percent",
              width: 65,
              render: (r) => `${Number(r.attendance_percent || 0).toFixed(2)}%`,
            },
          ],
        );
      }

      return sendCSV(res, `attendance_report_class_${classId}.csv`, rows, [
        "student_id",
        "email",
        "sessions_total",
        "present_count",
        "absent_count",
        "late_count",
        "excused_count",
        "attendance_percent",
      ]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
