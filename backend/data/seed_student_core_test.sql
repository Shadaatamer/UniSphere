-- Seed data for Student Core Features testing
-- Idempotent: safe to run multiple times.

BEGIN;

-- 1) Ensure a department exists
INSERT INTO departments (name)
VALUES ('Computer Engineering')
ON CONFLICT (name) DO NOTHING;

-- 2) Ensure test professor + student users exist
-- Password for both test users: Test@123
INSERT INTO users (email, password_hash, role, is_active)
VALUES (
  'professor.test@unisphere.local',
  '$2b$10$IgEYE3nrNedKfWPOGx4KJuh.TXs1Jnbj8Wnkx7KxlPTo92V1C/BIO',
  'professor',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, role, is_active)
VALUES (
  'student.test@unisphere.local',
  '$2b$10$IgEYE3nrNedKfWPOGx4KJuh.TXs1Jnbj8Wnkx7KxlPTo92V1C/BIO',
  'student',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE
  v_dept_id INT;
  v_prof_user_id INT;
  v_student_user_id INT;
  v_professor_id INT;
  v_student_id INT;
  v_course1_id INT;
  v_course2_id INT;
  v_class1_id INT;
  v_class2_id INT;
  v_enr1_id INT;
  v_enr2_id INT;
BEGIN
  SELECT department_id INTO v_dept_id
  FROM departments
  WHERE name = 'Computer Engineering'
  LIMIT 1;

  SELECT user_id INTO v_prof_user_id
  FROM users
  WHERE email = 'professor.test@unisphere.local'
  LIMIT 1;

  SELECT user_id INTO v_student_user_id
  FROM users
  WHERE email = 'student.test@unisphere.local'
  LIMIT 1;

  IF v_prof_user_id IS NULL OR v_student_user_id IS NULL THEN
    RAISE EXCEPTION 'Test users were not created correctly';
  END IF;

  -- 3) Ensure role profile rows exist
  INSERT INTO professors (user_id, department_id)
  VALUES (v_prof_user_id, v_dept_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO students (user_id, department_id)
  VALUES (v_student_user_id, v_dept_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT professor_id INTO v_professor_id
  FROM professors
  WHERE user_id = v_prof_user_id
  LIMIT 1;

  SELECT student_id INTO v_student_id
  FROM students
  WHERE user_id = v_student_user_id
  LIMIT 1;

  IF v_professor_id IS NULL OR v_student_id IS NULL THEN
    RAISE EXCEPTION 'Professor/student profile rows are missing';
  END IF;

  -- 4) Ensure courses exist
  INSERT INTO courses (code, name, credits, department_id)
  VALUES
    ('CS101T', 'Intro to Programming - Test', 3, v_dept_id),
    ('MATH201T', 'Discrete Mathematics - Test', 3, v_dept_id)
  ON CONFLICT (code) DO NOTHING;

  SELECT course_id INTO v_course1_id FROM courses WHERE code = 'CS101T' LIMIT 1;
  SELECT course_id INTO v_course2_id FROM courses WHERE code = 'MATH201T' LIMIT 1;

  -- 5) Ensure class sections exist (timetable data)
  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_course1_id, v_professor_id, 'Spring', 2026, 'A', 50, 'Monday', '10:00', '12:00', 'Lab 301'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes
    WHERE course_id = v_course1_id
      AND professor_id = v_professor_id
      AND semester = 'Spring'
      AND year = 2026
      AND section = 'A'
  );

  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_course2_id, v_professor_id, 'Spring', 2026, 'B', 50, 'Wednesday', '13:00', '15:00', 'Hall B-205'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes
    WHERE course_id = v_course2_id
      AND professor_id = v_professor_id
      AND semester = 'Spring'
      AND year = 2026
      AND section = 'B'
  );

  SELECT class_id INTO v_class1_id
  FROM classes
  WHERE course_id = v_course1_id AND professor_id = v_professor_id AND semester = 'Spring' AND year = 2026 AND section = 'A'
  LIMIT 1;

  SELECT class_id INTO v_class2_id
  FROM classes
  WHERE course_id = v_course2_id AND professor_id = v_professor_id AND semester = 'Spring' AND year = 2026 AND section = 'B'
  LIMIT 1;

  -- 6) Enroll student
  INSERT INTO enrollments (class_id, student_id)
  VALUES (v_class1_id, v_student_id)
  ON CONFLICT (class_id, student_id) DO NOTHING;

  INSERT INTO enrollments (class_id, student_id)
  VALUES (v_class2_id, v_student_id)
  ON CONFLICT (class_id, student_id) DO NOTHING;

  SELECT enrollment_id INTO v_enr1_id FROM enrollments WHERE class_id = v_class1_id AND student_id = v_student_id LIMIT 1;
  SELECT enrollment_id INTO v_enr2_id FROM enrollments WHERE class_id = v_class2_id AND student_id = v_student_id LIMIT 1;

  -- 7) Seed grades (for GPA/result generation)
  INSERT INTO grades (enrollment_id, assessment_type, score, max_score)
  SELECT v_enr1_id, 'Midterm', 84, 100
  WHERE NOT EXISTS (
    SELECT 1 FROM grades WHERE enrollment_id = v_enr1_id AND assessment_type = 'Midterm'
  );

  INSERT INTO grades (enrollment_id, assessment_type, score, max_score)
  SELECT v_enr1_id, 'Final', 90, 100
  WHERE NOT EXISTS (
    SELECT 1 FROM grades WHERE enrollment_id = v_enr1_id AND assessment_type = 'Final'
  );

  INSERT INTO grades (enrollment_id, assessment_type, score, max_score)
  SELECT v_enr2_id, 'Midterm', 72, 100
  WHERE NOT EXISTS (
    SELECT 1 FROM grades WHERE enrollment_id = v_enr2_id AND assessment_type = 'Midterm'
  );

  INSERT INTO grades (enrollment_id, assessment_type, score, max_score)
  SELECT v_enr2_id, 'Project', 78, 100
  WHERE NOT EXISTS (
    SELECT 1 FROM grades WHERE enrollment_id = v_enr2_id AND assessment_type = 'Project'
  );

  -- 8) Seed attendance (for attendance summary)
  INSERT INTO attendance (enrollment_id, class_date, status, notes)
  VALUES
    (v_enr1_id, DATE '2026-02-02', 'Present', NULL),
    (v_enr1_id, DATE '2026-02-09', 'Present', NULL),
    (v_enr1_id, DATE '2026-02-16', 'Late', 'Traffic'),
    (v_enr1_id, DATE '2026-02-23', 'Present', NULL),
    (v_enr1_id, DATE '2026-03-02', 'Absent', 'Sick')
  ON CONFLICT (enrollment_id, class_date) DO NOTHING;

  INSERT INTO attendance (enrollment_id, class_date, status, notes)
  VALUES
    (v_enr2_id, DATE '2026-02-03', 'Present', NULL),
    (v_enr2_id, DATE '2026-02-10', 'Present', NULL),
    (v_enr2_id, DATE '2026-02-17', 'Excused', 'Official event'),
    (v_enr2_id, DATE '2026-02-24', 'Present', NULL),
    (v_enr2_id, DATE '2026-03-03', 'Present', NULL)
  ON CONFLICT (enrollment_id, class_date) DO NOTHING;

  -- 9) Seed exam schedules
  INSERT INTO exam_schedules (class_id, exam_type, exam_date, start_time, end_time, location)
  SELECT v_class1_id, 'midterm', TIMESTAMP '2026-03-20 10:00:00', '10:00', '12:00', 'Exam Hall A'
  WHERE NOT EXISTS (
    SELECT 1 FROM exam_schedules
    WHERE class_id = v_class1_id
      AND exam_type = 'midterm'
      AND exam_date = TIMESTAMP '2026-03-20 10:00:00'
  );

  INSERT INTO exam_schedules (class_id, exam_type, exam_date, start_time, end_time, location)
  SELECT v_class2_id, 'final', TIMESTAMP '2026-05-15 13:00:00', '13:00', '15:00', 'Exam Hall B'
  WHERE NOT EXISTS (
    SELECT 1 FROM exam_schedules
    WHERE class_id = v_class2_id
      AND exam_type = 'final'
      AND exam_date = TIMESTAMP '2026-05-15 13:00:00'
  );

  -- 10) Global and course announcements
  INSERT INTO announcements (title, body, created_by, is_published)
  SELECT
    'Campus Holiday Notice',
    'Tomorrow is a university holiday. No classes will be held.',
    v_prof_user_id,
    TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM announcements WHERE title = 'Campus Holiday Notice'
  );

  INSERT INTO course_announcements (class_id, title, body, created_by, is_published)
  SELECT
    v_class1_id,
    'CS101T Quiz Reminder',
    'Quiz 1 will be held next Monday at the beginning of class.',
    v_prof_user_id,
    TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM course_announcements
    WHERE class_id = v_class1_id AND title = 'CS101T Quiz Reminder'
  );

  -- 11) Transcript request history for status tracking
  INSERT INTO transcript_requests (student_id, status)
  SELECT v_student_id, 'approved'
  WHERE NOT EXISTS (
    SELECT 1 FROM transcript_requests
    WHERE student_id = v_student_id AND status = 'approved'
  );

  INSERT INTO transcript_requests (student_id, status)
  SELECT v_student_id, 'rejected'
  WHERE NOT EXISTS (
    SELECT 1 FROM transcript_requests
    WHERE student_id = v_student_id AND status = 'rejected'
  );
END $$;

COMMIT;

