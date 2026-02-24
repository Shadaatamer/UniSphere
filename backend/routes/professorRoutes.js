const express = require("express");
const router = express.Router();

const db = require("../data/db");
const { verifyJWT, professorOnly } = require("../middleware/auth");

// GET /api/professor/dashboard
router.get("/dashboard", verifyJWT, professorOnly, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const deptRes = await db.query(
      `
      SELECT d.name AS department_name
      FROM professors p
      JOIN departments d ON d.department_id = p.department_id
      WHERE p.user_id = $1
      `,
      [userId],
    );

    const department = deptRes.rows[0]?.department_name || "Faculty";
    // 2) Active Courses = number of classes taught by this professor
    const activeCoursesRes = await db.query(
      `
      SELECT COUNT(*)::int AS count
      FROM classes c
      WHERE c.professor_id = $1
      `,
      [userId],
    );
    const activeCourses = activeCoursesRes.rows[0]?.count ?? 0;

    // 3) Total Students = distinct students enrolled in this professor's classes
    const totalStudentsRes = await db.query(
      `
      SELECT COUNT(DISTINCT e.student_id)::int AS count
      FROM classes c
      JOIN enrollments e ON e.class_id = c.class_id
      WHERE c.professor_id = $1
      `,
      [userId],
    );
    const totalStudents = totalStudentsRes.rows[0]?.count ?? 0;

    // 4) Pending Grading (simple, useful definition):
    // count enrollments (students in classes) that have NO grades at all yet
    const pendingGradingRes = await db.query(
      `
      SELECT COUNT(*)::int AS count
      FROM enrollments e
      JOIN classes c ON c.class_id = e.class_id
      WHERE c.professor_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM grades g
          WHERE g.class_id = e.class_id
            AND g.student_id = e.student_id
        )
      `,
      [userId],
    );
    const pendingGrading = pendingGradingRes.rows[0]?.count ?? 0;

    // 5) Classes Today:
    // we don't have a class timetable table. BUT we *do* have exam_schedules.
    // We'll treat "classes today" as "exams today" (better than fake numbers).
    const classesTodayRes = await db.query(
      `
      SELECT COUNT(DISTINCT es.class_id)::int AS count
      FROM exam_schedules es
      JOIN classes c ON c.class_id = es.class_id
      WHERE c.professor_id = $1
        AND es.exam_date::date = CURRENT_DATE
      `,
      [userId],
    );
    const classesToday = classesTodayRes.rows[0]?.count ?? 0;

    // 6) Course performance (based on grades avg %) per course (top 3)
    const coursePerformanceRes = await db.query(
      `
      SELECT
        co.name AS course,
        COALESCE(
          ROUND(AVG((g.score::numeric / NULLIF(g.max_score,0)) * 100), 0),
          0
        )::int AS avg
      FROM classes c
      JOIN courses co ON co.course_id = c.course_id
      LEFT JOIN grades g ON g.class_id = c.class_id
      WHERE c.professor_id = $1
      GROUP BY co.name
      ORDER BY avg DESC
      LIMIT 3
      `,
      [userId],
    );

    const coursePerformance = coursePerformanceRes.rows.map((r) => ({
      course: r.course,
      avg: r.avg,
    }));

    res.json({
      header: {
        title: "Professor Portal",
        subtitle: "Overview of your teaching workload",
        department,
      },

      stats: [
        { label: "Active Courses", value: activeCourses },
        { label: "Total Students", value: totalStudents },
        { label: "Pending Grading", value: pendingGrading },
        { label: "Classes Today", value: classesToday },
      ],

      quickActions: [
        { key: "attendance", label: "Mark Attendance" },
        { key: "grades", label: "Enter Grades" },
        { key: "announce", label: "view Announcements" },
        { key: "students", label: "My Classes" },
      ],

      //  UI expects todaySchedule
      todaySchedule: [
        {
          course: "DSP",
          time: "10:00 AM - 12:00 PM",
          location: "Lab 301",
          students: 45,
        },
        {
          course: "Control Systems",
          time: "2:00 PM - 4:00 PM",
          location: "Hall B-205",
          students: 38,
        },
      ],

      // ✅ UI expects submissions array
      submissions: [
        { title: "DSP Lab Report", when: "10 min ago", meta: "15 submissions" },
        {
          title: "Control Systems Project",
          when: "2 hours ago",
          meta: "3 submissions",
        },
      ],

      // ✅ UI expects coursePerformance
      coursePerformance,

      // ✅ UI expects pendingTasks with {title,count}
      pendingTasks: [
        { title: "Grade DSP Lab Reports", count: "15" },
        { title: "Approve Project Proposals", count: "3" },
      ],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
// GET /api/professor/classes/list
router.get("/classes/list", verifyJWT, professorOnly, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await db.query(
      `
      SELECT
        c.class_id,
        co.code,
        co.name,
        c.semester,
        c.year
      FROM classes c
      JOIN courses co ON co.course_id = c.course_id
      WHERE c.professor_id = $1
      ORDER BY c.year DESC, c.semester DESC, co.code ASC
      `,
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
