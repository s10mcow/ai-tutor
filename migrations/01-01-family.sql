CREATE TABLE family (
  id text PRIMARY KEY,
  owner_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE learner (
  id text PRIMARY KEY,
  family_id text NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, id)
);
CREATE INDEX learner_family ON learner (family_id);
