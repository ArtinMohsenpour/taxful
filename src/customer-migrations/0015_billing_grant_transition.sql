-- Preserve when a grant was issued so a paid conversion cannot retain an older trial.
ALTER TABLE customer_auth.billing_plan_grants ADD COLUMN created_at timestamptz;
UPDATE customer_auth.billing_plan_grants g SET created_at=COALESCE(
  (SELECT max(a.created_at) FROM customer_auth.billing_staff_audit a
   WHERE a.target_id=g.organization_id AND a.action='grant'),
  '1970-01-01'::timestamptz
);
ALTER TABLE customer_auth.billing_plan_grants ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE customer_auth.billing_plan_grants ALTER COLUMN created_at SET DEFAULT now();
