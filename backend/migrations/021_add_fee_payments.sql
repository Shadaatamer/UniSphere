CREATE TABLE IF NOT EXISTS fee_payments (
  payment_id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'egp',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id
ON fee_payments(student_id);

CREATE INDEX IF NOT EXISTS idx_fee_payments_status
ON fee_payments(status);

CREATE INDEX IF NOT EXISTS idx_fee_payments_created_at
ON fee_payments(created_at);