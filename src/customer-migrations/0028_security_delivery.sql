-- Security events and delivery intent commit together; no credentials in the queue.
CREATE TABLE customer_auth.security_notifications (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id bigint NOT NULL UNIQUE REFERENCES customer_auth.security_events(id) ON DELETE CASCADE,
 user_id text NOT NULL REFERENCES customer_auth.customer_users(id) ON DELETE CASCADE,
 recipient text NOT NULL,
 locale text NOT NULL CHECK(locale IN ('de','en')),
 kind text NOT NULL CHECK(kind IN ('security','passwordChanged','passwordReset')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,
 lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz
);
CREATE INDEX security_notifications_pending ON customer_auth.security_notifications(status,available_at);
CREATE FUNCTION customer_auth.queue_security_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO customer_auth.security_notifications(event_id,user_id,recipient,locale,kind)
 SELECT NEW.id,u.id,u.email,CASE WHEN u.locale='en' THEN 'en' ELSE 'de' END,
 CASE WHEN NEW.event IN ('passwordChanged','passwordReset') THEN NEW.event ELSE 'security' END
 FROM customer_auth.customer_users u WHERE u.id=NEW.user_id;
 RETURN NEW;
END $$;
CREATE TRIGGER queue_security_notification AFTER INSERT ON customer_auth.security_events
 FOR EACH ROW EXECUTE FUNCTION customer_auth.queue_security_notification();

CREATE TABLE customer_auth.security_rate_buckets (
 key text PRIMARY KEY, window_started_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL
);
CREATE INDEX security_rate_buckets_expiry ON customer_auth.security_rate_buckets(expires_at);
CREATE TABLE customer_auth.security_worker_health (
 id text PRIMARY KEY, heartbeat_at timestamptz NOT NULL DEFAULT now()
);

-- Password notification intent survives application crashes after the update.
CREATE FUNCTION customer_auth.audit_password_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."providerId"='credential' AND OLD.password IS DISTINCT FROM NEW.password THEN
   INSERT INTO customer_auth.security_events(user_id,event) VALUES(NEW."userId",'passwordChanged');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_password_change AFTER UPDATE OF password ON customer_auth.customer_accounts
 FOR EACH ROW EXECUTE FUNCTION customer_auth.audit_password_change();
