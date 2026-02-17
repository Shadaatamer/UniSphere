-- ===============================
-- UniSphere SIS Database Schema
-- ===============================

-- -------------------------------
-- Departments Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS departments (
  department_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- -------------------------------
-- Users Table (Auth + Roles)
-- -------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,

  role TEXT NOT NULL
    CHECK (role IN ('admin', 'student', 'professor')),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------
-- Students Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS students (
  student_id SERIAL PRIMARY KEY,

  user_id INT NOT NULL UNIQUE,
  department_id INT NOT NULL,

  CONSTRAINT fk_student_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_student_department
    FOREIGN KEY (department_id)
    REFERENCES departments(department_id)
    ON DELETE CASCADE
);

-- -------------------------------
-- Professors Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS professors (
  professor_id SERIAL PRIMARY KEY,

  user_id INT NOT NULL UNIQUE,
  department_id INT NOT NULL,

  CONSTRAINT fk_prof_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_prof_department
    FOREIGN KEY (department_id)
    REFERENCES departments(department_id)
    ON DELETE CASCADE
);

-- -------------------------------
-- Default Departments Seed Data
-- -------------------------------
INSERT INTO departments (name)
VALUES
  ('Computer Engineering'),
  ('Electrical Engineering'),
  ('Mechanical Engineering')
ON CONFLICT DO NOTHING;
