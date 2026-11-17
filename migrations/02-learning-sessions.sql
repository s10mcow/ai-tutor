CREATE TABLE learning_session (
  id text PRIMARY KEY,
  family_id text NOT NULL,
  learner_id text NOT NULL,
  problem text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE (family_id, learner_id),
  FOREIGN KEY (family_id, learner_id) REFERENCES learner(family_id, id) ON DELETE CASCADE
);
CREATE INDEX learning_session_expiry ON learning_session (expires_at);
CREATE TABLE learning_action (
  session_id text NOT NULL REFERENCES learning_session(id) ON DELETE CASCADE,
  id text NOT NULL,
  sequence integer NOT NULL,
  intent text NOT NULL,
  text text NOT NULL,
  reply text,
  status text NOT NULL CHECK (status IN ('pending', 'complete', 'failed')),
  attempt_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, id),
  UNIQUE (session_id, sequence)
);
