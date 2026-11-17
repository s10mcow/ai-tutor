-- Only selected normalized pictures belong here. No relationship to the
-- temporary activity: entry and bytes commit together and survive its cleanup.
ALTER TABLE portfolio_entry ADD COLUMN images jsonb NOT NULL DEFAULT '[]';
CREATE TABLE portfolio_image (
  entry_id text NOT NULL REFERENCES portfolio_entry(id) ON DELETE CASCADE,
  id text NOT NULL,
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 3000000),
  PRIMARY KEY (entry_id, id)
);
