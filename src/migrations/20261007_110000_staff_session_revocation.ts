import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'
export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`
    CREATE TABLE public.staff_session_revocations (
      user_id integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
      revoked_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE OR REPLACE FUNCTION public.audit_staff_password_change() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.hash IS DISTINCT FROM NEW.hash THEN
        INSERT INTO public.staff_session_revocations(user_id) VALUES(NEW.id)
        ON CONFLICT(user_id) DO UPDATE SET revoked_at=clock_timestamp();
        DELETE FROM public.staff_mfa_proofs WHERE user_id=NEW.id;
        DELETE FROM public.users_sessions WHERE _parent_id=NEW.id;
        INSERT INTO public.staff_security_events(user_id,event) VALUES(NEW.id,'passwordChanged');
      END IF;
      RETURN NEW;
    END $$;
  `)
}
export async function down({ db }: MigrateDownArgs) {
  // Restore the preceding migration's function before removing its new dependency.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION public.audit_staff_password_change() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.hash IS DISTINCT FROM NEW.hash THEN
        DELETE FROM public.staff_mfa_proofs WHERE user_id=NEW.id;
        DELETE FROM public.users_sessions WHERE _parent_id=NEW.id;
        INSERT INTO public.staff_security_events(user_id,event) VALUES(NEW.id,'passwordChanged');
      END IF;
      RETURN NEW;
    END $$;
    DROP TABLE public.staff_session_revocations;
  `)
}
