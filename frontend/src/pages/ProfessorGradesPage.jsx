import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function ProfessorGradesPage() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({ manualGrades: [], assignmentGrades: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [formData, setFormData] = useState({
        enrollmentId: "",
        assessmentType: "",
        score: "",
        maxScore: 100,
    });

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

    const fetchGrades = async (classId) => {
        try {
            const response = await api.get(`/professor/classes/${classId}/grades`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setGrades({
                manualGrades: response.data?.manualGrades || [],
                assignmentGrades: response.data?.assignmentGrades || [],
            });
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load grades");
        }
    };

    const fetchStudents = async (classId) => {
        try {
            const response = await api.get(`/professor/classes/${classId}/students`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStudents(response.data);
            setError("");
        } catch (err) {
            setStudents([]);
            setError(err.response?.data?.message || "Failed to load students");
        }
    };

    const handleSelectClass = (classItem) => {
        setSelectedClass(classItem);
        setFormData({ enrollmentId: "", assessmentType: "", score: "", maxScore: 100 });
        setStudents([]);
        fetchGrades(classItem.class_id);
        fetchStudents(classItem.class_id);
    };

    const handleSubmitGrade = async (e) => {
        e.preventDefault();

        if (
            !formData.enrollmentId ||
            !formData.assessmentType ||
            formData.score === ""
        ) {
            setError("Please fill in all required fields");
            return;
        }

        try {
            await api.post(
                "/professor/grades",
                {
                    enrollmentId: parseInt(formData.enrollmentId),
                    assessmentType: formData.assessmentType,
                    score: parseFloat(formData.score),
                    maxScore: parseFloat(formData.maxScore),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setSuccess("Grade saved successfully!");
            setFormData({ enrollmentId: "", assessmentType: "", score: "", maxScore: 100 });

            // Refresh grades
            if (selectedClass) {
                fetchGrades(selectedClass.class_id);
            }

            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save grade");
        }
    };

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
                    Enter Grades
                </h1>
                <p style={{ color: "#6b7280", fontSize: 14 }}>
                    Manage and enter student grades
                </p>
            </div>

            {/* Messages */}
            {error && (
                <div
                    style={{
                        padding: 12,
                        background: "#fee2e2",
                        color: "#991b1b",
                        borderRadius: 8,
                        marginBottom: 16,
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    style={{
                        padding: 12,
                        background: "#dcfce7",
                        color: "#166534",
                        borderRadius: 8,
                        marginBottom: 16,
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    {success}
                </div>
            )}

            {/* Class Selector */}
            {classes.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 8,
                            color: "#111827",
                        }}
                    >
                        Select Class
                    </label>
                    <select
                        value={selectedClass?.class_id || ""}
                        onChange={(e) => {
                            const classId = parseInt(e.target.value);
                            const classItem = classes.find((c) => c.class_id === classId);
                            if (classItem) handleSelectClass(classItem);
                        }}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            fontSize: 13,
                            fontFamily: "inherit",
                        }}
                    >
                        <option value="">-- Select a class --</option>
                        {classes.map((c) => (
                            <option key={c.class_id} value={c.class_id}>
                                {c.code} - {c.name} ({c.semester})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedClass && (
                <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {/* Grade Entry Form */}
                    <div
                        style={{
                            background: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 18,
                        }}
                    >
                        <h2
                            style={{
                                fontSize: 16,
                                fontWeight: 900,
                                marginBottom: 16,
                                color: "#111827",
                            }}
                        >
                            Add/Update Grade
                        </h2>

                        <form onSubmit={handleSubmitGrade}>
                            <div style={{ marginBottom: 14 }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        marginBottom: 6,
                                        color: "#374151",
                                    }}
                                >
                                    Student
                                </label>
                                <select
                                    value={formData.enrollmentId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, enrollmentId: e.target.value })
                                    }
                                    style={inputStyle}
                                    required
                                >
                                    <option value="">-- Select student --</option>
                                    {students.map((s) => (
                                        <option key={s.enrollment_id} value={s.enrollment_id}>
                                            {s.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        marginBottom: 6,
                                        color: "#374151",
                                    }}
                                >
                                    Assessment Type
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Midterm, Quiz1, Project"
                                    value={formData.assessmentType}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            assessmentType: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            marginBottom: 6,
                                            color: "#374151",
                                        }}
                                    >
                                        Score
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.score}
                                        onChange={(e) =>
                                            setFormData({ ...formData, score: e.target.value })
                                        }
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            marginBottom: 6,
                                            color: "#374151",
                                        }}
                                    >
                                        Max Score
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.maxScore}
                                        onChange={(e) =>
                                            setFormData({ ...formData, maxScore: e.target.value })
                                        }
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    background: "#0f766e",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    fontWeight: 900,
                                    cursor: "pointer",
                                    fontSize: 13,
                                }}
                            >
                                Save Grade
                            </button>
                        </form>
                    </div>

                    {/* Grades List */}
                    <div
                        style={{
                            background: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 18,
                        }}
                    >
                        <h2
                            style={{
                                fontSize: 16,
                                fontWeight: 900,
                                marginBottom: 16,
                                color: "#111827",
                            }}
                        >
                            Recent Grades
                        </h2>

                        {grades.manualGrades.length === 0 ? (
                            <div style={{ color: "#6b7280", fontSize: 13 }}>
                                No grades entered yet.
                            </div>
                        ) : (
                            <div style={{ maxHeight: 400, overflowY: "auto" }}>
                                {grades.manualGrades.map((grade) => (
                                    <div
                                        key={grade.grade_id}
                                        style={{
                                            padding: 12,
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 8,
                                            marginBottom: 10,
                                            fontSize: 13,
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                            {grade.email}
                                        </div>
                                        <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>
                                            {grade.assessment_type}
                                        </div>
                                        <div style={{ fontWeight: 900, color: "#0f766e" }}>
                                            {grade.score}/{grade.max_score}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div
                    style={{
                        marginTop: 20,
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 18,
                    }}
                >
                    <h2
                        style={{
                            fontSize: 16,
                            fontWeight: 900,
                            marginBottom: 16,
                            color: "#111827",
                        }}
                    >
                        Assignment Grades
                    </h2>

                    {grades.assignmentGrades.length === 0 ? (
                        <div style={{ color: "#6b7280", fontSize: 13 }}>
                            No assignment grades yet.
                        </div>
                    ) : (
                        <div style={{ maxHeight: 400, overflowY: "auto", display: "grid", gap: 10 }}>
                            {grades.assignmentGrades.map((grade) => (
                                <div
                                    key={grade.submission_id}
                                    style={{
                                        padding: 12,
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        fontSize: 13,
                                    }}
                                >
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                        {grade.email}
                                    </div>
                                    <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>
                                        {grade.assignment_title}
                                    </div>
                                    <div style={{ fontWeight: 900, color: "#0f766e" }}>
                                        {Number(grade.grade || 0)}/{Number(grade.max_points || 0)}
                                    </div>
                                    {grade.feedback ? (
                                        <div style={{ marginTop: 6, color: "#374151", fontSize: 12 }}>
                                            Feedback: {grade.feedback}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                </>
            )}

            {!selectedClass && classes.length > 0 && (
                <div
                    style={{
                        padding: 40,
                        textAlign: "center",
                        background: "#f9fafb",
                        borderRadius: 12,
                        color: "#6b7280",
                    }}
                >
                    Select a class to manage grades
                </div>
            )}

            {classes.length === 0 && (
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
            )}
        </div>
    );
}

const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "inherit",
    boxSizing: "border-box",
};
