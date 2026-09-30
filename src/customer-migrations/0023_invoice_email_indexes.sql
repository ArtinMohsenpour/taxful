CREATE INDEX invoice_delivery_events_delivery ON customer_auth.invoice_delivery_events(delivery_id,id);
CREATE INDEX invoice_deliveries_stalled ON customer_auth.invoice_deliveries(updated_at) WHERE status='sending';
