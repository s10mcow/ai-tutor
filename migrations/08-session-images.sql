-- Unsaved raster bytes live only as long as their owning activity.
CREATE TABLE session_image (
  id text PRIMARY KEY,
  session_id text NOT NULL UNIQUE REFERENCES learning_session(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('workbook','art')),
  upload_hash text NOT NULL,
  bytes bytea NOT NULL CHECK (octet_length(bytes) <= 3000000),
  width integer NOT NULL,
  height integer NOT NULL,
  status text NOT NULL CHECK (status IN ('uploaded','pending','interpreted','unreadable','failed','confirmed')),
  interpretation text,
  confirmed_description text,
  attempt_id text,
  started_at timestamptz
);
