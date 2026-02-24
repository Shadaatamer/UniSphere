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