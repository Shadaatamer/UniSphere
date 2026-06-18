import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function ProfessorAnnouncementsPage() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [globalAnnouncements, setGlobalAnnouncements] = useState([]);
    const [activeTab, setActiveTab] = useState("class");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: "",
        body: "",
        isPublished: true,
    });

    const token = localStorage.getItem("token");

    useEffect(() => {
        fetchClasses();
        fetchGlobalAnnouncements();
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

    const fetchAnnouncements = async (classId) => {
        try {
            const response = await api.get(
                `/professor/classes/${classId}/announcements`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setAnnouncements(response.data);
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load announcements");
        }
    };

    const fetchGlobalAnnouncements = async () => {
        try {
            const response = await api.get("/announcements", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setGlobalAnnouncements(response.data);
        } catch (err) {
            setGlobalAnnouncements([]);
            setError(err.response?.data?.message || "Failed to load global announcements");
        }
    };

    const handleSelectClass = (classItem) => {
        setSelectedClass(classItem);
        fetchAnnouncements(classItem.class_id);
        setShowForm(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({ title: "", body: "", isPublished: true });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim() || !formData.body.trim()) {
            setError("Please fill in all required fields");
            return;
        }

        try {
            if (editingId) {
                // Update existing announcement
                await api.put(
                    `/professor/announcements/${editingId}`,
                    formData,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                setSuccess("Announcement updated successfully!");
            } else {
                // Create new announcement
                await api.post(
                    "/professor/announcements",
                    {
                        classId: selectedClass.class_id,
                        ...formData,
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                setSuccess("Announcement posted successfully!");
            }

            resetForm();
            setShowForm(false);
            fetchAnnouncements(selectedClass.class_id);

            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save announcement");
        }
    };

    const handleDelete = async (announcementId) => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            try {
                await api.delete(
                    `/professor/announcements/${announcementId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                setSuccess("Announcement deleted successfully!");
                fetchAnnouncements(selectedClass.class_id);

                setTimeout(() => setSuccess(""), 3000);
            } catch (err) {
                setError(err.response?.data?.message || "Failed to delete announcement");
            }
        }
    };

    const handleEdit = (announcement) => {
        setFormData({
            title: announcement.title,
            body: announcement.body,
            isPublished: announcement.is_published,
        });
        setEditingId(announcement.announcement_id);
        setShowForm(true);
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
                    Course Announcements
                </h1>
                <p style={{ color: "#6b7280", fontSize: 14 }}>
                    Post and manage announcements for your classes
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

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 18,
                    background: "#f3f4f6",
                    padding: 6,
                    borderRadius: 10,
                    width: "fit-content",
                }}
            >
                <button
                    onClick={() => setActiveTab("class")}
                    style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 13,
                        background: activeTab === "class" ? "#2f5d50" : "transparent",
                        color: activeTab === "class" ? "#fff" : "#374151",
                    }}
                >
                    Class
                </button>
                <button
                    onClick={() => setActiveTab("global")}
                    style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 13,
                        background: activeTab === "global" ? "#2f5d50" : "transparent",
                        color: activeTab === "global" ? "#fff" : "#374151",
                    }}
                >
                    Global
                </button>
            </div>

            {activeTab === "class" && (
                <>
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
                                {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedClass && (
                <div>
                    <div
                        style={{
                            background: "#f0fdfa",
                            border: "1px solid #a7f3d0",
                            padding: 16,
                            borderRadius: 8,
                            marginBottom: 20,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ fontSize: 14, color: "#2f5d50", fontWeight: 600 }}>
                            {selectedClass.code} - {selectedClass.name}
                        </div>
                        <button
                            onClick={() => {
                                setShowForm(!showForm);
                                if (showForm) resetForm();
                            }}
                            style={{
                                padding: "8px 16px",
                                background: "#2f5d50",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontSize: 13,
                            }}
                        >
                            {showForm ? "Cancel" : "+ New Announcement"}
                        </button>
                    </div>

                    {/* Form */}
                    {showForm && (
                        <div
                            style={{
                                background: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 12,
                                padding: 18,
                                marginBottom: 20,
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
                                {editingId ? "Edit Announcement" : "Create Announcement"}
                            </h2>

                            <form onSubmit={handleSubmit}>
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
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Announcement title"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            fontSize: 13,
                                            fontFamily: "inherit",
                                            boxSizing: "border-box",
                                        }}
                                        required
                                    />
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
                                        Content
                                    </label>
                                    <textarea
                                        placeholder="Announcement content"
                                        value={formData.body}
                                        onChange={(e) =>
                                            setFormData({ ...formData, body: e.target.value })
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            fontSize: 13,
                                            fontFamily: "inherit",
                                            boxSizing: "border-box",
                                            minHeight: 120,
                                            resize: "vertical",
                                        }}
                                        required
                                    />
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.isPublished}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    isPublished: e.target.checked,
                                                })
                                            }
                                            style={{ cursor: "pointer" }}
                                        />
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                                            Publish immediately
                                        </span>
                                    </label>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: "10px 12px",
                                            background: "#2f5d50",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 8,
                                            fontWeight: 900,
                                            cursor: "pointer",
                                            fontSize: 13,
                                        }}
                                    >
                                        {editingId ? "Update" : "Post"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForm(false);
                                            resetForm();
                                        }}
                                        style={{
                                            padding: "10px 12px",
                                            background: "#e5e7eb",
                                            color: "#111827",
                                            border: "none",
                                            borderRadius: 8,
                                            fontWeight: 900,
                                            cursor: "pointer",
                                            fontSize: 13,
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Announcements List */}
                    <div>
                        {announcements.length === 0 ? (
                            <div
                                style={{
                                    padding: 40,
                                    textAlign: "center",
                                    background: "#f9fafb",
                                    borderRadius: 12,
                                    color: "#6b7280",
                                }}
                            >
                                No announcements posted yet.
                            </div>
                        ) : (
                            <div style={{ display: "grid", gap: 14 }}>
                                {announcements.map((ann) => (
                                    <div
                                        key={ann.announcement_id}
                                        style={{
                                            background: "#fff",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 12,
                                            padding: 18,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "start",
                                                marginBottom: 12,
                                            }}
                                        >
                                            <div>
                                                <h3
                                                    style={{
                                                        fontSize: 16,
                                                        fontWeight: 900,
                                                        color: "#111827",
                                                        margin: "0 0 4px 0",
                                                    }}
                                                >
                                                    {ann.title}
                                                </h3>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#6b7280",
                                                    }}
                                                >
                                                    {new Date(ann.created_at).toLocaleDateString()}{" "}
                                                    {new Date(ann.created_at).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    display: "inline-block",
                                                    background: ann.is_published ? "#dcfce7" : "#fef3c7",
                                                    color: ann.is_published ? "#15803d" : "#92400e",
                                                    padding: "4px 8px",
                                                    borderRadius: 6,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {ann.is_published ? "Published" : "Draft"}
                                            </div>
                                        </div>

                                        <p
                                            style={{
                                                color: "#374151",
                                                fontSize: 14,
                                                lineHeight: "1.5",
                                                marginBottom: 14,
                                                whiteSpace: "pre-wrap",
                                            }}
                                        >
                                            {ann.body}
                                        </p>

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: 8,
                                                paddingTop: 12,
                                                borderTop: "1px solid #e5e7eb",
                                            }}
                                        >
                                            <button
                                                onClick={() => handleEdit(ann)}
                                                style={{
                                                    padding: "8px 12px",
                                                    border: "1px solid #2f5d50",
                                                    background: "transparent",
                                                    color: "#2f5d50",
                                                    borderRadius: 6,
                                                    cursor: "pointer",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ann.announcement_id)}
                                                style={{
                                                    padding: "8px 12px",
                                                    border: "1px solid #dc2626",
                                                    background: "transparent",
                                                    color: "#dc2626",
                                                    borderRadius: 6,
                                                    cursor: "pointer",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                    Select a class to post announcements
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
                </>
            )}

            {activeTab === "global" && (
            <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>
                    Global Announcements
                </h2>
                <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>
                    Published platform-wide announcements from admin.
                </p>

                {globalAnnouncements.length === 0 ? (
                    <div
                        style={{
                            padding: 24,
                            textAlign: "center",
                            background: "#f9fafb",
                            borderRadius: 12,
                            color: "#6b7280",
                        }}
                    >
                        No global announcements available.
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                        {globalAnnouncements.map((ann) => (
                            <div
                                key={`global-${ann.announcement_id}`}
                                style={{
                                    background: "#fff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    padding: 16,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "start",
                                        marginBottom: 10,
                                    }}
                                >
                                    <h3
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 900,
                                            color: "#111827",
                                            margin: 0,
                                        }}
                                    >
                                        {ann.title}
                                    </h3>
                                    <span
                                        style={{
                                            display: "inline-block",
                                            background: "#eef4f1",
                                            color: "#2f5d50",
                                            padding: "4px 8px",
                                            borderRadius: 6,
                                            fontSize: 11,
                                            fontWeight: 700,
                                        }}
                                    >
                                        Global
                                    </span>
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "#6b7280",
                                        marginBottom: 10,
                                    }}
                                >
                                    {new Date(ann.created_at).toLocaleDateString()}{" "}
                                    {new Date(ann.created_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                                <p
                                    style={{
                                        color: "#374151",
                                        fontSize: 14,
                                        lineHeight: "1.5",
                                        margin: 0,
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {ann.body}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}
        </div>
    );
}
