-- A break is a checkpoint in the expiring activity, never lasting learning memory.
ALTER TABLE learning_session ADD COLUMN break_state jsonb;
