-- =====================================================
-- Admin feature indexing
-- Focused on admin dashboard, user management, course/class
-- administration, exams, transcript processing, and settings.
-- =====================================================

-- Supports admin user lists and common user filters.
CREATE INDEX IF NOT EXISTS idx_users_role_active_user
  ON users(role, is_active, user_id);

-- Supports admin joins between users and professor profiles.
CREATE INDEX IF NOT EXISTS idx_professors_user_id
  ON professors(user_id);

-- Supports dashboard transcript counts and transcript admin lists.
CREATE INDEX IF NOT EXISTS idx_transcript_requests_status_created_at
  ON transcript_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transcript_requests_student_created_at
  ON transcript_requests(student_id, created_at DESC);

-- Supports recent admin message counts.
CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON messages(created_at DESC);

-- Supports class/course admin pages and exam lookups.
CREATE INDEX IF NOT EXISTS idx_classes_course_id
  ON classes(course_id);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_class_exam_date
  ON exam_schedules(class_id, exam_date ASC);

-- Supports course and prerequisite management views.
CREATE INDEX IF NOT EXISTS idx_courses_department_code
  ON courses(department_id, code);

CREATE INDEX IF NOT EXISTS idx_prerequisites_course_required
  ON prerequisites(course_id, required_course_id);

-- Supports admin settings pages.
CREATE INDEX IF NOT EXISTS idx_registration_windows_year_semester_open_year
  ON registration_windows(year DESC, semester, first_college_year);

CREATE INDEX IF NOT EXISTS idx_registration_load_policies_updated_at
  ON registration_load_policies(updated_at DESC);
