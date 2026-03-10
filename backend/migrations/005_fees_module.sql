CREATE TABLE IF NOT EXISTS tuition_rules (
  rule_id SERIAL PRIMARY KEY,
  first_college_year INT NOT NULL UNIQUE CHECK (first_college_year BETWEEN 2000 AND 2100),
  credit_hour_price NUMERIC(12,2) NOT NULL CHECK (credit_hour_price > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_financial_profiles (
  student_id INT PRIMARY KEY REFERENCES students(student_id) ON DELETE CASCADE,
  first_college_year INT NOT NULL CHECK (first_college_year BETWEEN 2000 AND 2100),
  previous_balance NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fee_components (
  component_key VARCHAR(50) PRIMARY KEY,
  label TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO tuition_rules (first_college_year, credit_hour_price)
VALUES
  (2022, 1200.00),
  (2023, 1269.00),
  (2024, 1320.00),
  (2025, 1380.00)
ON CONFLICT (first_college_year) DO NOTHING;

INSERT INTO fee_components (component_key, label, amount, is_active)
VALUES
  ('esystem', 'e.System Fees', 100.00, TRUE),
  ('university_services', 'University Services', 951.75, TRUE),
  ('administrative', 'Administrative Fees', 1000.00, TRUE)
ON CONFLICT (component_key) DO UPDATE
SET label = EXCLUDED.label,
    amount = EXCLUDED.amount,
    is_active = EXCLUDED.is_active;

