CREATE TABLE customer_auth.document_worker_health (
 id uuid PRIMARY KEY,
 heartbeat_at timestamptz NOT NULL DEFAULT now(),
 scanner_ready boolean NOT NULL DEFAULT false
);
CREATE INDEX document_worker_health_heartbeat ON customer_auth.document_worker_health(heartbeat_at);
