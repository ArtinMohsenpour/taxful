-- Provisional development entitlements. Prices are owned by Stripe, never by the browser.
CREATE TABLE customer_auth.billing_plans (
 id text PRIMARY KEY CHECK(id IN ('free','starter','professional','business')),
 monthly_documents integer NOT NULL CHECK(monthly_documents>0),
 daily_uploads integer NOT NULL CHECK(daily_uploads>0),
 batch_uploads integer NOT NULL CHECK(batch_uploads BETWEEN 1 AND 5),
 team_members integer NOT NULL CHECK(team_members BETWEEN 1 AND 100),
 storage_bytes bigint NOT NULL CHECK(storage_bytes>0),
 monthly_price_cents integer NOT NULL DEFAULT 0 CHECK(monthly_price_cents>=0),
 stripe_price_id text UNIQUE,
 stripe_product_id text,
 revision integer NOT NULL DEFAULT 1,
 published boolean NOT NULL DEFAULT false
);
INSERT INTO customer_auth.billing_plans(id,monthly_documents,daily_uploads,batch_uploads,team_members,storage_bytes) VALUES
 ('free',10,5,1,1,262144000),
 ('starter',100,25,1,2,2147483648),
 ('professional',500,100,5,10,10737418240),
 ('business',2000,500,5,30,53687091200);
CREATE TABLE customer_auth.billing_customers (
 organization_id text PRIMARY KEY REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 provider_customer_id text UNIQUE,
 checkout_id text,
 checkout_plan text,
 checkout_url text,
 checkout_expires_at timestamptz,
 operation_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customer_auth.billing_subscriptions (
 organization_id text PRIMARY KEY REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 provider_subscription_id text UNIQUE,
 plan_id text NOT NULL DEFAULT 'free' REFERENCES customer_auth.billing_plans(id),
 status text NOT NULL DEFAULT 'free' CHECK(status IN ('free','active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
 current_period_end timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 grace_until timestamptz,
 synced_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customer_auth.billing_plan_grants (
 organization_id text PRIMARY KEY REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 plan_id text NOT NULL REFERENCES customer_auth.billing_plans(id),
 expires_at timestamptz NOT NULL,
 reason text NOT NULL,
 staff_id text NOT NULL
);
CREATE TABLE customer_auth.billing_discounts (
 id uuid PRIMARY KEY,
 code text NOT NULL UNIQUE,
 percent_off integer NOT NULL CHECK(percent_off BETWEEN 1 AND 100),
 max_redemptions integer NOT NULL CHECK(max_redemptions>0),
 expires_at timestamptz NOT NULL,
 provider_promotion_id text UNIQUE,
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE customer_auth.billing_price_history (
 stripe_price_id text PRIMARY KEY,
 plan_id text NOT NULL REFERENCES customer_auth.billing_plans(id),
 monthly_price_cents integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customer_auth.billing_staff_audit (
 id bigserial PRIMARY KEY, staff_id text NOT NULL, action text NOT NULL,
 target_id text NOT NULL, reason text NOT NULL, details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customer_auth.customer_users ADD COLUMN suspended boolean NOT NULL DEFAULT false;
CREATE TABLE customer_auth.billing_invoices (
 provider_invoice_id text PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 number text,
 status text NOT NULL,
 currency text NOT NULL,
 total bigint NOT NULL,
 amount_paid bigint NOT NULL,
 hosted_url text,
 pdf_url text,
 issued_at timestamptz NOT NULL
);
CREATE INDEX billing_invoices_org_date ON customer_auth.billing_invoices(organization_id,issued_at DESC);
CREATE TABLE customer_auth.billing_webhook_events (
 provider_event_id text PRIMARY KEY,
 event_type text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customer_auth.billing_audit_events (
 id bigserial PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 actor_id text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL,
 event text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_audit_org_date ON customer_auth.billing_audit_events(organization_id,created_at DESC);
-- Deliberately no FK to documents: deletion must not refund processed-document usage.
CREATE TABLE customer_auth.billing_usage_ledger (
 id bigserial PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 operation_key text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('document','upload','export')),
 quantity integer NOT NULL CHECK(quantity>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,kind,operation_key)
);
CREATE INDEX billing_usage_org_date ON customer_auth.billing_usage_ledger(organization_id,kind,created_at);
-- Backfill existing documents, including manual drafts. Historical deletions cannot be reconstructed.
INSERT INTO customer_auth.billing_usage_ledger(organization_id,operation_key,kind,quantity,created_at)
 SELECT organization_id,'legacy:'||id,'document',1,created_at FROM customer_auth.documents;
INSERT INTO customer_auth.billing_usage_ledger(organization_id,operation_key,kind,quantity,created_at)
 SELECT organization_id,'legacy:'||id,'upload',1,created_at FROM customer_auth.documents WHERE source_kind='upload';
ALTER TABLE customer_auth.document_exports ADD COLUMN size_bytes bigint NOT NULL DEFAULT 0 CHECK(size_bytes>=0);

CREATE FUNCTION customer_auth.effective_billing_plan(org text) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT COALESCE((SELECT plan_id FROM customer_auth.billing_plan_grants WHERE organization_id=org AND expires_at>now()),(SELECT CASE
 WHEN status IN ('active','trialing') AND current_period_end>now() THEN plan_id
 WHEN status='past_due' AND grace_until>now() THEN plan_id
 ELSE 'free' END FROM customer_auth.billing_subscriptions WHERE organization_id=org),'free')
$$;

-- Serialize seat creation inside the DB as auth hooks alone cannot prevent concurrent invites.
CREATE FUNCTION customer_auth.enforce_billing_seats() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org text; maximum integer; occupied integer; target_email text;
BEGIN
 org := NEW."organizationId";
 IF TG_TABLE_NAME='organization_invitations' THEN
   IF NEW.status<>'pending' OR NEW."expiresAt"<=now() THEN RETURN NEW; END IF;
   IF TG_OP='UPDATE' AND OLD.status='pending' AND OLD."expiresAt">now() AND OLD."organizationId"=org THEN RETURN NEW; END IF;
   target_email := lower(NEW.email);
 ELSE
   SELECT lower(email) INTO target_email FROM customer_auth.customer_users WHERE id=NEW."userId";
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('billing:'||org));
 SELECT team_members INTO maximum FROM customer_auth.billing_plans WHERE id=customer_auth.effective_billing_plan(org);
 SELECT count(*) INTO occupied FROM (
   SELECT lower(u.email) AS email FROM customer_auth.organization_memberships m
   JOIN customer_auth.customer_users u ON u.id=m."userId" WHERE m."organizationId"=org
   UNION
   SELECT lower(email) FROM customer_auth.organization_invitations
   WHERE "organizationId"=org AND status='pending' AND "expiresAt">now()
 ) seats WHERE email<>target_email;
 IF occupied>=maximum THEN RAISE EXCEPTION 'teamLimit' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER billing_invitation_limit BEFORE INSERT OR UPDATE ON customer_auth.organization_invitations
 FOR EACH ROW EXECUTE FUNCTION customer_auth.enforce_billing_seats();
CREATE TRIGGER billing_member_limit BEFORE INSERT ON customer_auth.organization_memberships
 FOR EACH ROW EXECUTE FUNCTION customer_auth.enforce_billing_seats();
