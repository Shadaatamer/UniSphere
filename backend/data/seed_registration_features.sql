-- Seed data for registration + transcript/admin testing
-- Safe to run multiple times.
-- Test password for created users: Test@123

BEGIN;

INSERT INTO departments (name)
VALUES ('Computer Engineering')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_dept_id INT;
  v_prof_user_id INT;
  v_student1_user_id INT;
  v_student2_user_id INT;
  v_admin_user_id INT;
  v_professor_id INT;
  v_student1_id INT;
  v_student2_id INT;

  v_cse329 INT;
  v_eec487 INT;
  v_cse403 INT;
  v_eec486 INT;
  v_cce401 INT;
  v_cse470 INT; -- open class for successful registration
  v_cse460 INT; -- time conflict class
  v_cse450 INT; -- full class

  v_cls_cse329 INT;
  v_cls_eec487 INT;
  v_cls_cse403 INT;
  v_cls_eec486 INT;
  v_cls_cce401 INT;
  v_cls_cse470 INT;
  v_cls_cse460 INT;
  v_cls_cse450 INT;
BEGIN
  SELECT department_id INTO v_dept_id
  FROM departments
  WHERE name = 'Computer Engineering'
  LIMIT 1;

  -- Users
  INSERT INTO users (email, password_hash, role, is_active)
  VALUES ('admin.reg@unisphere.local', '$2b$10$IgEYE3nrNedKfWPOGx4KJuh.TXs1Jnbj8Wnkx7KxlPTo92V1C/BIO', 'admin', TRUE)
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO users (email, password_hash, role, is_active)
  VALUES ('professor.reg@unisphere.local', '$2b$10$IgEYE3nrNedKfWPOGx4KJuh.TXs1Jnbj8Wnkx7KxlPTo92V1C/BIO', 'professor', TRUE)
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO users (email, password_hash, role, is_active)
  VALUES ('student.reg1@unisphere.local', '$2b$10$IgEYE3nrNedKfWPOGx4KJuh.TXs1Jnbj8Wnkx7KxlPTo92V1C/BIO', 'student', TRUE)
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO users (email, password_hash, role, is_active)
  VALUES ('student.reg2@unisphere.local', '$2b$10$IgEYE3nrNedKfWPOGx4KJuh.TXs1Jnbj8Wnkx7KxlPTo92V1C/BIO', 'student', TRUE)
  ON CONFLICT (email) DO NOTHING;

  SELECT user_id INTO v_admin_user_id FROM users WHERE email = 'admin.reg@unisphere.local' LIMIT 1;
  SELECT user_id INTO v_prof_user_id FROM users WHERE email = 'professor.reg@unisphere.local' LIMIT 1;
  SELECT user_id INTO v_student1_user_id FROM users WHERE email = 'student.reg1@unisphere.local' LIMIT 1;
  SELECT user_id INTO v_student2_user_id FROM users WHERE email = 'student.reg2@unisphere.local' LIMIT 1;

  -- Profiles
  INSERT INTO professors (user_id, department_id)
  VALUES (v_prof_user_id, v_dept_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO students (user_id, department_id)
  VALUES (v_student1_user_id, v_dept_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO students (user_id, department_id)
  VALUES (v_student2_user_id, v_dept_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT professor_id INTO v_professor_id FROM professors WHERE user_id = v_prof_user_id LIMIT 1;
  SELECT student_id INTO v_student1_id FROM students WHERE user_id = v_student1_user_id LIMIT 1;
  SELECT student_id INTO v_student2_id FROM students WHERE user_id = v_student2_user_id LIMIT 1;

  -- Courses (15-credit set + extra classes for testing registration rules)
  INSERT INTO courses (code, name, credits, department_id) VALUES
    ('CSE329', 'Computer Graphics', 3, v_dept_id),
    ('EEC487', 'Mobile and Wireless Communications', 3, v_dept_id),
    ('CSE403', 'New trends in Computer and Communication Engineering', 3, v_dept_id),
    ('EEC486', 'Communication Systems', 3, v_dept_id),
    ('CCE401', 'Senior Project-I', 3, v_dept_id),
    ('CSE470', 'Cloud Computing', 3, v_dept_id),
    ('CSE460', 'Real-Time Systems', 3, v_dept_id),
    ('CSE450', 'Artificial Intelligence', 3, v_dept_id)
  ON CONFLICT (code) DO NOTHING;

  SELECT course_id INTO v_cse329 FROM courses WHERE code = 'CSE329' LIMIT 1;
  SELECT course_id INTO v_eec487 FROM courses WHERE code = 'EEC487' LIMIT 1;
  SELECT course_id INTO v_cse403 FROM courses WHERE code = 'CSE403' LIMIT 1;
  SELECT course_id INTO v_eec486 FROM courses WHERE code = 'EEC486' LIMIT 1;
  SELECT course_id INTO v_cce401 FROM courses WHERE code = 'CCE401' LIMIT 1;
  SELECT course_id INTO v_cse470 FROM courses WHERE code = 'CSE470' LIMIT 1;
  SELECT course_id INTO v_cse460 FROM courses WHERE code = 'CSE460' LIMIT 1;
  SELECT course_id INTO v_cse450 FROM courses WHERE code = 'CSE450' LIMIT 1;

  -- Classes (Spring 2026)
  -- Main registered set (5 courses x 3 credits = 15 hours)
  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_cse329, v_professor_id, 'Spring', 2026, 'A', 50, 'Monday', '10:00', '12:00', 'Lab 301'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE course_id = v_cse329 AND semester = 'Spring' AND year = 2026 AND section = 'A'
  );

  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_eec487, v_professor_id, 'Spring', 2026, 'A', 50, 'Tuesday', '10:00', '12:00', 'Hall B-201'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE course_id = v_eec487 AND semester = 'Spring' AND year = 2026 AND section = 'A'
  );

  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_cse403, v_professor_id, 'Spring', 2026, 'A', 50, 'Wednesday', '10:00', '12:00', 'Hall C-105'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE course_id = v_cse403 AND semester = 'Spring' AND year = 2026 AND section = 'A'
  );

  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_eec486, v_professor_id, 'Spring', 2026, 'A', 50, 'Thursday', '10:00', '12:00', 'Hall B-204'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE course_id = v_eec486 AND semester = 'Spring' AND year = 2026 AND section = 'A'
  );

  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_cce401, v_professor_id, 'Spring', 2026, 'A', 40, 'Sunday', '12:00', '14:00', 'Project Studio'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE course_id = v_cce401 AND semester = 'Spring' AND year = 2026 AND section = 'A'
  );

  -- Open class (registration should succeed)
  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_cse470, v_professor_id, 'Spring', 2026, 'B', 50, 'Wednesday', '15:00', '17:00', 'Lab 205'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE course_id = v_cse470 AND semester = 'Spring' AND year = 2026 AND section = 'B'
  );

  -- Conflict class (same day/time as CSE329 Monday 10:00-12:00)
  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_cse460, v_professor_id, 'Spring', 2026, 'C', 35, 'Monday', '10:30', '12:30', 'Hall D-101'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE course_id = v_cse460 AND semester = 'Spring' AND year = 2026 AND section = 'C'
  );

  -- Full class (capacity 1; already taken by student2)
  INSERT INTO classes (course_id, professor_id, semester, year, section, max_capacity, day, time_start, time_end, location)
  SELECT v_cse450, v_professor_id, 'Spring', 2026, 'F', 1, 'Tuesday', '15:00', '17:00', 'AI Lab'
  WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE course_id = v_cse450 AND semester = 'Spring' AND year = 2026 AND section = 'F'
  );

  SELECT class_id INTO v_cls_cse329 FROM classes WHERE course_id = v_cse329 AND semester = 'Spring' AND year = 2026 AND section = 'A' LIMIT 1;
  SELECT class_id INTO v_cls_eec487 FROM classes WHERE course_id = v_eec487 AND semester = 'Spring' AND year = 2026 AND section = 'A' LIMIT 1;
  SELECT class_id INTO v_cls_cse403 FROM classes WHERE course_id = v_cse403 AND semester = 'Spring' AND year = 2026 AND section = 'A' LIMIT 1;
  SELECT class_id INTO v_cls_eec486 FROM classes WHERE course_id = v_eec486 AND semester = 'Spring' AND year = 2026 AND section = 'A' LIMIT 1;
  SELECT class_id INTO v_cls_cce401 FROM classes WHERE course_id = v_cce401 AND semester = 'Spring' AND year = 2026 AND section = 'A' LIMIT 1;
  SELECT class_id INTO v_cls_cse470 FROM classes WHERE course_id = v_cse470 AND semester = 'Spring' AND year = 2026 AND section = 'B' LIMIT 1;
  SELECT class_id INTO v_cls_cse460 FROM classes WHERE course_id = v_cse460 AND semester = 'Spring' AND year = 2026 AND section = 'C' LIMIT 1;
  SELECT class_id INTO v_cls_cse450 FROM classes WHERE course_id = v_cse450 AND semester = 'Spring' AND year = 2026 AND section = 'F' LIMIT 1;

  -- Student 1 enrolled in 5 core classes (15 credits)
  INSERT INTO enrollments (class_id, student_id) VALUES (v_cls_cse329, v_student1_id) ON CONFLICT (class_id, student_id) DO NOTHING;
  INSERT INTO enrollments (class_id, student_id) VALUES (v_cls_eec487, v_student1_id) ON CONFLICT (class_id, student_id) DO NOTHING;
  INSERT INTO enrollments (class_id, student_id) VALUES (v_cls_cse403, v_student1_id) ON CONFLICT (class_id, student_id) DO NOTHING;
  INSERT INTO enrollments (class_id, student_id) VALUES (v_cls_eec486, v_student1_id) ON CONFLICT (class_id, student_id) DO NOTHING;
  INSERT INTO enrollments (class_id, student_id) VALUES (v_cls_cce401, v_student1_id) ON CONFLICT (class_id, student_id) DO NOTHING;

  -- Student 2 occupies full class seat
  INSERT INTO enrollments (class_id, student_id) VALUES (v_cls_cse450, v_student2_id) ON CONFLICT (class_id, student_id) DO NOTHING;

  -- Transcript requests for student 1
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transcript_requests' AND column_name = 'transcript_type'
  ) THEN
    INSERT INTO transcript_requests (student_id, status, transcript_type, ready_for_collection)
    SELECT v_student1_id, 'approved', 'official', TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM transcript_requests
      WHERE student_id = v_student1_id AND status = 'approved' AND transcript_type = 'official'
    );

    INSERT INTO transcript_requests (student_id, status, transcript_type, ready_for_collection)
    SELECT v_student1_id, 'pending', 'unofficial', FALSE
    WHERE NOT EXISTS (
      SELECT 1 FROM transcript_requests
      WHERE student_id = v_student1_id AND status = 'pending' AND transcript_type = 'unofficial'
    );
  ELSE
    INSERT INTO transcript_requests (student_id, status)
    SELECT v_student1_id, 'approved'
    WHERE NOT EXISTS (
      SELECT 1 FROM transcript_requests
      WHERE student_id = v_student1_id AND status = 'approved'
    );

    INSERT INTO transcript_requests (student_id, status)
    SELECT v_student1_id, 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM transcript_requests
      WHERE student_id = v_student1_id AND status = 'pending'
    );
  END IF;

  -- Fees data for invoice feature (requires migration 005)
  IF to_regclass('public.student_financial_profiles') IS NOT NULL THEN
    INSERT INTO student_financial_profiles (student_id, first_college_year, previous_balance)
    VALUES
      (v_student1_id, 2023, 0),
      (v_student2_id, 2024, 350.50)
    ON CONFLICT (student_id) DO UPDATE
    SET first_college_year = EXCLUDED.first_college_year,
        previous_balance = EXCLUDED.previous_balance;
  END IF;

  -- Registration windows for year-based controlled registration (requires migration 007)
  IF to_regclass('public.registration_windows') IS NOT NULL THEN
    INSERT INTO registration_windows (
      first_college_year, semester, year, opens_at, closes_at, is_active
    )
    VALUES
      (2023, 'Spring', 2026, NOW() - INTERVAL '7 day', NOW() + INTERVAL '14 day', TRUE),
      (2024, 'Spring', 2026, NOW() + INTERVAL '3 day', NOW() + INTERVAL '20 day', TRUE)
    ON CONFLICT (first_college_year, semester, year)
    DO UPDATE SET
      opens_at = EXCLUDED.opens_at,
      closes_at = EXCLUDED.closes_at,
      is_active = EXCLUDED.is_active;
  END IF;

  -- One global announcement and one course announcement
  INSERT INTO announcements (title, body, created_by, is_published)
  SELECT
    'Registration Week Open',
    'Course registration for Spring 2026 is now open.',
    v_admin_user_id,
    TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM announcements WHERE title = 'Registration Week Open'
  );

  INSERT INTO course_announcements (class_id, title, body, created_by, is_published)
  SELECT
    v_cls_cse329,
    'CSE329 Project Groups',
    'Form groups of 3 for the first graphics project.',
    v_prof_user_id,
    TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM course_announcements
    WHERE class_id = v_cls_cse329 AND title = 'CSE329 Project Groups'
  );
END $$;

COMMIT;

-- Quick checks after seed:
-- SELECT u.email, s.student_id FROM users u JOIN students s ON s.user_id=u.user_id WHERE u.email LIKE 'student.reg%';
-- SELECT c.class_id, co.code, c.section, c.day, c.time_start, c.time_end, c.max_capacity FROM classes c JOIN courses co ON co.course_id=c.course_id WHERE c.year=2026 ORDER BY co.code, c.section;
-- SELECT co.code, COUNT(e.enrollment_id) AS enrolled
-- FROM classes c JOIN courses co ON co.course_id=c.course_id LEFT JOIN enrollments e ON e.class_id=c.class_id
-- WHERE c.year=2026 GROUP BY co.code ORDER BY co.code;
