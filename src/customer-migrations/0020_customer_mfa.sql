ALTER TABLE customer_auth.customer_users ADD COLUMN "twoFactorEnabled" boolean NOT NULL DEFAULT false;
ALTER TABLE customer_auth.customer_sessions ADD COLUMN "securityVerifiedAt" timestamptz;

CREATE TABLE customer_auth.customer_two_factors (
 id text PRIMARY KEY,
 "userId" text NOT NULL UNIQUE REFERENCES customer_auth.customer_users(id) ON DELETE CASCADE,
 secret text NOT NULL,
 "backupCodes" text NOT NULL,
 verified boolean NOT NULL DEFAULT false,
 "failedVerificationCount" integer NOT NULL DEFAULT 0,
 "lockedUntil" timestamptz
);
CREATE TABLE customer_auth.customer_passkeys (
 id text PRIMARY KEY,
 name text CHECK (length(name) <= 100),
 "publicKey" text NOT NULL,
 "userId" text NOT NULL REFERENCES customer_auth.customer_users(id) ON DELETE CASCADE,
 "credentialID" text NOT NULL UNIQUE,
 counter bigint NOT NULL,
 "deviceType" text NOT NULL,
 "backedUp" boolean NOT NULL,
 transports text,
 "createdAt" timestamptz NOT NULL DEFAULT now(),
 aaguid text
);
CREATE INDEX customer_passkeys_user ON customer_auth.customer_passkeys("userId");
CREATE TABLE customer_auth.security_events (
 id bigserial PRIMARY KEY,
 user_id text NOT NULL REFERENCES customer_auth.customer_users(id) ON DELETE CASCADE,
 event text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX security_events_user ON customer_auth.security_events(user_id,id DESC);
CREATE TABLE customer_auth.mfa_attempts (
 user_id text PRIMARY KEY REFERENCES customer_auth.customer_users(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 1
);
CREATE TABLE customer_auth.used_totp_codes (
 user_id text NOT NULL REFERENCES customer_auth.customer_users(id) ON DELETE CASCADE,
 digest text NOT NULL,
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(user_id,digest)
);

-- Invalidate old sessions atomically with enrollment/disable, even across processes.
CREATE FUNCTION customer_auth.audit_mfa_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."twoFactorEnabled" IS DISTINCT FROM NEW."twoFactorEnabled" THEN
   IF NOT NEW."twoFactorEnabled" AND EXISTS(SELECT 1 FROM customer_auth.customer_passkeys WHERE "userId"=NEW.id) THEN
     RAISE EXCEPTION 'Remove passkeys before disabling MFA';
   END IF;
   DELETE FROM customer_auth.customer_sessions WHERE "userId"=NEW.id;
   DELETE FROM customer_auth.customer_verifications WHERE value=NEW.id AND
     (identifier LIKE '2fa-%' OR identifier LIKE 'trust-device-%');
   INSERT INTO customer_auth.security_events(user_id,event)
     VALUES(NEW.id,CASE WHEN NEW."twoFactorEnabled" THEN 'mfaEnabled' ELSE 'mfaDisabled' END);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_mfa_change BEFORE UPDATE OF "twoFactorEnabled" ON customer_auth.customer_users
 FOR EACH ROW EXECUTE FUNCTION customer_auth.audit_mfa_change();

CREATE FUNCTION customer_auth.audit_passkey_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE uid text;
BEGIN
 uid := CASE WHEN TG_OP='DELETE' THEN OLD."userId" ELSE NEW."userId" END;
 IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM customer_auth.customer_users WHERE id=uid) THEN RETURN OLD; END IF;
 IF TG_OP='INSERT' THEN
   -- Lock the user so registration cannot race with disabling MFA.
   PERFORM 1 FROM customer_auth.customer_users WHERE id=uid AND "twoFactorEnabled" FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Authenticator enrollment required'; END IF;
 END IF;
 INSERT INTO customer_auth.security_events(user_id,event)
   VALUES(uid,CASE WHEN TG_OP='INSERT' THEN 'passkeyAdded' ELSE 'passkeyRemoved' END);
 IF TG_OP='DELETE' THEN
   DELETE FROM customer_auth.customer_sessions WHERE "userId"=uid;
   RETURN OLD;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_passkey_change AFTER INSERT OR DELETE ON customer_auth.customer_passkeys
 FOR EACH ROW EXECUTE FUNCTION customer_auth.audit_passkey_change();
