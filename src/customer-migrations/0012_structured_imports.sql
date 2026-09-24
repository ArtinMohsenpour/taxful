ALTER TABLE customer_auth.documents
 ADD COLUMN input_validation jsonb,
 ADD COLUMN saved_customer_id uuid REFERENCES customer_auth.invoice_customers(id) ON DELETE SET NULL;
ALTER TABLE customer_auth.documents DROP CONSTRAINT documents_extraction_method_check;
ALTER TABLE customer_auth.documents ADD CONSTRAINT documents_extraction_method_check
 CHECK(extraction_method IN ('text','vision','text_images','structured_xml','embedded_xml'));
