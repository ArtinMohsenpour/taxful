CREATE TABLE customer_auth.invoice_email_logos (
 id uuid PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 sha256 text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_email_logos_company ON customer_auth.invoice_email_logos(organization_id);
CREATE FUNCTION customer_auth.cleanup_invoice_email_logo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO customer_auth.document_deletions(id,artifacts)
 VALUES(OLD.id,jsonb_build_array(jsonb_build_object('id',OLD.id,'kind','source'))) ON CONFLICT DO NOTHING;
 RETURN OLD;
END $$;
CREATE TRIGGER invoice_email_logo_cleanup AFTER DELETE ON customer_auth.invoice_email_logos
 FOR EACH ROW EXECUTE FUNCTION customer_auth.cleanup_invoice_email_logo();
CREATE TABLE customer_auth.invoice_email_templates (
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 locale text NOT NULL CHECK(locale IN ('de','en')),
 subject text NOT NULL, body text NOT NULL, html text NOT NULL,
 logo_id uuid REFERENCES customer_auth.invoice_email_logos(id),
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,locale)
);
ALTER TABLE customer_auth.invoice_deliveries
 ADD COLUMN html text NOT NULL DEFAULT '',
 ADD COLUMN logo_id uuid REFERENCES customer_auth.invoice_email_logos(id),
 ADD COLUMN logo_sha256 text,
 ADD COLUMN message_sha256 text,
 ADD COLUMN confirmations jsonb NOT NULL DEFAULT '{}';
ALTER TABLE customer_auth.invoice_delivery_events
 ADD COLUMN source text NOT NULL DEFAULT 'local',
 ADD COLUMN event_key uuid,
 ADD COLUMN actor_id text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX invoice_delivery_event_key ON customer_auth.invoice_delivery_events(delivery_id,event_key) WHERE event_key IS NOT NULL;
