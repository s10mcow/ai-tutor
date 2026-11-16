CREATE TABLE family_session_selection (
  session_id text PRIMARY KEY REFERENCES "session"(id) ON DELETE CASCADE,
  family_id text NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  learner_id text NOT NULL,
  FOREIGN KEY (family_id, learner_id) REFERENCES learner(family_id, id) ON DELETE CASCADE
);
