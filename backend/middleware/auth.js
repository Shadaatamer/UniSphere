const jwt = require("jsonwebtoken");

// 🔐 Verify JWT token
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // MUST include role here if your other middleware uses it!
    req.user = {
      id: decoded.user_id,
      role: decoded.role,
    };
    console.log("Authenticated user:", req.user);
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// 🔒 Role-based protection
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRole = String(req.user.role).toLowerCase();

    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};

const adminOnly = allowRoles("admin");
const studentOnly = allowRoles("student");
const professorOnly = allowRoles("professor");

module.exports = {
  verifyJWT,
  adminOnly,
  studentOnly,
  professorOnly,
};
