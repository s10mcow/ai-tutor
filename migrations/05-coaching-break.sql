-- A break is a checkpoint in the expiring activity, never lasting learning memory.
ALTER TABLE learning_session ADD COLUMN break_state jsonb;
-- Async media work can detect an intervening break, even after a resume.
ALTER TABLE learning_session ADD COLUMN break_revision integer NOT NULL DEFAULT 0;
