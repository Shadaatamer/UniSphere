const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Suppress unhandled Redis errors globally
process.on("unhandledRejection", (reason, promise) => {
  if (
    reason &&
    reason.message &&
    (reason.message.includes("ECONNREFUSED") ||
      reason.message.includes("Redis") ||
      reason.code === "ECONNREFUSED")
  ) {
    // Silently ignore Redis connection errors
    return;
  }
  console.error("Unhandled Rejection:", reason);
});

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const professorRoutes = require("./routes/professorRoutes");
const announcementsRoutes = require("./routes/announcementsRoutes");
const profileRoutes = require("./routes/profileRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const registrationRoutes = require("./modules/registration/registrationRoutes");
const feesRoutes = require("./modules/fees/feesRoutes");
// const analyticsRoutes = require("./routes/analyticsRoutes");
const schedulerRoutes = require("./modules/scheduler/schedulerRoutes");
const academicMonitoringRoutes = require("./routes/academicMonitoringRoutes");
const messagingRoutes = require("./routes/messagingRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const studentChatbotRoutes = require("./modules/studentChatbot/chatbotRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();
const PORT = process.env.PORT || 5050;
app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // max 500 requests per IP
  message: {
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login/auth attempts per IP
  message: {
    message: "Too many login attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

app.use(express.json());

// Routes
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/professor", professorRoutes);
app.use("/api/announcements", announcementsRoutes);

app.use("/api/profile", profileRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/student/registration", registrationRoutes);
app.use("/api/student/fees", feesRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/academic-monitoring", academicMonitoringRoutes);
app.use("/api/messages", messagingRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/student/chatbot", studentChatbotRoutes);
// Fallback
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.url} Not Found`,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
