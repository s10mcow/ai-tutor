-- Game context is temporary and is deleted with its owned learning session.
ALTER TABLE learning_session ADD COLUMN game jsonb;
