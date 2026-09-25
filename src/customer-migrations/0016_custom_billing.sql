-- Immutable provider-operation intent survives a lost response or local rollback.
CREATE TABLE customer_auth.billing_operations (
 id uuid PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 actor_id text NOT NULL,
 kind text NOT NULL,
 input jsonb NOT NULL,
 result jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_operations_org_date ON customer_auth.billing_operations(organization_id,created_at DESC);
CREATE TABLE customer_auth.billing_change_quotes (
 id uuid PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 actor_id text NOT NULL,
 data jsonb NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
