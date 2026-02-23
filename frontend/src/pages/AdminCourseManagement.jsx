// AdminCourseManagement.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminCourseManagement() {
  // Courses
  const [courses, setCourses] = useState([]);
  const [courseForm, setCourseForm] = useState({ name: "", code: "", department_id: "", credit_hours: "" });

  // Classes
  const [classes, setClasses] = useState([]);
  const [classForm, setClassForm] = useState({ course_id: "", semester: "", year: "" });

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

  useEffect(() => {
    fetchCourses();
    fetchClasses();
    fetchProfessors();
    fetchExams();
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
        setClassForm({ course_id: "", semester: "", year: "" }); 
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
    </div>
  );
}