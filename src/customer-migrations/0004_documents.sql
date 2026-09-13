CREATE TABLE customer_auth.document_entitlements (
 organization_id text PRIMARY KEY REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 daily_limit integer NOT NULL CHECK(daily_limit BETWEEN 1 AND 10000),
 batch_limit integer NOT NULL DEFAULT 1 CHECK(batch_limit BETWEEN 1 AND 5)
);
CREATE TABLE customer_auth.document_usage (
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 usage_day date NOT NULL, used integer NOT NULL DEFAULT 0 CHECK(used >= 0),
 PRIMARY KEY(organization_id, usage_day)
);
CREATE TABLE customer_auth.document_batches (
 id uuid PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 request_key uuid NOT NULL, fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id, request_key)
);
CREATE TABLE customer_auth.documents (
 id uuid PRIMARY KEY,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 batch_id uuid NOT NULL REFERENCES customer_auth.document_batches(id),
 uploaded_by text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL,
 original_name text NOT NULL, mime_type text NOT NULL,
 size_bytes integer NOT NULL CHECK(size_bytes > 0),
 source_sha256 text NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','needs_review','approved','failed','rejected')),
 attempts integer NOT NULL DEFAULT 0,
 lease_token uuid, started_at timestamptz,
 error_code text,
 source_text text, page_count integer,
 extracted_data jsonb, evidence jsonb, extraction_warnings jsonb,
 reviewed_data jsonb, revision integer NOT NULL DEFAULT 0,
 model text, prompt_version text,
 scanned_at timestamptz,
 approved_by text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL,
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_org_created ON customer_auth.documents(organization_id, created_at DESC);
CREATE INDEX documents_queue ON customer_auth.documents(created_at) WHERE status = 'queued';
CREATE TABLE customer_auth.document_reviews (
 id uuid PRIMARY KEY, document_id uuid NOT NULL REFERENCES customer_auth.documents(id) ON DELETE CASCADE,
 revision integer NOT NULL, data jsonb NOT NULL,
 reviewed_by text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL,
 approved boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(document_id, revision)
);
CREATE TABLE customer_auth.document_exports (
 id uuid PRIMARY KEY, document_id uuid NOT NULL REFERENCES customer_auth.documents(id) ON DELETE CASCADE,
 revision integer NOT NULL, format text NOT NULL, sha256 text NOT NULL,
 validation_report jsonb NOT NULL,
 created_by text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(document_id, revision, format)
);
CREATE TABLE customer_auth.document_events (
 id bigserial PRIMARY KEY,
 document_id uuid REFERENCES customer_auth.documents(id) ON DELETE CASCADE,
 organization_id text NOT NULL REFERENCES customer_auth.organizations(id) ON DELETE CASCADE,
 actor_id text REFERENCES customer_auth.customer_users(id) ON DELETE SET NULL,
 event text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX document_events_document ON customer_auth.document_events(document_id, created_at);
