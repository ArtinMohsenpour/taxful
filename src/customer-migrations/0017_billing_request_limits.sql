CREATE TABLE customer_auth.billing_request_limits (
 organization_id text PRIMARY KEY REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 window_started timestamptz NOT NULL DEFAULT now(),
 requests integer NOT NULL DEFAULT 1
);

-- A gift may enhance paid access; it must never reduce a higher purchased plan.
CREATE OR REPLACE FUNCTION customer_auth.effective_billing_plan(org text) RETURNS text LANGUAGE sql STABLE AS $$
 WITH candidates AS (
   SELECT plan_id FROM customer_auth.billing_plan_grants WHERE organization_id=org AND expires_at>now()
   UNION ALL
   SELECT CASE WHEN status IN ('active','trialing') AND current_period_end>now() THEN plan_id
     WHEN status='past_due' AND grace_until>now() THEN plan_id ELSE 'free' END
   FROM customer_auth.billing_subscriptions WHERE organization_id=org
   UNION ALL SELECT 'free'
 ) SELECT plan_id FROM candidates ORDER BY array_position(ARRAY['free','starter','professional','business'],plan_id) DESC LIMIT 1
$$;
