import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../services/api";

const ROLE_COLORS = {
  admin: { bg: "#fef3c7", text: "#92400e", label: "Admin" },
  professor: { bg: "#ede9fe", text: "#6d28d9", label: "Professor" },
  student: { bg: "#dbeafe", text: "#1e40af", label: "Student" },
};

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || { bg: "#f3f4f6", text: "#374151", label: role };
  return (
    <span
      style={{
        display: "inline-block",
        background: c.bg,
        color: c.text,
        borderRadius: 999,
        padding: "1px 8px",
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {c.label}
    </span>
  );
}

export default function MessagingPage() {
  const token = localStorage.getItem("token");
  const myUserId = Number(localStorage.getItem("user_id"));
  const headers = { Authorization: `Bearer ${token}` };

  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [myRole, setMyRole] = useState("");
  const [activeConversation, setActiveConversation] = useState(null); // { conversationId, otherUser, messages }
  const [newMessage, setNewMessage] = useState("");
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    try {
      const r = await api.get("/messages/conversations", { headers });
      setConversations(r.data.conversations || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load conversations.");
    }
  }, []);

  // Fetch available users
  const fetchUsers = useCallback(async () => {
    try {
      const r = await api.get("/messages/users", { headers });
      setUsers(r.data.users || []);
      setMyRole(r.data.myRole || "");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load users.");
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, [fetchConversations, fetchUsers]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Open conversation with a user
  const openConversation = async (otherUserId) => {
    setLoading(true);
    setShowNewConvo(false);
    setError("");
    try {
      const r = await api.get(`/messages/with/${otherUserId}`, { headers });
      setActiveConversation({
        conversationId: r.data.conversationId,
        otherUser: r.data.otherUser,
        messages: r.data.messages || [],
      });
      fetchConversations(); // refresh unread counts
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load conversation.");
    }
    setLoading(false);
  };

  // Polling for new messages
  useEffect(() => {
    if (activeConversation) {
      pollRef.current = setInterval(async () => {
        try {
          const r = await api.get(
            `/messages/with/${activeConversation.otherUser.user_id}`,
            { headers }
          );
          setActiveConversation((prev) =>
            prev ? { ...prev, messages: r.data.messages || [] } : prev
          );
          fetchConversations();
        } catch {}
      }, 4000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [activeConversation?.conversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages?.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversation) return;
    setSending(true);
    setError("");
    try {
      await api.post(
        "/messages/send",
        {
          recipient_id: activeConversation.otherUser.user_id,
          body: newMessage.trim(),
        },
        { headers }
      );
      setNewMessage("");
      // Refresh
      const r = await api.get(
        `/messages/with/${activeConversation.otherUser.user_id}`,
        { headers }
      );
      setActiveConversation((prev) => ({
        ...prev,
        messages: r.data.messages || [],
      }));
      fetchConversations();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to send message.");
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.full_name + u.email + u.role)
      .toLowerCase()
      .includes(searchUser.toLowerCase())
  );

  // Styles
  const sidebarStyle = {
    width: isMobile ? "100%" : 280,
    flexShrink: 0,
    background: "#fff",
    borderRight: isMobile ? "none" : "1px solid #e5e7eb",
    borderBottom: isMobile ? "1px solid #e5e7eb" : "none",
    display: "flex",
    flexDirection: "column",
    height: isMobile ? "auto" : "calc(100vh - 64px)",
  };
  const chatAreaStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#f9fafb",
    height: isMobile ? "auto" : "calc(100vh - 64px)",
    minHeight: 0,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        height: isMobile ? "auto" : "calc(100vh - 64px)",
        minHeight: isMobile ? "calc(100vh - 88px)" : "calc(100vh - 64px)",
        margin: isMobile ? "-12px" : "-24px",
        overflow: "hidden",
      }}
    >
      {/* SIDEBAR */}
      {isMobile && activeConversation ? null : <aside style={sidebarStyle}>
        <div
          style={{
            padding: "16px 14px 10px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <h2 style={{ fontWeight: 900, fontSize: 16, margin: 0 }}>
              💬 Messages
            </h2>
            <button
              onClick={() => {
                setShowNewConvo(!showNewConvo);
                setActiveConversation(null);
                setSearchUser("");
              }}
              title="New conversation"
              style={{
                background: "#ea580c",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "5px 10px",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              +
            </button>
          </div>
        </div>

        {error ? (
          <div
            style={{
              margin: "0 14px 10px",
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 12,
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        ) : null}

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 && !showNewConvo && (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              No conversations yet.
              <br />
              Press + to start one.
            </div>
          )}
          {conversations.map((c) => {
            const isActive =
              activeConversation?.otherUser?.user_id === c.other_user_id;
            return (
              <div
                key={c.conversation_id}
                onClick={() => openConversation(c.other_user_id)}
                style={{
                  padding: "12px 14px",
                  cursor: "pointer",
                  background: isActive ? "#fff7ed" : "transparent",
                  borderLeft: isActive
                    ? "3px solid #ea580c"
                    : "3px solid transparent",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: 14 }}>
                    {c.other_name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {Number(c.unread_count) > 0 && (
                      <span
                        style={{
                          background: "#ea580c",
                          color: "#fff",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 900,
                          padding: "1px 7px",
                          minWidth: 18,
                          textAlign: "center",
                        }}
                      >
                        {c.unread_count}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      {c.last_message_at
                        ? new Date(c.last_message_at).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <RoleBadge role={c.other_role} />
                  {c.last_message && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 140,
                      }}
                    >
                      {c.last_sender_id === myUserId ? "You: " : ""}
                      {c.last_message}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>}

      {/* MAIN CHAT AREA */}
      <div style={chatAreaStyle}>
        {/* New conversation user picker */}
        {showNewConvo && (
          <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 16 : 24 }}>
            <h3 style={{ fontWeight: 900, marginBottom: 12 }}>
              Start a New Conversation
            </h3>
            {myRole === "student" && (
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                ℹ️ As a student, you can message professors and admins only.
              </p>
            )}
            <input
              autoFocus
              type="text"
              placeholder="Search by name or role…"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              style={{
                width: "100%",
                maxWidth: 400,
                border: "1.5px solid #d1d5db",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 14,
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {filteredUsers.map((u) => (
                <div
                  key={u.user_id}
                  onClick={() => openConversation(u.user_id)}
                  style={{
                    background: "#fff",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    minWidth: isMobile ? "100%" : 180,
                    transition: "border-color 0.15s",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#ea580c")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#e5e7eb")
                  }
                >
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>
                    {u.full_name}
                  </div>
                  <RoleBadge role={u.role} />
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                    {u.email}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p style={{ color: "#9ca3af", fontSize: 14 }}>No users found.</p>
              )}
            </div>
          </div>
        )}

        {/* Active conversation */}
        {!showNewConvo && activeConversation && (
          <>
            {/* Header */}
            <div
              style={{
                background: "#fff",
                borderBottom: "1px solid #e5e7eb",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              {isMobile ? (
                <button
                  onClick={() => setActiveConversation(null)}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    borderRadius: 10,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Back
                </button>
              ) : null}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: "#e5e7eb",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  fontSize: 16,
                  color: "#374151",
                }}
              >
                {activeConversation.otherUser.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <div style={{ fontWeight: 900 }}>
                  {activeConversation.otherUser.full_name}
                </div>
                <RoleBadge role={activeConversation.otherUser.role} />
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: isMobile ? "16px 12px" : "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {loading && (
                <p style={{ color: "#9ca3af", textAlign: "center" }}>Loading…</p>
              )}
              {activeConversation.messages.map((m) => {
                const isMe = m.sender_id === myUserId;
                return (
                  <div
                    key={m.message_id}
                    style={{
                      display: "flex",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: isMobile ? "88%" : "66%",
                        background: isMe ? "#ea580c" : "#fff",
                        color: isMe ? "#fff" : "#111827",
                        border: isMe ? "none" : "1px solid #e5e7eb",
                        borderRadius: isMe
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                        padding: "10px 14px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                      }}
                    >
                      {!isMe && (
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#6b7280",
                            margin: "0 0 3px",
                          }}
                        >
                          {m.sender_name}
                        </p>
                      )}
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          lineHeight: 1.45,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {m.body}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 11,
                          opacity: 0.7,
                          textAlign: "right",
                        }}
                      >
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              style={{
                background: "#fff",
                borderTop: "1px solid #e5e7eb",
                padding: isMobile ? "12px" : "12px 20px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 10,
                alignItems: isMobile ? "stretch" : "flex-end",
                flexShrink: 0,
              }}
            >
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
                rows={2}
                style={{
                  flex: 1,
                  border: "1.5px solid #d1d5db",
                  borderRadius: 12,
                  padding: "8px 14px",
                  fontSize: 14,
                  resize: "none",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                style={{
                  background: "#ea580c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 18px",
                  fontWeight: 800,
                  cursor: sending || !newMessage.trim() ? "not-allowed" : "pointer",
                  opacity: sending || !newMessage.trim() ? 0.6 : 1,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {sending ? "…" : "Send ↑"}
              </button>
            </div>
          </>
        )}

        {/* Empty state */}
        {!showNewConvo && !activeConversation && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 56 }}>💬</div>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>
              Select a conversation or start a new one
            </p>
            <button
              onClick={() => setShowNewConvo(true)}
              style={{
                background: "#ea580c",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "9px 22px",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 14,
                marginTop: 6,
              }}
            >
              + New Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
