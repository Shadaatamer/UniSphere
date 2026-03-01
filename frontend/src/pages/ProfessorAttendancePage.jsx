import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function ProfessorAttendancePage() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [marks, setMarks] = useState({});

    const fmtDate = (value) => {
        if (!value) return "N/A";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleDateString();
    };

    const token = localStorage.getItem("token");
    const statusOptions = ["Present", "Absent", "Late", "Excused"];

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

            // Initialize marks
            const initialMarks = {};
            response.data.forEach((s) => {
                initialMarks[s.enrollment_id] = "Present";
            });
            setMarks(initialMarks);
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load students");
        }
    };

    const fetchAttendance = async (classId) => {
        try {
            const response = await api.get(`/professor/classes/${classId}/attendance`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAttendance(response.data);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load attendance");
        }
    };

    const handleSelectClass = (classItem) => {
        setSelectedClass(classItem);
        fetchStudents(classItem.class_id);
        fetchAttendance(classItem.class_id);
    };

    const handleSaveAttendance = async () => {
        try {
            const promises = Object.entries(marks).map(([enrollmentId, status]) => {
                return api.post(
                    "/professor/attendance",
                    {
                        enrollmentId: parseInt(enrollmentId),
                        classDate: selectedDate,
                        status,
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
            });

            await Promise.all(promises);
            setSuccess("Attendance saved successfully!");
            fetchAttendance(selectedClass.class_id);

            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save attendance");
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
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: 18 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
                    Mark Attendance
                </h1>
                <p style={{ color: "#6b7280", fontSize: 14 }}>
                    Record and manage student attendance
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

            {/* Controls */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 20,
                }}
            >
                <div>
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
                        style={inputStyle}
                    >
                        <option value="">-- Select a class --</option>
                        {classes.map((c) => (
                            <option key={c.class_id} value={c.class_id}>
                                {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label
                        style={{
                            display: "block",
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 8,
                            color: "#111827",
                        }}
                    >
                        Date
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={inputStyle}
                    />
                </div>
            </div>

            {/* Attendance List */}
            {selectedClass && students.length > 0 && (
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
                        <div style={{ fontSize: 14, color: "#0f766e", fontWeight: 600 }}>
                            {selectedClass.code} - {selectedClass.name} • {selectedDate}
                        </div>
                    </div>

                    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                                    <th style={tableHeaderStyle}>Student Email</th>
                                    <th style={tableHeaderStyle}>Status</th>
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
                                            <select
                                                value={marks[student.enrollment_id] || "Present"}
                                                onChange={(e) =>
                                                    setMarks({
                                                        ...marks,
                                                        [student.enrollment_id]: e.target.value,
                                                    })
                                                }
                                                style={{
                                                    padding: "8px 12px",
                                                    border: "1px solid #d1d5db",
                                                    borderRadius: 6,
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {statusOptions.map((status) => (
                                                    <option key={status} value={status}>
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={handleSaveAttendance}
                        style={{
                            marginTop: 20,
                            padding: "12px 24px",
                            background: "#0f766e",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            fontWeight: 900,
                            cursor: "pointer",
                            fontSize: 14,
                            width: "100%",
                        }}
                    >
                        Save Attendance
                    </button>
                </div>
            )}

            {/* Attendance History */}
            {selectedClass && attendance.length > 0 && (
                <div style={{ marginTop: 40 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>
                        Attendance History
                    </h2>

                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                background: "#fff",
                                borderRadius: 8,
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        background: "#f3f4f6",
                                        borderBottom: "2px solid #e5e7eb",
                                    }}
                                >
                                    <th style={tableHeaderStyle}>Date</th>
                                    <th style={tableHeaderStyle}>Student</th>
                                    <th style={tableHeaderStyle}>Status</th>
                                    <th style={tableHeaderStyle}>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendance.slice(0, 20).map((record, idx) => (
                                    <tr
                                        key={record.attendance_id}
                                        style={{
                                            borderBottom: "1px solid #e5e7eb",
                                            background: idx % 2 === 0 ? "#fff" : "#f9fafb",
                                        }}
                                    >
                                        <td style={tableCellStyle}>{fmtDate(record.class_date)}</td>
                                        <td style={tableCellStyle}>{record.email}</td>
                                        <td style={tableCellStyle}>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    padding: "4px 8px",
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    background:
                                                        record.status === "Present"
                                                            ? "#dcfce7"
                                                            : record.status === "Absent"
                                                                ? "#fee2e2"
                                                                : record.status === "Late"
                                                                    ? "#fef3c7"
                                                                    : "#dbeafe",
                                                    color:
                                                        record.status === "Present"
                                                            ? "#15803d"
                                                            : record.status === "Absent"
                                                                ? "#991b1b"
                                                                : record.status === "Late"
                                                                    ? "#92400e"
                                                                    : "#0284c7",
                                                }}
                                            >
                                                {record.status}
                                            </span>
                                        </td>
                                        <td style={tableCellStyle}>
                                            {record.notes || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
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
                    Select a class to mark attendance
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
