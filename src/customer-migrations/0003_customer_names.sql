-- Preserve existing display names. Customers enter structured names in their profile.
ALTER TABLE customer_auth.customer_users ADD COLUMN "firstName" text;
ALTER TABLE customer_auth.customer_users ADD COLUMN "lastName" text;
ALTER TABLE customer_auth.customer_users ADD CONSTRAINT customer_first_name_valid
  CHECK ("firstName" IS NULL OR char_length(btrim("firstName")) BETWEEN 1 AND 75);
ALTER TABLE customer_auth.customer_users ADD CONSTRAINT customer_last_name_valid
  CHECK ("lastName" IS NULL OR char_length(btrim("lastName")) BETWEEN 1 AND 75);
