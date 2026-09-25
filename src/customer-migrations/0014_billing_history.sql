-- Preserve usage previously charged for now-deleted documents. The legacy daily counter
-- mixed uploads and manual drafts, so only the document allowance can be reconstructed exactly.
INSERT INTO customer_auth.billing_usage_ledger(organization_id,operation_key,kind,quantity,created_at)
 SELECT u.organization_id,'legacy-deleted:'||u.usage_day,'document',
   u.used-count(d.id)::integer,(u.usage_day+time '12:00') AT TIME ZONE 'Europe/Berlin'
 FROM customer_auth.document_usage u LEFT JOIN customer_auth.documents d
 ON d.organization_id=u.organization_id AND (d.created_at AT TIME ZONE 'Europe/Berlin')::date=u.usage_day
 GROUP BY u.organization_id,u.usage_day,u.used HAVING u.used>count(d.id);
INSERT INTO customer_auth.billing_usage_ledger(organization_id,operation_key,kind,quantity,created_at)
 SELECT d.organization_id,d.id::text,'export',1,min(e.created_at)
 FROM customer_auth.document_exports e JOIN customer_auth.documents d ON d.id=e.document_id
 GROUP BY d.organization_id,d.id ON CONFLICT DO NOTHING;
