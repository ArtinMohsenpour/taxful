import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
   ALTER TABLE "users" ALTER COLUMN "role" TYPE text;
   DROP TYPE "public"."enum_users_role";
   CREATE TYPE "public"."enum_users_role" AS ENUM('super-admin', 'manager', 'content-editor');
   ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
   ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'content-editor'::"public"."enum_users_role";
   UPDATE "users" SET "role" = 'super-admin' WHERE "id" = (SELECT MIN("id") FROM "users") AND "role" = 'manager';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "users" SET "role" = 'manager' WHERE "role" = 'super-admin';
   ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'content-editor'::text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('manager', 'content-editor');
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'content-editor'::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";`)
}
