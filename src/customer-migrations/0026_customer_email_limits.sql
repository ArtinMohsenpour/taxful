-- Atomic, privacy-preserving recipient limits for verification and reset mail.
CREATE TABLE customer_auth.email_delivery_limits (
  recipient_key text PRIMARY KEY,
  hour_started_at timestamptz NOT NULL DEFAULT now(),
  day_started_at timestamptz NOT NULL DEFAULT now(),
  hour_count integer NOT NULL DEFAULT 1 CHECK (hour_count >= 0),
  day_count integer NOT NULL DEFAULT 1 CHECK (day_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_delivery_limits_updated_idx ON customer_auth.email_delivery_limits(updated_at);
