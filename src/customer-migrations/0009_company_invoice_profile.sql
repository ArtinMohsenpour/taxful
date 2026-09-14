CREATE TABLE customer_auth.company_invoice_profiles (
 organization_id text PRIMARY KEY REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 data jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 updated_by text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
