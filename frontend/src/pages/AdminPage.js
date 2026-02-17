import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    email: "", // Changed from username to email
    password: "",
    role: "student",
    department_id: "",
  });
  const [editUserId, setEditUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    email: "", // Changed from username to email
    role: "student",
    department_id: "",
  });

  // Fetch all users
  const fetchUsers = () => {
    api
      .get("/admin/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEditInputChange = (e) =>
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

  const handleCreateUser = (e) => {
    e.preventDefault();
    const endpoint =
      formData.role === "student" ? "/admin/students" : "/admin/professors";

    api
      .post(endpoint, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("User created successfully!");
        setFormData({
          email: "",
          password: "",
          role: "student",
          department_id: "",
        }); // Removed username
        fetchUsers();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const startEdit = (user) => {
    setEditUserId(user.user_id);
    setEditFormData({
      email: user.email || "", // Changed from username to email
      role: user.role,
      department_id:
        user.student_department_id || user.prof_department_id || "",
    });
  };

  const submitEdit = (e) => {
    e.preventDefault();
    api
      .put(`/admin/users/${editUserId}`, editFormData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        alert("User updated successfully!");
        setEditUserId(null);
        fetchUsers();
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  const toggleActive = (user_id) => {
    api
      .put(
        `/admin/users/${user_id}/toggle`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )
      .then(() => fetchUsers())
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  return (
    <div
      style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: "220px",
          backgroundColor: "#fff",
          borderRight: "1px solid #e0e0e0",
          padding: "20px",
        }}
      >
        <h2 style={{ fontSize: "18px", marginBottom: "30px" }}>Admin Portal</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: "15px" }}>Dashboard</li>
          <li
            style={{
              marginBottom: "15px",
              fontWeight: "600",
              color: "#ff7300",
            }}
          >
            Manage Users
          </li>
          <li style={{ marginBottom: "15px" }}>Manage Courses</li>
          <li style={{ marginBottom: "15px" }}>Messages</li>
          <li style={{ marginBottom: "15px" }}>Requests</li>
        </ul>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          flex: 1,
          padding: "30px",
          backgroundColor: "#eaf3ff", // Light blue background
        }}
      >
        <h1
          style={{ fontSize: "28px", fontWeight: "700", marginBottom: "10px" }}
        >
          Manage Users
        </h1>
        <p style={{ marginBottom: "30px", color: "#666" }}>
          Admin View: create, edit, activate or deactivate users
        </p>

        {/* CREATE USER FORM */}
        <div
          style={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "40px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ marginBottom: "15px" }}>Create New User</h2>
          <form
            onSubmit={handleCreateUser}
            style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
          >
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              style={{
                flex: "1 1 200px",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
              style={{
                flex: "1 1 150px",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              style={{
                flex: "1 1 120px",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            >
              <option value="student">Student</option>
              <option value="professor">Professor</option>
            </select>
            <input
              type="number"
              name="department_id"
              placeholder="Dept ID"
              value={formData.department_id}
              onChange={handleInputChange}
              required
              style={{
                flex: "1 1 100px",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 16px",
                backgroundColor: "#ff7300",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Create
            </button>
          </form>
        </div>

        {/* USERS TABLE */}
        <div
          style={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ marginBottom: "20px" }}>All Users</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>
                <th style={{ padding: "10px" }}>ID</th>
                <th style={{ padding: "10px" }}>Email</th>{" "}
                {/* Changed from "Username / Email" to just "Email" */}
                <th style={{ padding: "10px" }}>Role</th>
                <th style={{ padding: "10px" }}>Active</th>
                <th style={{ padding: "10px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{u.user_id}</td>
                  <td style={{ padding: "10px" }}>{u.email}</td>{" "}
                  {/* Changed to only show email */}
                  <td style={{ padding: "10px" }}>{u.role}</td>
                  <td style={{ padding: "10px" }}>
                    {u.is_active ? "Yes" : "No"}
                  </td>
                  <td style={{ padding: "10px" }}>
                    {editUserId === u.user_id ? (
                      <form
                        onSubmit={submitEdit}
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          name="email"
                          value={editFormData.email}
                          onChange={handleEditInputChange}
                          placeholder="Email"
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            width: "150px",
                          }}
                        />
                        <select
                          name="role"
                          value={editFormData.role}
                          onChange={handleEditInputChange}
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            width: "100px",
                          }}
                        >
                          <option value="student">Student</option>
                          <option value="professor">Professor</option>
                        </select>
                        <input
                          type="number"
                          name="department_id"
                          value={editFormData.department_id}
                          onChange={handleEditInputChange}
                          placeholder="Dept ID"
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            width: "80px",
                          }}
                        />
                        <button
                          type="submit"
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#28a745",
                            color: "#fff",
                            borderRadius: "6px",
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditUserId(null)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#dc3545",
                            color: "#fff",
                            borderRadius: "6px",
                          }}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(u)}
                          style={{
                            marginRight: "5px",
                            padding: "6px 12px",
                            backgroundColor: "#007bff",
                            color: "#fff",
                            borderRadius: "6px",
                            border: "none",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(u.user_id)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: u.is_active
                              ? "#ffc107"
                              : "#28a745",
                            color: "#fff",
                            borderRadius: "6px",
                            border: "none",
                          }}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
