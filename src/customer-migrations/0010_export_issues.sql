ALTER TABLE customer_auth.documents ADD COLUMN export_issues jsonb NOT NULL DEFAULT '[]';
