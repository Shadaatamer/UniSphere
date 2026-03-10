// AdminCourseManagement.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminCourseManagement() {
  // Courses
  const [courses, setCourses] = useState([]);
  const [courseForm, setCourseForm] = useState({ name: "", code: "", department_id: "", credit_hours: "" });

  // Classes
  const [classes, setClasses] = useState([]);
  const [classForm, setClassForm] = useState({ course_id: "", semester: "", year: "", professor_id: "" });

  // Professor Assignments
  const [professors, setProfessors] = useState([]);
  const [assignForm, setAssignForm] = useState({ class_id: "", professor_id: "" });

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

  // Fetch initial data
  const fetchCourses = () => {
    api.get("/admin/courses", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((res) => setCourses(res.data))
      .catch((err) => console.error(err));
  };

  const fetchClasses = () => {
    api.get("/admin/classes", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((res) => setClasses(res.data))
      .catch((err) => console.error(err));
  };

  const fetchProfessors = () => {
    api.get("/admin/users", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((res) => setProfessors(res.data.filter(u => u.role === "professor")))
      .catch((err) => console.error(err));
  };

    const fetchExams = () => {
    api.get("/admin/exams", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
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

  useEffect(() => {
    fetchCourses();
    fetchClasses();
    fetchProfessors();
    fetchExams();
    fetchTuitionRules();
    fetchFeeComponents();
    fetchRegistrationWindows();
  }, []);

  // --- Handlers ---
  const handleCourseSubmit = (e) => {
    e.preventDefault();
    api.post("/admin/courses", courseForm, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(() => { 
        alert("Course created"); 
        setCourseForm({ name: "", code: "", department_id: "", credit_hours: "" }); 
        fetchCourses(); 
      })
      .catch(err => alert(err.response?.data?.message || err.message));
  };

  const handleClassSubmit = (e) => {
    e.preventDefault();
    api.post("/admin/classes", classForm, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(() => { 
        alert("Class created"); 
        setClassForm({ course_id: "", semester: "", year: "", professor_id: "" }); 
        fetchClasses(); 
      })
      .catch(err => alert(err.response?.data?.message || err.message));
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    api.put(`/admin/classes/${assignForm.class_id}/professor`, { professor_id: assignForm.professor_id }, 
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(() => { 
        alert("Professor assigned"); 
        setAssignForm({ class_id: "", professor_id: "" }); 
        fetchClasses(); 
      })
      .catch(err => alert(err.response?.data?.message || err.message));
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

  api.post(`/admin/classes/${examForm.class_id}/exams`, payload, {
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
    .catch(err => alert(err.response?.data?.message || err.message));
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
    border: "1px solid #ccc",
  };

  const buttonStyle = {
    padding: "10px 16px",
    backgroundColor: "#ff7300",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: 10 }}>Course Management</h1>
      <p style={{ marginBottom: 30, color: "#666" }}>Admin View: manage courses, classes, professors, and exams</p>

      {/* --- CREATE COURSE --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Create New Course</h2>
        <form style={{ display: "flex", gap: 12, flexWrap: "wrap" }} onSubmit={handleCourseSubmit}>
          <input placeholder="Course Name" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} style={inputStyle} required/>
          <input placeholder="Course Code" value={courseForm.code} onChange={e => setCourseForm({...courseForm, code: e.target.value})} style={inputStyle} required/>
          <input type="number" placeholder="Dept ID" value={courseForm.department_id} onChange={e => setCourseForm({...courseForm, department_id: e.target.value})} style={inputStyle} required/>
          <input type="number" placeholder="Credit Hours" value={courseForm.credit_hours} onChange={e => setCourseForm({...courseForm, credit_hours: e.target.value})} style={inputStyle} required/>
          <button type="submit" style={buttonStyle}>Create</button>
        </form>
      </div>

      {/* --- CREATE CLASS --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Create Class</h2>
        <form style={{ display: "flex", gap: 12, flexWrap: "wrap" }} onSubmit={handleClassSubmit}>
          <select value={classForm.course_id} onChange={e => setClassForm({...classForm, course_id:e.target.value})} style={inputStyle} required>
            <option value="">Select Course</option>
            {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.name} ({c.code})</option>)}
          </select>
          <select value={classForm.professor_id} onChange={e => setClassForm({...classForm, professor_id:e.target.value})} style={inputStyle} required>
            <option value="">Select Professor</option>
            {professors.map(p => <option key={p.user_id} value={p.user_id}>{p.email}</option>)}
          </select>
          <input placeholder="Semester" value={classForm.semester} onChange={e => setClassForm({...classForm, semester:e.target.value})} style={inputStyle} required/>
          <input type="number" placeholder="Year" value={classForm.year} onChange={e => setClassForm({...classForm, year:e.target.value})} style={inputStyle} required/>
          <button type="submit" style={buttonStyle}>Create</button>
        </form>

        {/* Classes Table */}
        <table style={{ width:"100%", borderCollapse:"collapse", marginTop:20 }}>
          <thead>
            <tr style={{ backgroundColor:"#f0f0f0", textAlign:"left" }}>
              <th style={{ padding:"10px" }}>ID</th>
              <th style={{ padding:"10px" }}>Course</th>
              <th style={{ padding:"10px" }}>Semester</th>
              <th style={{ padding:"10px" }}>Year</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(cl => (
              <tr key={cl.class_id} style={{ borderBottom:"1px solid #eee" }}>
                <td style={{ padding:"10px" }}>{cl.class_id}</td>
                <td style={{ padding:"10px" }}>{courses.find(c => c.course_id === cl.course_id)?.name}</td>
                <td style={{ padding:"10px" }}>{cl.semester}</td>
                <td style={{ padding:"10px" }}>{cl.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- ASSIGN PROFESSOR --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Assign Professor to Class</h2>
        <form style={{ display: "flex", gap: 12, flexWrap: "wrap" }} onSubmit={handleAssignSubmit}>
          <select value={assignForm.class_id} onChange={e => setAssignForm({...assignForm, class_id:e.target.value})} style={inputStyle} required>
            <option value="">Select Class</option>
            {classes.map(cl => (
              <option key={cl.class_id} value={cl.class_id}>
                {courses.find(c => c.course_id === cl.course_id)?.name} - {cl.semester} {cl.year}
              </option>
            ))}
          </select>
          <select value={assignForm.professor_id} onChange={e => setAssignForm({...assignForm, professor_id:e.target.value})} style={inputStyle} required>
            <option value="">Select Professor</option>
            {professors.map(p => <option key={p.user_id} value={p.user_id}>{p.email}</option>)}
          </select>
          <button type="submit" style={buttonStyle}>Assign</button>
        </form>
      </div>

{/* --- SCHEDULE EXAM --- */}
<div style={sectionStyle}>
  <h2 style={{ marginBottom: 15 }}>Schedule Exam</h2>
  <form style={{ display: "flex", gap: 12, flexWrap: "wrap" }} onSubmit={handleExamSubmit}>
    
    <select value={examForm.class_id} onChange={e => setExamForm({...examForm,class_id:e.target.value})} style={inputStyle} required>
      <option value="">Select Class</option>
      {classes.map(cl => (
        <option key={cl.class_id} value={cl.class_id}>
          {courses.find(c => c.course_id === cl.course_id)?.name} - {cl.semester} {cl.year}
        </option>
      ))}
    </select>

    {/* New exam type dropdown */}
    <select value={examForm.exam_type || ""} onChange={e => setExamForm({...examForm, exam_type:e.target.value})} style={inputStyle} required>
      <option value="">Select Exam Type</option>
      <option value="midterm">Midterm</option>
      <option value="final">Final</option>
    </select>

    <input type="date" value={examForm.exam_date} onChange={e => setExamForm({...examForm, exam_date:e.target.value})} style={inputStyle} required/>
    <input type="time" value={examForm.start_time} onChange={e => setExamForm({...examForm, start_time:e.target.value})} style={inputStyle} required/>
    <input type="time" value={examForm.end_time} onChange={e => setExamForm({...examForm, end_time:e.target.value})} style={inputStyle} required/>
    <input placeholder="Location" value={examForm.location} onChange={e => setExamForm({...examForm, location:e.target.value})} style={inputStyle} required/>
    <button type="submit" style={buttonStyle}>Schedule</button>
  </form>

    {/* Exams Table */}
    <table style={{ width:"100%", borderCollapse:"collapse", marginTop:20 }}>
        <thead>
        <tr style={{ backgroundColor:"#f0f0f0", textAlign:"left" }}>
            <th style={{ padding:"10px" }}>ID</th>
            <th style={{ padding:"10px" }}>Class</th>
            <th style={{ padding:"10px" }}>Type</th>
            <th style={{ padding:"10px" }}>Date</th>
            <th style={{ padding:"10px" }}>Start</th>
            <th style={{ padding:"10px" }}>End</th>
            <th style={{ padding:"10px" }}>Location</th>
        </tr>
        </thead>
    <tbody>
  {exams.map(ex => (
    <tr key={ex.exam_id} style={{ borderBottom:"1px solid #eee" }}>
      <td style={{ padding:"10px" }}>{ex.exam_id}</td>
      <td style={{ padding:"10px" }}>{ex.course_name} - {ex.semester} {ex.year}</td>
      <td style={{ padding:"10px" }}>{ex.exam_type}</td>
      <td style={{ padding:"10px" }}>{ex.exam_date}</td>
      <td style={{ padding:"10px" }}>{ex.start_time}</td>
      <td style={{ padding:"10px" }}>{ex.end_time}</td>
      <td style={{ padding:"10px" }}>{ex.location}</td>
    </tr>
  ))}
</tbody>
    </table>
    </div>
      {/* --- FEES: TUITION RULES --- */}
      <div style={sectionStyle}>
        <h2 style={{ marginBottom: 15 }}>Tuition Rules (Credit Hour Price)</h2>
        <form style={{ display: "flex", gap: 12, flexWrap: "wrap" }} onSubmit={handleTuitionRuleSubmit}>
          <input
            type="number"
            placeholder="First College Year (e.g. 2023)"
            value={tuitionRuleForm.first_college_year}
            onChange={(e) => setTuitionRuleForm({ ...tuitionRuleForm, first_college_year: e.target.value })}
            style={inputStyle}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Credit Hour Price"
            value={tuitionRuleForm.credit_hour_price}
            onChange={(e) => setTuitionRuleForm({ ...tuitionRuleForm, credit_hour_price: e.target.value })}
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle}>Save Rule</button>
        </form>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>Year</th>
              <th style={{ padding: "10px" }}>Credit Hour Price</th>
              <th style={{ padding: "10px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tuitionRules.map((r) => (
              <tr key={r.rule_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{r.first_college_year}</td>
                <td style={{ padding: "10px" }}>{Number(r.credit_hour_price || 0).toFixed(2)}</td>
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
                <td colSpan={3} style={{ padding: "10px", color: "#999", textAlign: "center" }}>
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
            <tr style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>Key</th>
              <th style={{ padding: "10px" }}>Label</th>
              <th style={{ padding: "10px" }}>Amount</th>
              <th style={{ padding: "10px" }}>Active</th>
              <th style={{ padding: "10px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {feeComponents.map((c) => (
              <tr key={c.component_key} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px", fontWeight: 700 }}>{c.component_key}</td>
                <td style={{ padding: "10px" }}>
                  <input
                    value={c.label}
                    onChange={(e) => handleFeeComponentChange(c.component_key, "label", e.target.value)}
                    style={{ ...inputStyle, minWidth: 180 }}
                  />
                </td>
                <td style={{ padding: "10px" }}>
                  <input
                    type="number"
                    step="0.01"
                    value={c.amount}
                    onChange={(e) => handleFeeComponentChange(c.component_key, "amount", e.target.value)}
                    style={{ ...inputStyle, minWidth: 120 }}
                  />
                </td>
                <td style={{ padding: "10px" }}>
                  <input
                    type="checkbox"
                    checked={!!c.is_active}
                    onChange={(e) => handleFeeComponentChange(c.component_key, "is_active", e.target.checked)}
                  />
                </td>
                <td style={{ padding: "10px" }}>
                  <button type="button" style={buttonStyle} onClick={() => handleFeeComponentSave(c)}>
                    Save
                  </button>
                </td>
              </tr>
            ))}
            {feeComponents.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "10px", color: "#999", textAlign: "center" }}>
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
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}
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
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
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

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>
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
                <td style={{ padding: "10px" }}>{w.is_active ? "Yes" : "No"}</td>
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
                <td colSpan={7} style={{ padding: "10px", color: "#999", textAlign: "center" }}>
                  No registration windows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
