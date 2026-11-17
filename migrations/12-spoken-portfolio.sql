ALTER TABLE portfolio_entry ADD COLUMN audio jsonb;
CREATE TABLE portfolio_audio (
  entry_id text PRIMARY KEY REFERENCES portfolio_entry(id) ON DELETE CASCADE,
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 8044 AND 1920044)
);
