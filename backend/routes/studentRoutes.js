const express = require("express");
const router = express.Router();

const db = require("../data/db");
const { verifyJWT, studentOnly } = require("../middleware/auth");

// GET /api/student/dashboard
router.get("/dashboard", verifyJWT, studentOnly, async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Department name (if student exists)
    let department = "Faculty";
    try {
      const deptRes = await db.query(
        `
        SELECT d.name AS department_name
        FROM students s
        JOIN departments d ON d.department_id = s.department_id
        WHERE s.user_id = $1
        `,
        [userId],
      );
      department = deptRes.rows[0]?.department_name || department;
    } catch {}

    // ✅ Return FULL shape expected by StudentPage.jsx
    res.json({
      header: {
        title: "Welcome back",
        subtitle: "Here’s your academic overview",
      },
      department,

      stats: [
        { label: "Enrolled Courses", value: 6 },
        { label: "Current GPA", value: 3.75 },
        { label: "Credit Hours", value: 18 },
        { label: "Attendance", value: "92%" },
      ],

      quickActions: [
        { key: "register", label: "Register Courses" },
        { key: "grades", label: "View Grades" },
        { key: "transcript", label: "Request Transcript" },
      ],

      schedule: [
        {
          course: "Digital Signal Processing",
          time: "10:00 AM - 12:00 PM",
          location: "Lab 301",
        },
        {
          course: "Control Systems",
          time: "2:00 PM - 4:00 PM",
          location: "Hall B-205",
        },
        {
          course: "Power Electronics",
          time: "11:00 AM - 1:00 PM",
          location: "Lab 402",
        },
      ],

      announcements: [
        { title: "Midterm Exam Schedule Released", when: "2 hours ago" },
        { title: "Guest Lecture on AI in Engineering", when: "1 day ago" },
        { title: "Project Submission Guidelines Updated", when: "2 days ago" },
      ],

      courseProgress: [
        { course: "Digital Signal Processing", progress: 75 },
        { course: "Control Systems", progress: 68 },
        { course: "Power Electronics", progress: 82 },
      ],

      deadlines: [
        { title: "DSP Lab Report", when: "Due in 2 days" },
        { title: "Control Systems Project", when: "Due in 1 week" },
      ],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
