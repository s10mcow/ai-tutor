CREATE TABLE portfolio_entry (
  id text PRIMARY KEY,
  family_id text NOT NULL,
  learner_id text NOT NULL,
  save_fingerprint text NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  evidence jsonb NOT NULL,
  reflection text NOT NULL CHECK (char_length(reflection) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (family_id, learner_id) REFERENCES learner(family_id, id) ON DELETE CASCADE
);
CREATE INDEX portfolio_by_learner ON portfolio_entry (family_id, learner_id, created_at DESC);
