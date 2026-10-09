import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'
export async function up({ db }: MigrateUpArgs) {
  // A long-running password-change transaction must revoke logins created after
  // BEGIN but before the password actually changes, including its first change.
  await db.execute(
    sql`ALTER TABLE public.staff_session_revocations ALTER COLUMN revoked_at SET DEFAULT clock_timestamp();`,
  )
}
export async function down({ db }: MigrateDownArgs) {
  await db.execute(
    sql`ALTER TABLE public.staff_session_revocations ALTER COLUMN revoked_at SET DEFAULT now();`,
  )
}
