# UniSphere Database Contract

## Purpose
This document defines the current SQL schema contract used by backend and frontend code, plus safe rules for cleanup and bulk seeding.

## Migration Rule
Do not edit old migration files that may already be applied in teammate environments.  
Any cleanup or refactor must be done in a new forward migration.

## Active Tables
These tables are part of the current app flow and should be treated as active.

1. `departments`
2. `users`
3. `students`
4. `professors`
5. `courses`
6. `classes`
7. `enrollments`
8. `grades`
9. `attendance`
10. `announcements`
11. `course_announcements`
12. `exam_schedules`
13. `transcript_requests` (if dashboard features are enabled)
14. `messages` (if dashboard features are enabled)

## Key Relationship Contract
1. `classes.professor_id` references `professors.professor_id`.
2. `grades` is consumed through `enrollment_id` joins.
3. `attendance` is consumed through `enrollment_id` joins.
4. `announcements` is global/admin announcements.
5. `course_announcements` is class-specific professor announcements.

## Required Column Note
`classes.year` must exist in aligned environments.  
Run migration: `backend/migrations/003_add_classes_year.sql`.

## Legacy Candidate Tables
These are legacy candidates and should only be dropped in a new migration after team confirmation.

1. `attendance_sessions`
2. `attendance_records`
3. Any old grade path relying on `grades.class_id + grades.student_id` as the primary reporting path

## Bulk Insert / Seed Order
Use this order to avoid foreign key violations when inserting large data sets.

1. `departments`
2. `users`
3. `students`, `professors`
4. `courses`
5. `classes`
6. `enrollments`
7. `grades`, `attendance`
8. `announcements`, `course_announcements`
9. `exam_schedules`

## Team Alignment Checklist
1. Pull latest backend and frontend code.
2. Run `003_add_classes_year.sql`.
3. Verify reports/grades/attendance are using enrollment-based schema joins.
4. Do not drop legacy tables until all teammates confirm no dependency.
