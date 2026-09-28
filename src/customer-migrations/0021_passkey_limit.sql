-- Serialize the limit at the database boundary, including concurrent registrations.
CREATE FUNCTION customer_auth.limit_passkeys() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM customer_auth.customer_users WHERE id=NEW."userId" FOR UPDATE;
 IF (SELECT count(*) FROM customer_auth.customer_passkeys WHERE "userId"=NEW."userId") >= 10 THEN
   RAISE EXCEPTION 'Passkey limit reached';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER limit_passkeys BEFORE INSERT ON customer_auth.customer_passkeys
 FOR EACH ROW EXECUTE FUNCTION customer_auth.limit_passkeys();
