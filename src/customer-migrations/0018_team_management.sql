ALTER TABLE customer_auth.organization_memberships
 ADD CONSTRAINT team_member_role CHECK(role IN ('owner','admin','reviewer','member'));
ALTER TABLE customer_auth.organization_invitations
 ADD COLUMN delivery_status text NOT NULL DEFAULT 'unknown'
 CHECK(delivery_status IN ('unknown','sending','sent','failed')),
 ADD COLUMN last_sent_at timestamptz;
CREATE TABLE customer_auth.team_audit_events (
 id bigserial PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 actor_id text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL,
 event text NOT NULL,
 target_label text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_audit_org_id ON customer_auth.team_audit_events(organization_id,id DESC);
CREATE TABLE customer_auth.team_request_limits (
 user_id text PRIMARY KEY REFERENCES customer_auth.customer_users(id) ON DELETE CASCADE,
 window_started timestamptz NOT NULL DEFAULT now(),
 requests integer NOT NULL DEFAULT 1
);
CREATE INDEX team_pending_email ON customer_auth.organization_invitations("organizationId",lower(email))
 WHERE status='pending';
