CREATE TABLE customer_auth.login_attempts (
 identity_hash text PRIMARY KEY CHECK(length(identity_hash)=64),
 failure_count integer NOT NULL DEFAULT 0 CHECK(failure_count>=0),
 first_failed_at timestamptz NOT NULL DEFAULT now(),
 last_failed_at timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz
);
CREATE INDEX login_attempts_cleanup ON customer_auth.login_attempts(last_failed_at);

