CREATE TABLE customer_auth.security_signals (
 event text NOT NULL,
 hour timestamptz NOT NULL DEFAULT date_trunc('hour',now()),
 count bigint NOT NULL DEFAULT 1,
 PRIMARY KEY(event,hour)
);
-- Recovery material and its notification commit together, including a process
-- crash before Better Auth's after hook. Detailed after-hook audit events remain.
CREATE FUNCTION customer_auth.audit_recovery_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.verified AND OLD."backupCodes" IS DISTINCT FROM NEW."backupCodes" THEN
  INSERT INTO customer_auth.security_events(user_id,event) VALUES(NEW."userId",'recoveryCodesChanged');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_recovery_change AFTER UPDATE OF "backupCodes" ON customer_auth.customer_two_factors
 FOR EACH ROW EXECUTE FUNCTION customer_auth.audit_recovery_change();
CREATE OR REPLACE FUNCTION customer_auth.queue_security_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.event IN ('recoveryUsed','recoveryRegenerated') THEN RETURN NEW; END IF;
 INSERT INTO customer_auth.security_notifications(event_id,user_id,recipient,locale,kind)
 SELECT NEW.id,u.id,u.email,CASE WHEN u.locale='en' THEN 'en' ELSE 'de' END,
 CASE WHEN NEW.event IN ('passwordChanged','passwordReset') THEN NEW.event ELSE 'security' END
 FROM customer_auth.customer_users u WHERE u.id=NEW.user_id;
 RETURN NEW;
END $$;
