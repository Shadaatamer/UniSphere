-- Courses
CREATE TABLE IF NOT EXISTS courses (
    course_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    department_id INT REFERENCES departments(department_id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
    class_id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
    semester VARCHAR(10),
    year INT,
    professor_id INT REFERENCES professors(user_id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Exam schedules
CREATE TABLE IF NOT EXISTS exam_schedules (
    exam_id SERIAL PRIMARY KEY,
    class_id INT REFERENCES classes(class_id) ON DELETE CASCADE,
    exam_type VARCHAR(20) NOT NULL,
    exam_date TIMESTAMP NOT NULL
);

-- Transcript requests
CREATE TABLE IF NOT EXISTS transcript_requests (
    request_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Messages 
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(user_id),
    receiver_id INT REFERENCES users(user_id),
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE courses ADD COLUMN credit_hours INT DEFAULT 3;

ALTER TABLE exam_schedules
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN location VARCHAR(255);
