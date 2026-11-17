-- Keep actionable context-limit guidance across reloads without storing provider errors.
ALTER TABLE learning_action ADD COLUMN failure_reason text
  CHECK (failure_reason IN ('context_limit'));
