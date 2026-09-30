CREATE TABLE customer_auth.invoice_email_settings (
 organization_id text PRIMARY KEY REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 sender text NOT NULL, sender_name text NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 mode text NOT NULL CHECK(mode = 'mailpit'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customer_auth.invoice_deliveries (
 id uuid PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 document_id uuid NOT NULL REFERENCES customer_auth.documents(id) ON DELETE CASCADE,
 export_id uuid NOT NULL REFERENCES customer_auth.document_exports(id),
 revision integer NOT NULL, attachment_sha256 text NOT NULL,
 request_key uuid NOT NULL, fingerprint text NOT NULL,
 sender text NOT NULL, sender_name text NOT NULL, recipient text NOT NULL,
 subject text NOT NULL, body text NOT NULL, locale text NOT NULL CHECK(locale IN ('de','en')),
 mode text NOT NULL CHECK(mode = 'mailpit'),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','accepted','failed','unknown','cancelled')),
 created_by text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL,
 provider_id text, error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,request_key)
);
CREATE INDEX invoice_deliveries_document ON customer_auth.invoice_deliveries(organization_id,document_id,created_at DESC);
CREATE INDEX invoice_deliveries_queue ON customer_auth.invoice_deliveries(created_at) WHERE status='queued';
CREATE INDEX invoice_deliveries_limits ON customer_auth.invoice_deliveries(organization_id,created_at);
CREATE TABLE customer_auth.invoice_delivery_events (
 id bigserial PRIMARY KEY,
 delivery_id uuid NOT NULL REFERENCES customer_auth.invoice_deliveries(id) ON DELETE CASCADE,
 status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
