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

CREATE TABLE IF NOT EXISTS announcements (
  announcement_id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by INT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_announcement_admin
    FOREIGN KEY (created_by)
    REFERENCES users(user_id)
    ON DELETE CASCADE
);
-- Enrollments: which students are in which class
CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  UNIQUE (class_id, student_id)
);

-- Grades: per class + per student + per item
CREATE TABLE IF NOT EXISTS grades (
  grade_id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  item_name VARCHAR(100) NOT NULL,
  score NUMERIC(6,2) NOT NULL,
  max_score NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (class_id, student_id, item_name)
);

-- Attendance sessions: each class meeting date
CREATE TABLE IF NOT EXISTS attendance_sessions (
  session_id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  UNIQUE (class_id, session_date)
);

-- Attendance records: each student status per session
CREATE TABLE IF NOT EXISTS attendance_records (
  record_id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES attendance_sessions(session_id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  UNIQUE (session_id, student_id)
);