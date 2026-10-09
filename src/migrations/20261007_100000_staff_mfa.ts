import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'
export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`
 CREATE TABLE public.staff_mfa (
  user_id integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  secret text NOT NULL, verified boolean NOT NULL DEFAULT false,
  last_counter bigint NOT NULL DEFAULT -1, recovery_hashes jsonb NOT NULL DEFAULT '[]',
  failures integer NOT NULL DEFAULT 0, locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
 );
 CREATE TABLE public.staff_mfa_proofs (
  token_hash text PRIMARY KEY, user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id varchar NOT NULL, expires_at timestamptz NOT NULL
 );
 CREATE INDEX staff_mfa_proofs_user ON public.staff_mfa_proofs(user_id);
 CREATE TABLE public.staff_security_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
  event text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
 );
 CREATE TABLE public.staff_security_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint NOT NULL UNIQUE REFERENCES public.staff_security_events(id) ON DELETE CASCADE,
  recipient text NOT NULL, locale text NOT NULL DEFAULT 'de', kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid, lease_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
 );
 CREATE INDEX staff_security_notifications_pending ON public.staff_security_notifications(status,available_at);
 CREATE FUNCTION public.queue_staff_security_notification() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
  IF NEW.event IN ('mfaEnabled','recoveryUsed','passwordChanged') THEN
   INSERT INTO public.staff_security_notifications(event_id,recipient,kind)
   SELECT NEW.id,email,CASE WHEN NEW.event='passwordChanged' THEN 'passwordChanged' ELSE 'security' END FROM public.users WHERE id=NEW.user_id;
  END IF;
  RETURN NEW;
 END $$;
 CREATE TRIGGER queue_staff_security_notification AFTER INSERT ON public.staff_security_events
 FOR EACH ROW EXECUTE FUNCTION public.queue_staff_security_notification();
 CREATE FUNCTION public.audit_staff_password_change() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
  IF OLD.hash IS DISTINCT FROM NEW.hash THEN
   DELETE FROM public.staff_mfa_proofs WHERE user_id=NEW.id;
   DELETE FROM public.users_sessions WHERE _parent_id=NEW.id;
   INSERT INTO public.staff_security_events(user_id,event) VALUES(NEW.id,'passwordChanged');
  END IF;
  RETURN NEW;
 END $$;
 CREATE TRIGGER audit_staff_password_change AFTER UPDATE OF hash ON public.users
 FOR EACH ROW EXECUTE FUNCTION public.audit_staff_password_change();
`)
}
export async function down({ db }: MigrateDownArgs) {
  await db.execute(
    sql`DROP TRIGGER audit_staff_password_change ON public.users;
    DROP FUNCTION public.audit_staff_password_change();
    DROP TABLE public.staff_security_notifications;
    DROP TRIGGER queue_staff_security_notification ON public.staff_security_events;
    DROP FUNCTION public.queue_staff_security_notification();
    DROP TABLE public.staff_mfa_proofs; DROP TABLE public.staff_security_events; DROP TABLE public.staff_mfa;`,
  )
}
