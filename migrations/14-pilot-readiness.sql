-- Only deployment readiness history; no family names, content, or credentials.
-- Retain establishment through temporary funding/account/retention pauses.
CREATE TABLE pilot_activation (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  established_at timestamptz NOT NULL DEFAULT now()
);
