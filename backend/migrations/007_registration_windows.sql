CREATE TABLE IF NOT EXISTS registration_windows (
  window_id SERIAL PRIMARY KEY,
  first_college_year INT NOT NULL CHECK (first_college_year BETWEEN 2000 AND 2100),
  semester VARCHAR(20) NOT NULL,
  year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  opens_at TIMESTAMP NOT NULL,
  closes_at TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (opens_at < closes_at),
  UNIQUE (first_college_year, semester, year)
);

CREATE INDEX IF NOT EXISTS idx_registration_windows_lookup
  ON registration_windows (first_college_year, year, semester, is_active);

