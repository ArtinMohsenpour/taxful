ALTER TABLE customer_auth.documents
 ADD COLUMN processing_stage text NOT NULL DEFAULT 'queued'
 CHECK (processing_stage IN ('queued','scanning','reading','extracting','checking','complete')),
 ADD COLUMN extraction_method text CHECK (extraction_method IN ('text','vision','text_images')),
 ADD COLUMN export_state text NOT NULL DEFAULT 'idle' CHECK (export_state IN ('idle','generating','failed')),
 ADD COLUMN export_started_at timestamptz;
UPDATE customer_auth.documents SET processing_stage=CASE
 WHEN status IN ('needs_review','approved') THEN 'complete'
 WHEN status='processing' THEN 'extracting' ELSE 'queued' END;
CREATE INDEX documents_org_status_created ON customer_auth.documents(organization_id,status,created_at DESC,id DESC);
