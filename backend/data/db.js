// backend/data/db.js
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "sis",
  password: "sis_password",
  database: "sis_db",
});

module.exports = pool;
