const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../data/db");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const result = await db.query(
      `SELECT user_id, email, password_hash, role, is_active
       FROM users
       WHERE email = $1`,
      [email],
    );

    const user = result.rows[0];

    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (!user.is_active)
      return res.status(403).json({ message: "Account is inactive" });

    // role check (your frontend sends role)
    if (role && user.role !== role.toLowerCase()) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    console.log("LOGIN ATTEMPT:");
    console.log("Password entered:", password);
    console.log("Hash in DB:", user.password_hash);

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    console.log("Bcrypt result:", ok);

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({ token, role: user.role, user_id: user.user_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
