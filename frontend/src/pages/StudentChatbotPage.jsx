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

export default function StudentChatbotPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [starterPrompts, setStarterPrompts] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

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
    fetchChat();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async (value) => {
    const text = String(value || input).trim();
    if (!text) return;

    setSending(true);
    setError("");
    try {
      const res = await api.post("/student/chatbot/message", { message: text });
      setMessages((current) => [
        ...current,
        res.data?.userMessage,
        res.data?.assistantMessage,
      ].filter(Boolean));
      setInput("");
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

  if (loading) {
    return <div style={{ padding: 24, color: "#6b7280" }}>Loading chatbot...</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 20,
        minHeight: "calc(100vh - 64px)",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #eef4f1 0%, #f8fafc 100%)",
          border: "1px solid #eef4f1",
          borderRadius: 18,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
          Student AI Assistant
        </div>
        <div style={{ color: "#475569", maxWidth: 760, lineHeight: 1.5 }}>
          Ask about your registered courses, GPA, academic status, registration load, and general portal guidance. If an OpenAI API key is configured, responses come from the AI model; otherwise the assistant still answers a few portal-based questions locally.
        </div>
      </div>

      {starterPrompts.length ? (
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={sending}
              style={{
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                borderRadius: 999,
                padding: "8px 14px",
                cursor: sending ? "not-allowed" : "pointer",
                fontWeight: 700,
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          display: "grid",
          gridTemplateRows: "1fr auto",
          minHeight: 520,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 18,
            overflowY: "auto",
            display: "grid",
            gap: 14,
            background: "#f8fafc",
          }}
        >
          {error ? (
            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div
              style={{
                background: "#fff",
                border: "1px dashed #cbd5e1",
                borderRadius: 16,
                padding: 18,
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              Start a conversation with the assistant. Good first questions are about your GPA, current registered courses, academic monitoring flags, or registration load.
            </div>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.message_id}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    background: isUser ? "#2f5d50" : "#fff",
                    color: isUser ? "#fff" : "#0f172a",
                    border: isUser ? "none" : "1px solid #e5e7eb",
                    borderRadius: 18,
                    padding: "12px 14px",
                    boxShadow: isUser ? "none" : "0 4px 12px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      marginBottom: 6,
                      opacity: 0.8,
                    }}
                  >
                    {isUser ? "You" : "AI Assistant"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {message.content}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      opacity: 0.7,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span>{formatTime(message.created_at)}</span>
                    {!isUser && message.provider ? <span>{message.provider}</span> : null}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div
          style={{
            padding: 16,
            borderTop: "1px solid #e5e7eb",
            background: "#fff",
            display: "grid",
            gap: 10,
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="Ask about your courses, GPA, flags, registration load, or portal guidance..."
            style={{
              width: "100%",
              resize: "vertical",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              padding: 12,
              font: "inherit",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button
              type="button"
              onClick={clearChat}
              disabled={sending || messages.length === 0}
              style={{
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#334155",
                borderRadius: 12,
                padding: "10px 14px",
                cursor: sending || messages.length === 0 ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              Clear Chat
            </button>
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              style={{
                border: "none",
                background: "#2f5d50",
                color: "#fff",
                borderRadius: 12,
                padding: "10px 16px",
                cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                fontWeight: 900,
                opacity: sending || !input.trim() ? 0.7 : 1,
              }}
            >
              {sending ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
