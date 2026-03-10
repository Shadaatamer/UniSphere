ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Backfill empty names from email local-part for better display than full email.
UPDATE users
SET full_name = INITCAP(
  REGEXP_REPLACE(
    REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '),
    '[-]+',
    ' ',
    'g'
  )
)
WHERE full_name IS NULL OR BTRIM(full_name) = '';

