require("dotenv").config();

const { Pool } = require("pg");

const useSSL = process.env.DB_SSL === "true";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: useSSL
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

pool
  .connect()
  .then(() => console.log("✅ Connected to Neon DB"))
  .catch((err) => console.error("❌ DB connection error:", err));
module.exports = pool;
