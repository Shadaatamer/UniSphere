import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function ProfessorClassesPage() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("classes"); // "classes" or "students"

    const token = localStorage.getItem("token");

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            const response = await api.get("/professor/classes", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setClasses(response.data);
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load classes");
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async (classId) => {
        try {
            const response = await api.get(`/professor/classes/${classId}/students`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStudents(response.data);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load students");
        }
    };

    const handleSelectClass = (classItem) => {
        setSelectedClass(classItem);
        setTab("students");
        fetchStudents(classItem.class_id);
    };

    if (error) {
        return (
            <div style={{ padding: 20, color: "crimson", fontWeight: 500 }}>
                {error}
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ padding: 20, fontSize: 14, color: "#6b7280" }}>
                Loading...
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 18 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
                    My Classes
                </h1>
                <p style={{ color: "#6b7280", fontSize: 14 }}>
                    Manage your courses and view enrolled students
                </p>
            </div>

            {/* Tabs */}
            <div style={{ marginBottom: 20, display: "flex", gap: 12 }}>
                <button
                    style={{
                        padding: "10px 16px",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: tab === "classes" ? 900 : 600,
                        background: tab === "classes" ? "#2f5d50" : "#e5e7eb",
                        color: tab === "classes" ? "#fff" : "#111827",
                    }}
                    onClick={() => setTab("classes")}
                >
                    All Classes
                </button>
                {selectedClass && (
                    <button
                        style={{
                            padding: "10px 16px",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontWeight: tab === "students" ? 900 : 600,
                            background: tab === "students" ? "#2f5d50" : "#e5e7eb",
                            color: tab === "students" ? "#fff" : "#111827",
                        }}
                        onClick={() => setTab("students")}
                    >
                        Students in {selectedClass.code}
                    </button>
                )}
            </div>

            {/* Classes List Tab */}
            {tab === "classes" && (
                <div>
                    {classes.length === 0 ? (
                        <div
                            style={{
                                padding: 40,
                                textAlign: "center",
                                background: "#f9fafb",
                                borderRadius: 12,
                                color: "#6b7280",
                            }}
                        >
                            No classes assigned yet.
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                                gap: 16,
                            }}
                        >
                            {classes.map((classItem) => (
                                <div
                                    key={classItem.class_id}
                                    style={{
                                        background: "#fff",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 12,
                                        padding: 18,
                                        cursor: "pointer",
                                        transition: "all 0.3s ease",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                    }}
                                    onClick={() => handleSelectClass(classItem)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow =
                                            "0 4px 12px rgba(0,0,0,0.15)";
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow =
                                            "0 1px 3px rgba(0,0,0,0.1)";
                                        e.currentTarget.style.transform = "translateY(0)";
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 900,
                                            marginBottom: 8,
                                            color: "#2f5d50",
                                        }}
                                    >
                                        {classItem.code}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                            marginBottom: 12,
                                            color: "#111827",
                                        }}
                                    >
                                        {classItem.name}
                                    </div>
                                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                                        <div>
                                            <strong>Semester:</strong> {classItem.semester}
                                        </div>
                                        <div>
                                            <strong>Section:</strong> {classItem.section || "N/A"}
                                        </div>
                                        {classItem.day && (
                                            <div>
                                                <strong>Schedule:</strong> {classItem.day} {classItem.time_start}
                                                {classItem.time_end && ` - ${classItem.time_end}`}
                                            </div>
                                        )}
                                        {classItem.location && (
                                            <div>
                                                <strong>Location:</strong> {classItem.location}
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 12,
                                            paddingTop: 12,
                                            borderTop: "1px solid #e5e7eb",
                                        }}
                                    >
                                        <div style={{ flex: 1, textAlign: "center" }}>
                                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                                                Students
                                            </div>
                                            <div style={{ fontSize: 18, fontWeight: 900 }}>
                                                {classItem.enrolled}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, textAlign: "center" }}>
                                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                                                Capacity
                                            </div>
                                            <div style={{ fontSize: 18, fontWeight: 900 }}>
                                                {classItem.max_capacity}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Students Tab */}
            {tab === "students" && selectedClass && (
                <div>
                    <div
                        style={{
                            background: "#f0fdfa",
                            border: "1px solid #a7f3d0",
                            padding: 16,
                            borderRadius: 8,
                            marginBottom: 20,
                        }}
                    >
                        <div style={{ fontSize: 14, color: "#2f5d50", fontWeight: 600 }}>
                            {selectedClass.code} - {selectedClass.name}
                        </div>
                    </div>

                    {students.length === 0 ? (
                        <div
                            style={{
                                padding: 40,
                                textAlign: "center",
                                background: "#f9fafb",
                                borderRadius: 12,
                                color: "#6b7280",
                            }}
                        >
                            No students enrolled in this class.
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    background: "#fff",
                                    borderRadius: 8,
                                    overflow: "hidden",
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            background: "#f3f4f6",
                                            borderBottom: "2px solid #e5e7eb",
                                        }}
                                    >
                                        <th style={tableHeaderStyle}>Student Email</th>
                                        <th style={tableHeaderStyle}>Grades</th>
                                        <th style={tableHeaderStyle}>Attendance</th>
                                        <th style={tableHeaderStyle}>Avg Grade</th>
                                        <th style={tableHeaderStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, idx) => (
                                        <tr
                                            key={student.enrollment_id}
                                            style={{
                                                borderBottom: "1px solid #e5e7eb",
                                                background: idx % 2 === 0 ? "#fff" : "#f9fafb",
                                            }}
                                        >
                                            <td style={tableCellStyle}>{student.email}</td>
                                            <td style={tableCellStyle}>
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        background: "#eef4f1",
                                                        color: "#2f5d50",
                                                        padding: "4px 8px",
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {student.grades_count}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        background: "#dcfce7",
                                                        color: "#15803d",
                                                        padding: "4px 8px",
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {student.attendance_count}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                {student.avg_grade ? (
                                                    <strong>{student.avg_grade}%</strong>
                                                ) : (
                                                    <span style={{ color: "#9ca3af" }}>—</span>
                                                )}
                                            </td>
                                            <td style={tableCellStyle}>
                                                <button
                                                    style={{
                                                        padding: "6px 12px",
                                                        border: "1px solid #2f5d50",
                                                        background: "transparent",
                                                        color: "#2f5d50",
                                                        borderRadius: 6,
                                                        cursor: "pointer",
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                    }}
                                                    onClick={() => {
                                                        // Navigate to detailed view
                                                        console.log("View details for", student);
                                                    }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const tableHeaderStyle = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 900,
    color: "#111827",
};

const tableCellStyle = {
    padding: "12px 16px",
    fontSize: 13,
    color: "#111827",
};
