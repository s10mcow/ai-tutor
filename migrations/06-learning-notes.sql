CREATE TABLE learning_notes (
  family_id text NOT NULL,
  learner_id text NOT NULL,
  interest text NOT NULL CHECK (char_length(interest) <= 240),
  helpful_approach text NOT NULL CHECK (char_length(helpful_approach) <= 240),
  next_step text NOT NULL CHECK (char_length(next_step) <= 240),
  PRIMARY KEY (family_id, learner_id),
  FOREIGN KEY (family_id, learner_id) REFERENCES learner(family_id, id) ON DELETE CASCADE
);
