# UniSphere - Student Information System

UniSphere is a modern Student Information System designed to centralize academic and administrative workflows for universities. It provides dedicated portals for students, professors, and administrators, with features for course registration, grades, attendance, payments, transcripts, announcements, messaging, scheduling, and academic monitoring.

## Overview

Many academic institutions still depend on manual processes or disconnected systems for managing student records, registration, schedules, grades, and financial services. UniSphere addresses these challenges by providing one integrated platform that improves data accessibility, reduces administrative workload, and supports better academic decision-making.

## Main Features

### Student Portal

- View academic dashboard
- Register for eligible courses
- Drop registered classes
- View grades and GPA
- Track attendance
- View exam schedules
- Submit assignments
- Request transcripts
- View fees and payment status
- Pay fees through Stripe Checkout
- Receive announcements and notifications
- Use the AI chatbot assistant

### Professor Portal

- View assigned classes
- Manage student grades
- Record attendance
- Manage assignments
- Post course announcements
- Generate grade and attendance reports
- Export reports as CSV or PDF
- Communicate with students and administrators

### Admin Portal

- Manage students and professors
- Manage courses, classes, departments, and exams
- Manage course prerequisites
- Manage registration windows and credit-hour policies
- Review transcript requests
- Manage tuition rules and fees
- Publish global announcements
- Monitor academic performance
- Run student risk prediction
- Generate class schedules using a Genetic Algorithm
- Review scheduling conflicts and apply generated timetables

## AI and Advanced Features

- AI chatbot assistant using Google Gemini
- Student risk prediction using an XGBoost model
- Genetic Algorithm-based timetable scheduling
- Academic monitoring and student performance flags
- Redis caching for repeated academic reads
- Stripe payment integration for student fees

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Cache | Redis |
| AI Service | Python Flask |
| Authentication | JWT |
| Payments | Stripe Checkout |
| Reports | PDFKit, json2csv |
| Testing | k6 |
| Containerization | Docker, Docker Compose |
| Deployment | Vercel, Railway, Neon |

## Project Structure

```text
UniSphere/
│
├── ai-service/              # Python Flask service for student risk prediction
├── backend/                 # Node.js and Express.js backend APIs
├── docs/                    # Project documentation
├── frontend/                # React frontend application
│
├── .env.example             # Example environment variables
├── DATABASE_CONTRACT.md     # Database structure documentation
├── docker-compose.yml       # Local service orchestration
├── package.json             # Root package configuration
├── student_risk_pipeline.pkl # Trained student risk prediction model
└── test-features.sh         # Feature testing script
