const express = require("express");
const cors = require("cors");
// server.js
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = 5000;

// 1. Middleware
// CORS allows your React app (usually port 3000) to talk to this server
app.use(cors());

// Allows the server to understand JSON sent in the request body
app.use(express.json());

// 2. Routes
// This prefixes every route inside authRoutes with "/api/auth"
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// 3. Fallback Route (For Debugging)
// If you hit a URL that doesn't exist, this provides a clearer message
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.url} Not Found`,
  });
});

// 4. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
