ALTER TABLE customer_auth.documents ADD COLUMN classification jsonb;
ALTER TABLE customer_auth.documents DROP CONSTRAINT documents_status_check;
ALTER TABLE customer_auth.documents ADD CONSTRAINT documents_status_check CHECK(status IN ('queued','processing','needs_review','approved','failed','rejected','unsupported'));
ALTER TABLE customer_auth.documents DROP CONSTRAINT documents_processing_stage_check;
ALTER TABLE customer_auth.documents ADD CONSTRAINT documents_processing_stage_check CHECK(processing_stage IN ('queued','scanning','reading','classifying','extracting','checking','complete'));
UPDATE customer_auth.documents SET status='unsupported'
 WHERE status='needs_review' AND COALESCE(reviewed_data,extracted_data)->>'documentType' IN ('receipt','tax_notice','other');
