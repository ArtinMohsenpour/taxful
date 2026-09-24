-- Keep existing files explicitly unclassified; never guess who issued an old upload.
ALTER TABLE customer_auth.documents
 ADD COLUMN workflow text NOT NULL DEFAULT 'unclassified' CHECK(workflow IN ('unclassified','outgoing','incoming')),
 ADD COLUMN source_kind text NOT NULL DEFAULT 'upload' CHECK(source_kind IN ('upload','manual')),
 ADD COLUMN invoice_state text NOT NULL DEFAULT 'draft' CHECK(invoice_state IN ('draft','issued','sent','paid')),
 ADD COLUMN issued_at timestamptz,
 ADD COLUMN sent_at timestamptz,
 ADD COLUMN paid_at timestamptz;
ALTER TABLE customer_auth.documents ALTER COLUMN batch_id DROP NOT NULL;
ALTER TABLE customer_auth.documents ALTER COLUMN mime_type DROP NOT NULL;
ALTER TABLE customer_auth.documents ALTER COLUMN size_bytes DROP NOT NULL;
ALTER TABLE customer_auth.documents ALTER COLUMN source_sha256 DROP NOT NULL;
ALTER TABLE customer_auth.documents ADD CONSTRAINT document_source_shape CHECK(
 (source_kind='upload' AND batch_id IS NOT NULL AND mime_type IS NOT NULL AND size_bytes IS NOT NULL AND source_sha256 IS NOT NULL)
 OR (source_kind='manual' AND workflow='outgoing' AND batch_id IS NULL AND mime_type IS NULL AND size_bytes IS NULL AND source_sha256 IS NULL)
);
CREATE INDEX documents_workflow_created ON customer_auth.documents(organization_id,workflow,created_at DESC);

CREATE TABLE customer_auth.invoice_customers (
 id uuid PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 revision integer NOT NULL DEFAULT 1,
 archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id)
);
CREATE INDEX invoice_customers_org ON customer_auth.invoice_customers(organization_id,archived,updated_at DESC);
CREATE TABLE customer_auth.invoice_products (
 id uuid PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 revision integer NOT NULL DEFAULT 1,
 archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id)
);
CREATE INDEX invoice_products_org ON customer_auth.invoice_products(organization_id,archived,updated_at DESC);
CREATE TABLE customer_auth.invoice_sequences (
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 year integer NOT NULL, next_value integer NOT NULL DEFAULT 1 CHECK(next_value>0),
 PRIMARY KEY(organization_id,year)
);
-- Reserved numbers survive draft deletion and cannot be reused.
CREATE TABLE customer_auth.invoice_numbers (
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 number text NOT NULL,
 document_id uuid UNIQUE REFERENCES customer_auth.documents(id) ON DELETE SET NULL,
 reserved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,number)
);
CREATE TABLE customer_auth.invoice_draft_requests (
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 request_key uuid NOT NULL, fingerprint text NOT NULL,
 document_id uuid REFERENCES customer_auth.documents(id) ON DELETE SET NULL,
 PRIMARY KEY(organization_id,request_key)
);
