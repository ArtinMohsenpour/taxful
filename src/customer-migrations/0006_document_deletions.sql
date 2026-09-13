CREATE TABLE customer_auth.document_deletions (
 id uuid PRIMARY KEY,
 artifacts jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_attempt_at timestamptz,
 attempts integer NOT NULL DEFAULT 0
);
