// AdminCourseManagement.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminCourseManagement() {
  // Courses
  const [courses, setCourses] = useState([]);
  const [courseForm, setCourseForm] = useState({ name: "", code: "", department_id: "", credit_hours: "" });
  const [coursePrerequisites, setCoursePrerequisites] = useState([]);
  const [selectedPrereqCourseId, setSelectedPrereqCourseId] = useState("");
  const [selectedRequiredCourseIds, setSelectedRequiredCourseIds] = useState([]);

  // Classes
  const [classes, setClasses] = useState([]);
  const [classForm, setClassForm] = useState({
    course_id: "",
    semester: "",
    year: "",
    professor_id: "",
  });

  // Professor Assignments
  const [professors, setProfessors] = useState([]);
  const [assignForm, setAssignForm] = useState({
    class_id: "",
    professor_id: "",
  });

  // Exams
  const [exams, setExams] = useState([]);
  const [examForm, setExamForm] = useState({
    class_id: "",
    exam_date: "",
    start_time: "",
    end_time: "",
    location: "",
  });

  // Fees config
  const [tuitionRules, setTuitionRules] = useState([]);
  const [tuitionRuleForm, setTuitionRuleForm] = useState({
    first_college_year: "",
    credit_hour_price: "",
  });
  const [feeComponents, setFeeComponents] = useState([]);
  const [registrationWindows, setRegistrationWindows] = useState([]);
  const [registrationWindowForm, setRegistrationWindowForm] = useState({
    first_college_year: "",
    semester: "",
    year: "",
    opens_at: "",
    closes_at: "",
    is_active: true,
  });
  const [registrationLoadPolicy, setRegistrationLoadPolicy] = useState(null);
  const [registrationLoadPolicyForm, setRegistrationLoadPolicyForm] = useState({
    halfload_gpa_threshold: "2.00",
    halfload_max_credits: "9",
    regular_max_credits: "18",
    overload_gpa_threshold: "3.30",
    overload_max_credits: "21",
  });

  // Scheduler
  const [rooms, setRooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [roomForm, setRoomForm] = useState({ name: "", capacity: "" });
  const [slotForm, setSlotForm] = useState({
    day: "",
    start_time: "",
    end_time: "",
  });
  const [scheduleParams, setScheduleParams] = useState({
    semester: "",
    year: "",
    populationSize: 60,
    generations: 80,
    mutationRate: 0.12,
  });
  const [scheduleResult, setScheduleResult] = useState(null);
  const [scheduleRuns, setScheduleRuns] = useState([]);
  const [professorUnavailability, setProfessorUnavailability] = useState([]);
  const [unavailabilityForm, setUnavailabilityForm] = useState({
    professor_id: "",
    slot_id: "",
    reason: "",
  });

  // Fetch initial data
  const fetchCourses = () => {
    api
      .get("/admin/courses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setCourses(res.data))
      .catch((err) => console.error(err));
  };

  const fetchCoursePrerequisites = () => {
    api
      .get("/admin/course-prerequisites", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setCoursePrerequisites(res.data || []))
      .catch((err) => console.error(err));
  };

  const fetchClasses = () => {
    api
      .get("/admin/classes", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setClasses(res.data))
      .catch((err) => console.error(err));
  };

  const fetchProfessors = () => {
    api
      .get("/admin/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) =>
        setProfessors(res.data.filter((u) => u.role === "professor")),
      )
      .catch((err) => console.error(err));
  };

  const fetchExams = () => {
    api
      .get("/admin/exams", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setExams(res.data))
      .catch((err) => console.error(err));
  };

  const fetchTuitionRules = () => {
    api
      .get("/admin/fees/tuition-rules", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setTuitionRules(res.data))
      .catch((err) => console.error(err));
  };

  const fetchFeeComponents = () => {
    api
      .get("/admin/fees/components", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setFeeComponents(res.data))
      .catch((err) => console.error(err));
  };

  const fetchRegistrationWindows = () => {
    api
      .get("/admin/registration-windows", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setRegistrationWindows(res.data))
      .catch((err) => console.error(err));
  };

  const fetchRegistrationLoadPolicy = () => {
    api
      .get("/admin/registration-load-policy", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        setRegistrationLoadPolicy(res.data || null);
        if (res.data) {
          setRegistrationLoadPolicyForm({
            halfload_gpa_threshold: String(res.data.halfload_gpa_threshold ?? "2.00"),
            halfload_max_credits: String(res.data.halfload_max_credits ?? "9"),
            regular_max_credits: String(res.data.regular_max_credits ?? "18"),
            overload_gpa_threshold: String(res.data.overload_gpa_threshold ?? "3.30"),
            overload_max_credits: String(res.data.overload_max_credits ?? "21"),
          });
        }
      })
      .catch((err) => console.error(err));
  };

  const fetchSchedulerResources = () => {
    api
      .get("/scheduler/resources", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: {
          semester: scheduleParams.semester,
          year: scheduleParams.year,
        },
      })
      .then((res) => {
        setRooms(res.data?.rooms || []);
        setTimeSlots(res.data?.timeSlots || []);
        setProfessors(res.data?.professors || professors);
        setProfessorUnavailability(res.data?.unavailability || []);
      })
      .catch((err) => console.error(err));
  };

  const fetchScheduleRuns = () => {
    api
      .get("/scheduler/runs", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setScheduleRuns(res.data || []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchCourses();
    fetchCoursePrerequisites();
    fetchClasses();
    fetchProfessors();
    fetchExams();
    fetchTuitionRules();
    fetchFeeComponents();
    fetchRegistrationWindows();
    fetchRegistrationLoadPolicy();
    fetchSchedulerResources();
    fetchScheduleRuns();
  }, []);

  // --- Handlers ---
  const handleCourseSubmit = (e) => {
    e.preventDefault();
    api
      .post("/admin/courses", courseForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Course created");
        setCourseForm({
          name: "",
          code: "",
          department_id: "",
          credit_hours: "",
        });
        fetchCourses();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleClassSubmit = (e) => {
    e.preventDefault();
    api
      .post("/admin/classes", classForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Class created");
        setClassForm({
          course_id: "",
          semester: "",
          year: "",
          professor_id: "",
        });
        fetchClasses();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    api
      .put(
        `/admin/classes/${assignForm.class_id}/professor`,
        { professor_id: assignForm.professor_id },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )
      .then(() => {
        alert("Professor assigned");
        setAssignForm({ class_id: "", professor_id: "" });
        fetchClasses();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleExamSubmit = (e) => {
    e.preventDefault();

    // Ensure all required fields are included
    const payload = {
      exam_type: examForm.exam_type, // midterm/final
      exam_date: examForm.exam_date,
      start_time: examForm.start_time,
      end_time: examForm.end_time,
      location: examForm.location,
    };

    api
      .post(`/admin/classes/${examForm.class_id}/exams`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Exam scheduled");
        // Reset all fields including exam_type
        setExamForm({
          class_id: "",
          exam_type: "",
          exam_date: "",
          start_time: "",
          end_time: "",
          location: "",
        });
        fetchExams(); // Refresh table
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleTuitionRuleSubmit = (e) => {
    e.preventDefault();
    api
      .post("/admin/fees/tuition-rules", tuitionRuleForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Tuition rule saved");
        setTuitionRuleForm({ first_college_year: "", credit_hour_price: "" });
        fetchTuitionRules();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleDeleteTuitionRule = (ruleId) => {
    const ok = window.confirm("Delete this tuition rule?");
    if (!ok) return;
    api
      .delete(`/admin/fees/tuition-rules/${ruleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Tuition rule deleted");
        fetchTuitionRules();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleFeeComponentChange = (componentKey, field, value) => {
    setFeeComponents((prev) =>
      prev.map((c) =>
        c.component_key === componentKey ? { ...c, [field]: value } : c,
      ),
    );
  };

  const handleFeeComponentSave = (component) => {
    api
      .put(
        `/admin/fees/components/${component.component_key}`,
        {
          label: component.label,
          amount: Number(component.amount),
          is_active: !!component.is_active,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )
      .then(() => {
        alert("Fee component updated");
        fetchFeeComponents();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleRegistrationWindowSubmit = (e) => {
    e.preventDefault();
    api
      .post("/admin/registration-windows", registrationWindowForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Registration window saved");
        setRegistrationWindowForm({
          first_college_year: "",
          semester: "",
          year: "",
          opens_at: "",
          closes_at: "",
          is_active: true,
        });
        fetchRegistrationWindows();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleDeleteRegistrationWindow = (windowId) => {
    const ok = window.confirm("Delete this registration window?");
    if (!ok) return;
    api
      .delete(`/admin/registration-windows/${windowId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Registration window deleted");
        fetchRegistrationWindows();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handlePrerequisiteToggle = (requiredCourseId) => {
    setSelectedRequiredCourseIds((prev) =>
      prev.includes(requiredCourseId)
        ? prev.filter((id) => id !== requiredCourseId)
        : [...prev, requiredCourseId],
    );
  };

  const handleSavePrerequisites = () => {
    if (!selectedPrereqCourseId) {
      alert("Select a course first");
      return;
    }

    api
      .put(
        `/admin/courses/${selectedPrereqCourseId}/prerequisites`,
        { required_course_ids: selectedRequiredCourseIds },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      )
      .then(() => {
        alert("Prerequisites updated");
        fetchCourses();
        fetchCoursePrerequisites();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    if (!selectedPrereqCourseId) {
      setSelectedRequiredCourseIds([]);
      return;
    }
    const nextIds = coursePrerequisites
      .filter((item) => Number(item.course_id) === Number(selectedPrereqCourseId))
      .map((item) => Number(item.required_course_id));
    setSelectedRequiredCourseIds(nextIds);
  }, [selectedPrereqCourseId, coursePrerequisites]);

  const handleRegistrationLoadPolicySubmit = (e) => {
    e.preventDefault();
    api
      .post("/admin/registration-load-policy", registrationLoadPolicyForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Registration load policy saved");
        fetchRegistrationLoadPolicy();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleRoomSubmit = (e) => {
    e.preventDefault();
    api
      .post("/scheduler/rooms", roomForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Room added");
        setRoomForm({ name: "", capacity: "" });
        fetchSchedulerResources();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleDeleteRoom = (roomId) => {
    const ok = window.confirm("Delete this room?");
    if (!ok) return;
    api
      .delete(`/scheduler/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Room deleted");
        fetchSchedulerResources();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleSlotSubmit = (e) => {
    e.preventDefault();
    api
      .post("/scheduler/time-slots", slotForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Time slot added");
        setSlotForm({ day: "", start_time: "", end_time: "" });
        fetchSchedulerResources();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleDeleteSlot = (slotId) => {
    const ok = window.confirm("Delete this time slot?");
    if (!ok) return;
    api
      .delete(`/scheduler/time-slots/${slotId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Time slot deleted");
        fetchSchedulerResources();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const exportScheduleCsv = (assignments) => {
    const header = [
      "Class ID",
      "Course Code",
      "Professor",
      "Day",
      "Start",
      "End",
      "Room",
    ];
    const rows = (assignments || []).map((a) => [
      a.class_id || "",
      a.course_code || "",
      a.professor_name || a.professor_id || "",
      a.day || "",
      a.start || "",
      a.end || "",
      a.room_name || "",
    ]);
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schedule_run.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const conflictSummary = (conflicts) => {
    const summary = {};
    (conflicts || []).forEach((c) => {
      summary[c.type] = (summary[c.type] || 0) + 1;
    });
    return summary;
  };

  const buildScheduleGrid = () => {
    if (!scheduleResult?.assignments?.length || !timeSlots.length) return null;

    const dayOrder = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const days = Array.from(new Set(timeSlots.map((s) => s.day))).sort(
      (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b),
    );

    const slotLabels = Array.from(
      new Map(
        timeSlots.map((s) => [
          `${s.start_time}_${s.end_time}`,
          {
            key: `${s.start_time}_${s.end_time}`,
            label: `${s.start_time}-${s.end_time}`,
            start: s.start_time,
            end: s.end_time,
          },
        ]),
      ).values(),
    ).sort((a, b) => a.start.localeCompare(b.start));

    const grid = new Map();
    scheduleResult.assignments.forEach((a) => {
      const key = `${a.day}_${a.start}_${a.end}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(a);
    });

    return { days, slotLabels, grid };
  };
  const handleRunScheduler = (e) => {
    e.preventDefault();
    api
      .post(
        "/scheduler/run-db",
        {
          semester: scheduleParams.semester || undefined,
          year: scheduleParams.year || undefined,
          populationSize: Number(scheduleParams.populationSize),
          generations: Number(scheduleParams.generations),
          mutationRate: Number(scheduleParams.mutationRate),
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )
      .then((res) => {
        setScheduleResult(res.data);
        fetchScheduleRuns();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleApplySchedule = () => {
    if (!scheduleResult?.assignments?.length) return;
    const ok = window.confirm("Apply this schedule to classes?");
    if (!ok) return;
    api
      .post(
        "/scheduler/apply",
        { assignments: scheduleResult.assignments },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )
      .then(() => {
        alert("Schedule applied to classes");
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleApplyRun = (runId) => {
    const ok = window.confirm("Apply this saved schedule run?");
    if (!ok) return;
    api
      .post(
        `/scheduler/runs/${runId}/apply`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )
      .then(() => alert("Schedule run applied"))
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handlePostAnnouncement = () => {
    if (!scheduleResult?.assignments?.length) return;
    const title = "Timetable Schedule Published";
    const body = `A new timetable schedule has been published. Please check your course schedule. (Run ID: ${scheduleResult.run_id || "N/A"})`;
    api
      .post(
        "/scheduler/announce",
        { title, body },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )
      .then(() => alert("Announcement posted"))
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleUnavailabilitySubmit = (e) => {
    e.preventDefault();
    api
      .post("/scheduler/unavailability", unavailabilityForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Unavailability saved");
        setUnavailabilityForm({ professor_id: "", slot_id: "", reason: "" });
        fetchSchedulerResources();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const handleDeleteUnavailability = (id) => {
    const ok = window.confirm("Delete this unavailability?");
    if (!ok) return;
    api
      .delete(`/scheduler/unavailability/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("Unavailability deleted");
        fetchSchedulerResources();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  // --- Render ---
  const sectionStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "40px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  };

  const inputStyle = {
    flex: "1 1 150px",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #d9ded8",
  };

  const buttonStyle = {
    padding: "10px 16px",
    backgroundColor: "#2f5d50",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: 10 }}>
        Course Management
      </h1>
      <p style={{ marginBottom: 30, color: "#6b7280" }}>
        Admin View: manage courses, classes, professors, and exams
      </p>

      {/* --- CREATE COURSE --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Create New Course</h2>
        <form
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          onSubmit={handleCourseSubmit}
        >
          <input
            placeholder="Course Name"
            value={courseForm.name}
            onChange={(e) =>
              setCourseForm({ ...courseForm, name: e.target.value })
            }
            style={inputStyle}
            required
          />
          <input
            placeholder="Course Code"
            value={courseForm.code}
            onChange={(e) =>
              setCourseForm({ ...courseForm, code: e.target.value })
            }
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Dept ID"
            value={courseForm.department_id}
            onChange={(e) =>
              setCourseForm({ ...courseForm, department_id: e.target.value })
            }
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Credit Hours"
            value={courseForm.credit_hours}
            onChange={(e) =>
              setCourseForm({ ...courseForm, credit_hours: e.target.value })
            }
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle}>
            Create
          </button>
        </form>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Course Prerequisites</h2>
        <p style={{ marginTop: 0, marginBottom: 12, color: "#6b7280" }}>
          Choose a course, then mark the courses students must complete before registering.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          <select
            value={selectedPrereqCourseId}
            onChange={(e) => setSelectedPrereqCourseId(e.target.value)}
            style={{ ...inputStyle, maxWidth: 420 }}
          >
            <option value="">Select Course</option>
            {courses.map((course) => (
              <option key={course.course_id} value={course.course_id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>

          {selectedPrereqCourseId ? (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 14,
                maxHeight: 260,
                overflowY: "auto",
                display: "grid",
                gap: 8,
              }}
            >
              {courses
                .filter((course) => Number(course.course_id) !== Number(selectedPrereqCourseId))
                .map((course) => (
                  <label
                    key={course.course_id}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRequiredCourseIds.includes(Number(course.course_id))}
                      onChange={() => handlePrerequisiteToggle(Number(course.course_id))}
                    />
                    {course.code} - {course.name}
                  </label>
                ))}
            </div>
          ) : null}

          <div>
            <button
              type="button"
              style={buttonStyle}
              onClick={handleSavePrerequisites}
              disabled={!selectedPrereqCourseId}
            >
              Save Prerequisites
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
                <th style={{ padding: "10px" }}>Course</th>
                <th style={{ padding: "10px" }}>Prerequisites</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const prerequisites = coursePrerequisites.filter(
                  (item) => Number(item.course_id) === Number(course.course_id),
                );
                return (
                  <tr key={course.course_id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px", fontWeight: 700 }}>
                      {course.code} - {course.name}
                    </td>
                    <td style={{ padding: "10px" }}>
                      {prerequisites.length
                        ? prerequisites
                            .map((item) => item.required_course_code || item.required_course_name)
                            .join(", ")
                        : "None"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE CLASS --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Create Class</h2>
        <form
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          onSubmit={handleClassSubmit}
        >
          <select
            value={classForm.course_id}
            onChange={(e) =>
              setClassForm({ ...classForm, course_id: e.target.value })
            }
            style={inputStyle}
            required
          >
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          <select
            value={classForm.professor_id}
            onChange={(e) =>
              setClassForm({ ...classForm, professor_id: e.target.value })
            }
            style={inputStyle}
            required
          >
            <option value="">Select Professor</option>
            {professors.map((p) => (
              <option key={p.professor_id} value={p.professor_id}>
                {p.name || p.email}{" "}
              </option>
            ))}
          </select>
          <input
            placeholder="Semester"
            value={classForm.semester}
            onChange={(e) =>
              setClassForm({ ...classForm, semester: e.target.value })
            }
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Year"
            value={classForm.year}
            onChange={(e) =>
              setClassForm({ ...classForm, year: e.target.value })
            }
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle}>
            Create
          </button>
        </form>

        {/* Classes Table */}
        <table
          style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}
        >
          <thead>
            <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>ID</th>
              <th style={{ padding: "10px" }}>Course</th>
              <th style={{ padding: "10px" }}>Semester</th>
              <th style={{ padding: "10px" }}>Year</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cl) => (
              <tr key={cl.class_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{cl.class_id}</td>
                <td style={{ padding: "10px" }}>
                  {courses.find((c) => c.course_id === cl.course_id)?.name}
                </td>
                <td style={{ padding: "10px" }}>{cl.semester}</td>
                <td style={{ padding: "10px" }}>{cl.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- ASSIGN PROFESSOR --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Assign Professor to Class</h2>
        <form
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          onSubmit={handleAssignSubmit}
        >
          <select
            value={assignForm.class_id}
            onChange={(e) =>
              setAssignForm({ ...assignForm, class_id: e.target.value })
            }
            style={inputStyle}
            required
          >
            <option value="">Select Class</option>
            {classes.map((cl) => (
              <option key={cl.class_id} value={cl.class_id}>
                {courses.find((c) => c.course_id === cl.course_id)?.name} -{" "}
                {cl.semester} {cl.year}
              </option>
            ))}
          </select>
          <select
            value={assignForm.professor_id}
            onChange={(e) =>
              setAssignForm({ ...assignForm, professor_id: e.target.value })
            }
            style={inputStyle}
            required
          >
            <option value="">Select Professor</option>
            {professors.map((p) => (
              <option key={p.professor_id} value={p.professor_id}>
                {p.name || p.email}{" "}
              </option>
            ))}
          </select>
          <button type="submit" style={buttonStyle}>
            Assign
          </button>
        </form>
      </div>

      {/* --- SCHEDULE EXAM --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Schedule Exam</h2>
        <form
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          onSubmit={handleExamSubmit}
        >
          <select
            value={examForm.class_id}
            onChange={(e) =>
              setExamForm({ ...examForm, class_id: e.target.value })
            }
            style={inputStyle}
            required
          >
            <option value="">Select Class</option>
            {classes.map((cl) => (
              <option key={cl.class_id} value={cl.class_id}>
                {courses.find((c) => c.course_id === cl.course_id)?.name} -{" "}
                {cl.semester} {cl.year}
              </option>
            ))}
          </select>

          {/* New exam type dropdown */}
          <select
            value={examForm.exam_type || ""}
            onChange={(e) =>
              setExamForm({ ...examForm, exam_type: e.target.value })
            }
            style={inputStyle}
            required
          >
            <option value="">Select Exam Type</option>
            <option value="midterm">Midterm</option>
            <option value="final">Final</option>
          </select>

          <input
            type="date"
            value={examForm.exam_date}
            onChange={(e) =>
              setExamForm({ ...examForm, exam_date: e.target.value })
            }
            style={inputStyle}
            required
          />
          <input
            type="time"
            value={examForm.start_time}
            onChange={(e) =>
              setExamForm({ ...examForm, start_time: e.target.value })
            }
            style={inputStyle}
            required
          />
          <input
            type="time"
            value={examForm.end_time}
            onChange={(e) =>
              setExamForm({ ...examForm, end_time: e.target.value })
            }
            style={inputStyle}
            required
          />
          <input
            placeholder="Location"
            value={examForm.location}
            onChange={(e) =>
              setExamForm({ ...examForm, location: e.target.value })
            }
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle}>
            Schedule
          </button>
        </form>

        {/* Exams Table */}
        <table
          style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}
        >
          <thead>
            <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>ID</th>
              <th style={{ padding: "10px" }}>Class</th>
              <th style={{ padding: "10px" }}>Type</th>
              <th style={{ padding: "10px" }}>Date</th>
              <th style={{ padding: "10px" }}>Start</th>
              <th style={{ padding: "10px" }}>End</th>
              <th style={{ padding: "10px" }}>Location</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((ex) => (
              <tr key={ex.exam_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{ex.exam_id}</td>
                <td style={{ padding: "10px" }}>
                  {ex.course_name} - {ex.semester} {ex.year}
                </td>
                <td style={{ padding: "10px" }}>{ex.exam_type}</td>
                <td style={{ padding: "10px" }}>{ex.exam_date}</td>
                <td style={{ padding: "10px" }}>{ex.start_time}</td>
                <td style={{ padding: "10px" }}>{ex.end_time}</td>
                <td style={{ padding: "10px" }}>{ex.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* --- FEES: TUITION RULES --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Tuition Rules (Credit Hour Price)</h2>
        <form
          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          onSubmit={handleTuitionRuleSubmit}
        >
          <input
            type="number"
            placeholder="First College Year (e.g. 2023)"
            value={tuitionRuleForm.first_college_year}
            onChange={(e) =>
              setTuitionRuleForm({
                ...tuitionRuleForm,
                first_college_year: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Credit Hour Price"
            value={tuitionRuleForm.credit_hour_price}
            onChange={(e) =>
              setTuitionRuleForm({
                ...tuitionRuleForm,
                credit_hour_price: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle}>
            Save Rule
          </button>
        </form>

        <table
          style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}
        >
          <thead>
            <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>Year</th>
              <th style={{ padding: "10px" }}>Credit Hour Price</th>
              <th style={{ padding: "10px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tuitionRules.map((r) => (
              <tr key={r.rule_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{r.first_college_year}</td>
                <td style={{ padding: "10px" }}>
                  {Number(r.credit_hour_price || 0).toFixed(2)}
                </td>
                <td style={{ padding: "10px" }}>
                  <button
                    type="button"
                    style={{ ...buttonStyle, backgroundColor: "#dc2626" }}
                    onClick={() => handleDeleteTuitionRule(r.rule_id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {tuitionRules.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    padding: "10px",
                    color: "#999",
                    textAlign: "center",
                  }}
                >
                  No tuition rules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- FEES: COMPONENTS --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Fee Components</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>Key</th>
              <th style={{ padding: "10px" }}>Label</th>
              <th style={{ padding: "10px" }}>Amount</th>
              <th style={{ padding: "10px" }}>Active</th>
              <th style={{ padding: "10px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {feeComponents.map((c) => (
              <tr
                key={c.component_key}
                style={{ borderBottom: "1px solid #eee" }}
              >
                <td style={{ padding: "10px", fontWeight: 700 }}>
                  {c.component_key}
                </td>
                <td style={{ padding: "10px" }}>
                  <input
                    value={c.label}
                    onChange={(e) =>
                      handleFeeComponentChange(
                        c.component_key,
                        "label",
                        e.target.value,
                      )
                    }
                    style={{ ...inputStyle, minWidth: 180 }}
                  />
                </td>
                <td style={{ padding: "10px" }}>
                  <input
                    type="number"
                    step="0.01"
                    value={c.amount}
                    onChange={(e) =>
                      handleFeeComponentChange(
                        c.component_key,
                        "amount",
                        e.target.value,
                      )
                    }
                    style={{ ...inputStyle, minWidth: 120 }}
                  />
                </td>
                <td style={{ padding: "10px" }}>
                  <input
                    type="checkbox"
                    checked={!!c.is_active}
                    onChange={(e) =>
                      handleFeeComponentChange(
                        c.component_key,
                        "is_active",
                        e.target.checked,
                      )
                    }
                  />
                </td>
                <td style={{ padding: "10px" }}>
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => handleFeeComponentSave(c)}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
            {feeComponents.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "10px",
                    color: "#999",
                    textAlign: "center",
                  }}
                >
                  No fee components found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- REGISTRATION WINDOWS --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>
          Registration Windows (by First College Year)
        </h2>
        <form
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
          onSubmit={handleRegistrationWindowSubmit}
        >
          <input
            type="number"
            placeholder="First College Year"
            value={registrationWindowForm.first_college_year}
            onChange={(e) =>
              setRegistrationWindowForm({
                ...registrationWindowForm,
                first_college_year: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <input
            placeholder="Semester (e.g. Spring)"
            value={registrationWindowForm.semester}
            onChange={(e) =>
              setRegistrationWindowForm({
                ...registrationWindowForm,
                semester: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Year"
            value={registrationWindowForm.year}
            onChange={(e) =>
              setRegistrationWindowForm({
                ...registrationWindowForm,
                year: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <input
            type="datetime-local"
            value={registrationWindowForm.opens_at}
            onChange={(e) =>
              setRegistrationWindowForm({
                ...registrationWindowForm,
                opens_at: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <input
            type="datetime-local"
            value={registrationWindowForm.closes_at}
            onChange={(e) =>
              setRegistrationWindowForm({
                ...registrationWindowForm,
                closes_at: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={!!registrationWindowForm.is_active}
              onChange={(e) =>
                setRegistrationWindowForm({
                  ...registrationWindowForm,
                  is_active: e.target.checked,
                })
              }
            />
            Active
          </label>
          <button type="submit" style={buttonStyle}>
            Save Window
          </button>
        </form>

        <table
          style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}
        >
          <thead>
            <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>First Year</th>
              <th style={{ padding: "10px" }}>Semester</th>
              <th style={{ padding: "10px" }}>Year</th>
              <th style={{ padding: "10px" }}>Opens</th>
              <th style={{ padding: "10px" }}>Closes</th>
              <th style={{ padding: "10px" }}>Active</th>
              <th style={{ padding: "10px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrationWindows.map((w) => (
              <tr key={w.window_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{w.first_college_year}</td>
                <td style={{ padding: "10px" }}>{w.semester}</td>
                <td style={{ padding: "10px" }}>{w.year}</td>
                <td style={{ padding: "10px" }}>
                  {w.opens_at ? new Date(w.opens_at).toLocaleString() : "N/A"}
                </td>
                <td style={{ padding: "10px" }}>
                  {w.closes_at ? new Date(w.closes_at).toLocaleString() : "N/A"}
                </td>
                <td style={{ padding: "10px" }}>
                  {w.is_active ? "Yes" : "No"}
                </td>
                <td style={{ padding: "10px" }}>
                  <button
                    type="button"
                    style={{ ...buttonStyle, backgroundColor: "#dc2626" }}
                    onClick={() => handleDeleteRegistrationWindow(w.window_id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {registrationWindows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "10px",
                    color: "#999",
                    textAlign: "center",
                  }}
                >
                  No registration windows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Registration Load Policy</h2>
        <p style={{ marginTop: 0, marginBottom: 12, color: "#6b7280" }}>
          Configure halfload and overload credit-hour limits based on cumulative GPA.
        </p>
        <form
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}
          onSubmit={handleRegistrationLoadPolicySubmit}
        >
          <input
            type="number"
            step="0.01"
            placeholder="Halfload GPA threshold"
            value={registrationLoadPolicyForm.halfload_gpa_threshold}
            onChange={(e) =>
              setRegistrationLoadPolicyForm({
                ...registrationLoadPolicyForm,
                halfload_gpa_threshold: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Halfload max credits"
            value={registrationLoadPolicyForm.halfload_max_credits}
            onChange={(e) =>
              setRegistrationLoadPolicyForm({
                ...registrationLoadPolicyForm,
                halfload_max_credits: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Regular max credits"
            value={registrationLoadPolicyForm.regular_max_credits}
            onChange={(e) =>
              setRegistrationLoadPolicyForm({
                ...registrationLoadPolicyForm,
                regular_max_credits: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Overload GPA threshold"
            value={registrationLoadPolicyForm.overload_gpa_threshold}
            onChange={(e) =>
              setRegistrationLoadPolicyForm({
                ...registrationLoadPolicyForm,
                overload_gpa_threshold: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Overload max credits"
            value={registrationLoadPolicyForm.overload_max_credits}
            onChange={(e) =>
              setRegistrationLoadPolicyForm({
                ...registrationLoadPolicyForm,
                overload_max_credits: e.target.value,
              })
            }
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle}>Save Policy</button>
        </form>

        <div style={{ marginTop: 12, color: "#374151", fontSize: 14 }}>
          {registrationLoadPolicy ? (
            <>
              Current policy:
              {` GPA < ${registrationLoadPolicy.halfload_gpa_threshold} => max ${registrationLoadPolicy.halfload_max_credits} credits | `}
              {`regular max ${registrationLoadPolicy.regular_max_credits} credits | `}
              {`GPA >= ${registrationLoadPolicy.overload_gpa_threshold} => max ${registrationLoadPolicy.overload_max_credits} credits`}
            </>
          ) : (
            "No registration load policy found yet."
          )}
        </div>
      </div>
  
      {/* --- TIMETABLE GA SCHEDULER --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Timetable GA Scheduler</h2>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <h3 style={{ marginBottom: 8 }}>Rooms</h3>
            <form
              style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
              onSubmit={handleRoomSubmit}
            >
              <input
                placeholder="Room Name"
                value={roomForm.name}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, name: e.target.value })
                }
                style={inputStyle}
                required
              />
              <input
                type="number"
                placeholder="Capacity"
                value={roomForm.capacity}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, capacity: e.target.value })
                }
                style={inputStyle}
                required
              />
              <button type="submit" style={buttonStyle}>
                Add Room
              </button>
            </form>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 10,
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Room</th>
                  <th style={{ padding: "10px" }}>Capacity</th>
                  <th style={{ padding: "10px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr
                    key={r.room_id}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td style={{ padding: "10px" }}>{r.name}</td>
                    <td style={{ padding: "10px" }}>{r.capacity}</td>
                    <td style={{ padding: "10px" }}>
                      <button
                        type="button"
                        style={{ ...buttonStyle, backgroundColor: "#dc2626" }}
                        onClick={() => handleDeleteRoom(r.room_id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {rooms.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        padding: "10px",
                        color: "#999",
                        textAlign: "center",
                      }}
                    >
                      No rooms found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ marginBottom: 8 }}>Time Slots</h3>
            <form
              style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
              onSubmit={handleSlotSubmit}
            >
              <input
                placeholder="Day (e.g. Sunday)"
                value={slotForm.day}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, day: e.target.value })
                }
                style={inputStyle}
                required
              />
              <input
                type="time"
                value={slotForm.start_time}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, start_time: e.target.value })
                }
                style={inputStyle}
                required
              />
              <input
                type="time"
                value={slotForm.end_time}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, end_time: e.target.value })
                }
                style={inputStyle}
                required
              />
              <button type="submit" style={buttonStyle}>
                Add Slot
              </button>
            </form>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 10,
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Day</th>
                  <th style={{ padding: "10px" }}>Start</th>
                  <th style={{ padding: "10px" }}>End</th>
                  <th style={{ padding: "10px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((s) => (
                  <tr
                    key={s.slot_id}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td style={{ padding: "10px" }}>{s.day}</td>
                    <td style={{ padding: "10px" }}>{s.start_time}</td>
                    <td style={{ padding: "10px" }}>{s.end_time}</td>
                    <td style={{ padding: "10px" }}>
                      <button
                        type="button"
                        style={{ ...buttonStyle, backgroundColor: "#dc2626" }}
                        onClick={() => handleDeleteSlot(s.slot_id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {timeSlots.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "10px",
                        color: "#999",
                        textAlign: "center",
                      }}
                    >
                      No time slots found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ marginBottom: 8 }}>
              Professor Unavailability (Hard Constraint)
            </h3>
            <form
              style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
              onSubmit={handleUnavailabilitySubmit}
            >
              <select
                value={unavailabilityForm.professor_id}
                onChange={(e) =>
                  setUnavailabilityForm({
                    ...unavailabilityForm,
                    professor_id: e.target.value,
                  })
                }
                style={inputStyle}
                required
              >
                <option value="">Select Professor</option>
                {professors.map((p) => (
                  <option
                    key={p.user_id || p.professor_id}
                    value={p.professor_id}
                  >
                    {p.name || p.email}{" "}
                  </option>
                ))}
              </select>
              <select
                value={unavailabilityForm.slot_id}
                onChange={(e) =>
                  setUnavailabilityForm({
                    ...unavailabilityForm,
                    slot_id: e.target.value,
                  })
                }
                style={inputStyle}
                required
              >
                <option value="">Select Time Slot</option>
                {timeSlots.map((s) => (
                  <option key={s.slot_id} value={s.slot_id}>
                    {s.day} {s.start_time}-{s.end_time}
                  </option>
                ))}
              </select>
              <input
                placeholder="Reason (optional)"
                value={unavailabilityForm.reason}
                onChange={(e) =>
                  setUnavailabilityForm({
                    ...unavailabilityForm,
                    reason: e.target.value,
                  })
                }
                style={inputStyle}
              />
              <button type="submit" style={buttonStyle}>
                Add Block
              </button>
            </form>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 10,
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Professor</th>
                  <th style={{ padding: "10px" }}>Slot</th>
                  <th style={{ padding: "10px" }}>Reason</th>
                  <th style={{ padding: "10px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {professorUnavailability.map((u) => (
                  <tr
                    key={u.unavailability_id}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td style={{ padding: "10px" }}>
                      {professors.find((p) => p.professor_id === u.professor_id)
                        ?.name ||
                        professors.find(
                          (p) => p.professor_id === u.professor_id,
                        )?.email ||
                        u.professor_id}
                    </td>
                    <td style={{ padding: "10px" }}>
                      {u.day} {u.start_time}-{u.end_time}
                    </td>
                    <td style={{ padding: "10px" }}>{u.reason || "-"}</td>
                    <td style={{ padding: "10px" }}>
                      <button
                        type="button"
                        style={{ ...buttonStyle, backgroundColor: "#dc2626" }}
                        onClick={() =>
                          handleDeleteUnavailability(u.unavailability_id)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {professorUnavailability.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "10px",
                        color: "#999",
                        textAlign: "center",
                      }}
                    >
                      No unavailability set.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ marginBottom: 8 }}>Run Scheduler</h3>
            <form
              style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
              onSubmit={handleRunScheduler}
            >
              <input
                placeholder="Semester (optional)"
                value={scheduleParams.semester}
                onChange={(e) =>
                  setScheduleParams({
                    ...scheduleParams,
                    semester: e.target.value,
                  })
                }
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Year (optional)"
                value={scheduleParams.year}
                onChange={(e) =>
                  setScheduleParams({ ...scheduleParams, year: e.target.value })
                }
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Population"
                value={scheduleParams.populationSize}
                onChange={(e) =>
                  setScheduleParams({
                    ...scheduleParams,
                    populationSize: e.target.value,
                  })
                }
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Generations"
                value={scheduleParams.generations}
                onChange={(e) =>
                  setScheduleParams({
                    ...scheduleParams,
                    generations: e.target.value,
                  })
                }
                style={inputStyle}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Mutation Rate"
                value={scheduleParams.mutationRate}
                onChange={(e) =>
                  setScheduleParams({
                    ...scheduleParams,
                    mutationRate: e.target.value,
                  })
                }
                style={inputStyle}
              />
              <button type="submit" style={buttonStyle}>
                Run GA
              </button>
              <button
                type="button"
                style={{ ...buttonStyle, backgroundColor: "#2f5d50" }}
                onClick={handleApplySchedule}
              >
                Apply To Classes
              </button>
              <button
                type="button"
                style={{ ...buttonStyle, backgroundColor: "#25483f" }}
                onClick={handlePostAnnouncement}
              >
                Post Announcement
              </button>
              <button
                type="button"
                style={{ ...buttonStyle, backgroundColor: "#3a7461" }}
                onClick={() => exportScheduleCsv(scheduleResult?.assignments)}
                disabled={!scheduleResult?.assignments?.length}
              >
                Export CSV
              </button>
            </form>

            {scheduleResult?.assignments?.length ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: 10,
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
                    <th style={{ padding: "10px" }}>Class</th>
                    <th style={{ padding: "10px" }}>Course</th>
                    <th style={{ padding: "10px" }}>Professor</th>
                    <th style={{ padding: "10px" }}>Day</th>
                    <th style={{ padding: "10px" }}>Start</th>
                    <th style={{ padding: "10px" }}>End</th>
                    <th style={{ padding: "10px" }}>Room</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleResult.assignments.map((a, idx) => (
                    <tr
                      key={`${a.class_id}-${idx}`}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td style={{ padding: "10px" }}>{a.class_id}</td>
                      <td style={{ padding: "10px" }}>{a.course_code}</td>
                      <td style={{ padding: "10px" }}>
                        {a.professor_name || a.professor_id || "-"}
                      </td>
                      <td style={{ padding: "10px" }}>{a.day}</td>
                      <td style={{ padding: "10px" }}>{a.start}</td>
                      <td style={{ padding: "10px" }}>{a.end}</td>
                      <td style={{ padding: "10px" }}>{a.room_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ marginTop: 10, color: "#6b7280" }}>
                No schedule generated yet.
              </div>
            )}

            {scheduleResult?.conflicts?.length ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>
                  Conflict Report
                </div>
                <div style={{ marginBottom: 6, fontSize: 13 }}>
                  {Object.entries(
                    conflictSummary(scheduleResult.conflicts),
                  ).map(([k, v]) => (
                    <span key={k} style={{ marginRight: 10 }}>
                      {k}: {v}
                    </span>
                  ))}
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {scheduleResult.conflicts.slice(0, 20).map((c, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      {c.type === "PROFESSOR_CONFLICT"
                        ? `${c.professor_name || c.professor_id} conflict at ${c.day} ${c.start}-${c.end}`
                        : c.type === "ROOM_CONFLICT"
                          ? `Room conflict in ${c.room_name || c.room_id} at ${c.day} ${c.start}-${c.end}`
                          : c.type === "CAPACITY_EXCEEDED"
                            ? `Capacity exceeded for class ${c.class_id}: needs ${c.needed}, room ${c.room_name || c.room_id} has ${c.capacity}`
                            : c.type}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(() => {
              const gridData = buildScheduleGrid();
              if (!gridData) return null;

              return (
                <div
                  style={{
                    marginTop: 12,
                    border: "1px solid #d1d5db",
                    overflowX: "auto",
                    overflowY: "hidden",
                    maxWidth: "100%",
                    width: "100%",
                  }}
                >
                  <table
                    style={{
                      borderCollapse: "collapse",
                      width: "max-content",
                      minWidth: "max-content",
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            border: "1px solid #9ca3af",
                            padding: "8px",
                            background: "#eef4f1",
                            minWidth: "120px",
                            position: "sticky",
                            left: 0,
                            zIndex: 2,
                          }}
                        >
                          Day / Time
                        </th>

                        {gridData.slotLabels.map((slot) => (
                          <th
                            key={slot.key}
                            style={{
                              border: "1px solid #9ca3af",
                              padding: "6px",
                              background: "#eef4f1",
                              fontSize: 11,
                              minWidth: "140px",
                              textAlign: "center",
                            }}
                          >
                            {slot.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {gridData.days.map((day) => (
                        <tr key={day}>
                          <td
                            style={{
                              border: "1px solid #9ca3af",
                              padding: "8px",
                              fontWeight: 700,
                              background: "#f9fafb",
                              minWidth: "120px",
                              position: "sticky",
                              left: 0,
                              zIndex: 1,
                            }}
                          >
                            {day}
                          </td>

                          {gridData.slotLabels.map((slot) => {
                            const entries =
                              gridData.grid.get(
                                `${day}_${slot.start}_${slot.end}`,
                              ) || [];

                            return (
                              <td
                                key={`${day}-${slot.key}`}
                                style={{
                                  border: "1px solid #9ca3af",
                                  padding: "6px",
                                  minWidth: "140px",
                                  verticalAlign: "top",
                                  fontSize: 11,
                                }}
                              >
                                {entries.length === 0
                                  ? null
                                  : entries.map((a) => (
                                      <div
                                        key={`${a.class_id}-${a.start}-${a.room_name}`}
                                        style={{
                                          marginBottom: 6,
                                          paddingBottom: 4,
                                          borderBottom: "1px solid #e5e7eb",
                                        }}
                                      >
                                        <div style={{ fontWeight: 700 }}>
                                          {a.course_code}
                                        </div>
                                        <div style={{ fontSize: 10 }}>
                                          {a.professor_name || "-"}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 10,
                                            color: "#374151",
                                          }}
                                        >
                                          {a.room_name}
                                        </div>
                                      </div>
                                    ))}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          <div>
            <h3 style={{ marginBottom: 8 }}>Schedule History</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#eef4f1", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Run ID</th>
                  <th style={{ padding: "10px" }}>Created</th>
                  <th style={{ padding: "10px" }}>Semester</th>
                  <th style={{ padding: "10px" }}>Year</th>
                  <th style={{ padding: "10px" }}>Score</th>
                  <th style={{ padding: "10px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduleRuns.map((r) => (
                  <tr key={r.run_id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px" }}>{r.run_id}</td>
                    <td style={{ padding: "10px" }}>
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString()
                        : ""}
                    </td>
                    <td style={{ padding: "10px" }}>{r.semester || "-"}</td>
                    <td style={{ padding: "10px" }}>{r.year || "-"}</td>
                    <td style={{ padding: "10px" }}>{r.best_score}</td>
                    <td style={{ padding: "10px" }}>
                      <button
                        type="button"
                        style={buttonStyle}
                        onClick={() => handleApplyRun(r.run_id)}
                      >
                        Apply
                      </button>
                    </td>
                  </tr>
                ))}
                {scheduleRuns.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "10px",
                        color: "#999",
                        textAlign: "center",
                      }}
                    >
                      No schedule runs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
