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

    res.json({
      header: {
        title: "Professor Portal",
        subtitle: "Overview of your teaching workload",
        department, // ✅ now header.department exists
      },

      stats: [
        { label: "Active Courses", value: 4 },
        { label: "Total Students", value: 186 },
        { label: "Pending Grading", value: 32 },
        { label: "Classes Today", value: 2 },
      ],

      quickActions: [
        { key: "attendance", label: "Mark Attendance" },
        { key: "grades", label: "Enter Grades" },
        { key: "announce", label: "Post Announcement" },
        { key: "students", label: "View Students" },
      ],

      // ✅ UI expects todaySchedule
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
      coursePerformance: [
        { course: "DSP", avg: 78 },
        { course: "Control Systems", avg: 72 },
        { course: "Power Electronics", avg: 81 },
      ],

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

module.exports = router;
