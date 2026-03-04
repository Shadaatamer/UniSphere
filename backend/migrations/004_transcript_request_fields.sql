ALTER TABLE transcript_requests
ADD COLUMN IF NOT EXISTS transcript_type VARCHAR(30) NOT NULL DEFAULT 'official';

ALTER TABLE transcript_requests
ADD COLUMN IF NOT EXISTS ready_for_collection BOOLEAN NOT NULL DEFAULT FALSE;

