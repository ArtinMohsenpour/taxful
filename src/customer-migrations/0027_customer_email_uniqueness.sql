-- Enforce the identity provider's case-insensitive email identity at the database
-- boundary as well. Conflicting legacy identities must be reviewed, never merged.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM customer_auth.customer_users GROUP BY lower(email) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Case-insensitive customer email conflicts require manual review';
  END IF;
END $$;

CREATE UNIQUE INDEX customer_users_email_case_insensitive_unique
  ON customer_auth.customer_users (lower(email));
