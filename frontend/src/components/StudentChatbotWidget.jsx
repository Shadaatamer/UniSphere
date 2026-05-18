import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function RobotIcon({ size = 28, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="8" y="12" width="16" height="13" rx="3" fill={color} />
      <rect
        x="11"
        y="16"
        width="3"
        height="3"
        rx="1"
        fill="white"
        fillOpacity="0.9"
      />
      <rect
        x="18"
        y="16"
        width="3"
        height="3"
        rx="1"
        fill="white"
        fillOpacity="0.9"
      />
      <rect
        x="13"
        y="21"
        width="6"
        height="1.5"
        rx="0.75"
        fill="white"
        fillOpacity="0.7"
      />
      <rect x="14.5" y="8" width="3" height="4" rx="1" fill={color} />
      <circle cx="16" cy="7" r="2" fill={color} />
      <rect x="5" y="15" width="3" height="5" rx="1.5" fill={color} />
      <rect x="24" y="15" width="3" height="5" rx="1.5" fill={color} />
    </svg>
  );
}

function TypingDots() {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        alignItems: "center",
        padding: "4px 0",
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#94a3b8",
            display: "inline-block",
            animation: "bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(79, 70, 229, 0); }
        }
      `}</style>
    </div>
  );
}

export default function StudentChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [starterPrompts, setStarterPrompts] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const fetchChat = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/student/chatbot");
      setMessages(res.data?.messages || []);
      setStarterPrompts(res.data?.starterPrompts || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load chatbot");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && messages.length === 0) {
      fetchChat();
    }
    if (open) {
      setHasUnread(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, open]);

  const sendMessage = async (value) => {
    const text = String(value || input).trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    try {
      const res = await api.post("/student/chatbot/message", { message: text });
      setMessages((current) =>
        [...current, res.data?.userMessage, res.data?.assistantMessage].filter(
          Boolean,
        ),
      );
      setInput("");
      if (!open) setHasUnread(true);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    try {
      setError("");
      await api.delete("/student/chatbot/messages");
      setMessages([]);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to clear chat");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 9999,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: open
            ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
            : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "0 8px 32px rgba(79, 70, 229, 0.45), 0 2px 8px rgba(0,0,0,0.15)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          animation: !open && !hasUnread ? "pulse 2.4s infinite" : "none",
          transform: open ? "scale(0.95)" : "scale(1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow =
            "0 12px 40px rgba(79, 70, 229, 0.55), 0 2px 8px rgba(0,0,0,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = open ? "scale(0.95)" : "scale(1)";
          e.currentTarget.style.boxShadow =
            "0 8px 32px rgba(79, 70, 229, 0.45), 0 2px 8px rgba(0,0,0,0.15)";
        }}
      >
        <div
          style={{
            transition: "opacity 0.2s, transform 0.2s",
            opacity: 1,
            transform: open
              ? "rotate(180deg) scale(0.85)"
              : "rotate(0deg) scale(1)",
          }}
        >
          {open ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <RobotIcon size={30} color="white" />
          )}
        </div>

        {/* Unread badge */}
        {hasUnread && !open && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ef4444",
              border: "2px solid white",
            }}
          />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="AI Student Assistant"
          style={{
            position: "fixed",
            bottom: 100,
            right: 28,
            zIndex: 9998,
            width: 380,
            maxWidth: "calc(100vw - 40px)",
            maxHeight: "70vh",
            borderRadius: 20,
            background: "#ffffff",
            boxShadow:
              "0 24px 64px rgba(15, 23, 42, 0.18), 0 4px 16px rgba(15, 23, 42, 0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            border: "1px solid rgba(99, 102, 241, 0.12)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1.5px solid rgba(255,255,255,0.3)",
              }}
            >
              <RobotIcon size={22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  lineHeight: 1.2,
                }}
              >
                UniSphere Assistant
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {sending ? (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#4ade80",
                        display: "inline-block",
                        animation: "bounce 1s infinite",
                      }}
                    />
                    Thinking…
                  </span>
                ) : (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#4ade80",
                        display: "inline-block",
                      }}
                    />
                    Online · AI-powered
                  </span>
                )}
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear conversation"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 11,
                  fontWeight: 600,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.22)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
                }
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 12px 4px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "#f8faff",
              scrollbarWidth: "thin",
              scrollbarColor: "#c7d2fe transparent",
            }}
          >
            {loading && (
              <div style={{ textAlign: "center", padding: 20 }}>
                <TypingDots />
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
                  Loading…
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  padding: "8px 12px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div>
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #eef2ff 0%, #f0f9ff 100%)",
                    border: "1px dashed #c7d2fe",
                    borderRadius: 14,
                    padding: "12px 14px",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <RobotIcon size={18} color="#6366f1" />
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#3730a3",
                      }}
                    >
                      Hi there! 👋
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      color: "#475569",
                      lineHeight: 1.6,
                    }}
                  >
                    I can help with your GPA, registered courses, academic
                    flags, and registration guidance.
                  </p>
                </div>

                {starterPrompts.length > 0 && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        disabled={sending}
                        style={{
                          background: "#fff",
                          border: "1px solid #e0e7ff",
                          borderRadius: 10,
                          padding: "7px 12px",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: 12,
                          color: "#4338ca",
                          fontWeight: 600,
                          transition: "background 0.15s, border-color 0.15s",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#eef2ff";
                          e.currentTarget.style.borderColor = "#a5b4fc";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#fff";
                          e.currentTarget.style.borderColor = "#e0e7ff";
                        }}
                      >
                        <span style={{ opacity: 0.5, fontSize: 10 }}>▶</span>
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((message, idx) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.message_id || idx}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    animation: "fadeIn 0.2s ease",
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginRight: 6,
                        marginTop: 2,
                      }}
                    >
                      <RobotIcon size={16} color="white" />
                    </div>
                  )}

                  <div
                    style={{
                      maxWidth: "78%",
                      background: isUser
                        ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)"
                        : "#ffffff",
                      color: isUser ? "#fff" : "#1e293b",
                      border: isUser ? "none" : "1px solid #e8eaf6",
                      borderRadius: isUser
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      padding: "9px 13px",
                      boxShadow: isUser
                        ? "0 2px 8px rgba(79,70,229,0.25)"
                        : "0 1px 4px rgba(15,23,42,0.06)",
                    }}
                  >
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.55,
                        fontSize: 13,
                      }}
                    >
                      {message.content}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        opacity: 0.55,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span>{formatTime(message.created_at)}</span>
                      {!isUser &&
                        message.provider &&
                        message.provider !== "local-fallback" && (
                          <span style={{ fontStyle: "italic" }}>
                            {message.provider}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <RobotIcon size={16} color="white" />
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e8eaf6",
                    borderRadius: "18px 18px 18px 4px",
                    padding: "10px 14px",
                    boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                  }}
                >
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: "10px 12px 12px",
              borderTop: "1px solid #e8eaf6",
              background: "#fff",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                background: "#f1f5f9",
                borderRadius: 14,
                border: "1.5px solid #e2e8f0",
                padding: "6px 6px 6px 12px",
                transition: "border-color 0.15s",
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = "#a5b4fc";
                e.currentTarget.style.background = "#fff";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.background = "#f1f5f9";
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about courses, GPA, flags…"
                style={{
                  flex: 1,
                  resize: "none",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  font: "inherit",
                  fontSize: 13,
                  color: "#0f172a",
                  lineHeight: 1.5,
                  maxHeight: 80,
                  overflowY: "auto",
                  padding: "2px 0",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 80) + "px";
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={sending || !input.trim()}
                aria-label="Send message"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "none",
                  background:
                    sending || !input.trim()
                      ? "#e2e8f0"
                      : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: sending || !input.trim() ? "#94a3b8" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                  transition: "background 0.2s, transform 0.1s",
                  flexShrink: 0,
                  transform: "scale(1)",
                }}
                onMouseEnter={(e) => {
                  if (!sending && input.trim())
                    e.currentTarget.style.transform = "scale(1.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div
              style={{
                textAlign: "center",
                marginTop: 6,
                fontSize: 10,
                color: "#94a3b8",
              }}
            >
              Press Enter to send · Shift+Enter for newline
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(79,70,229,0.45), 0 2px 8px rgba(0,0,0,0.15); }
          50% { box-shadow: 0 8px 32px rgba(79,70,229,0.45), 0 0 0 8px rgba(79,70,229,0.12), 0 2px 8px rgba(0,0,0,0.15); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
