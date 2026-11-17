-- Billing metadata has no prompts, replies, names, or attachment contents.
-- It outlives temporary activities so ending an activity cannot erase a charge.
CREATE TABLE model_allowance (
  id text PRIMARY KEY,
  policy_identity text NOT NULL,
  allocation_nano_usd bigint NOT NULL CHECK (allocation_nano_usd >= 0),
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE model_operation (
  id text PRIMARY KEY,
  allowance_id text NOT NULL REFERENCES model_allowance(id),
  operation text NOT NULL,
  price_policy text NOT NULL,
  reserved_nano_usd bigint NOT NULL CHECK (reserved_nano_usd > 0),
  measured_nano_usd bigint CHECK (measured_nano_usd >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'settled', 'usage_unknown')),
  provider_request_id text,
  provider_response_id text,
  usage jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX model_operation_allowance ON model_operation(allowance_id);
