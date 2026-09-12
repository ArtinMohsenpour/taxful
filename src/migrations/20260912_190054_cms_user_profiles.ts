import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('manager', 'content-editor');
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'content-editor' NOT NULL;
  UPDATE "users" SET "role" = 'manager' WHERE "id" = (SELECT MIN("id") FROM "users");
  ALTER TABLE "users" ADD COLUMN "image_id" integer;
  ALTER TABLE "users" ADD COLUMN "phone_number" varchar;
  ALTER TABLE "users" ADD COLUMN "address_street" varchar;
  ALTER TABLE "users" ADD COLUMN "address_address_line2" varchar;
  ALTER TABLE "users" ADD COLUMN "address_postal_code" varchar;
  ALTER TABLE "users" ADD COLUMN "address_city" varchar;
  ALTER TABLE "users" ADD COLUMN "address_country" varchar;
  ALTER TABLE "users" ADD CONSTRAINT "users_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_image_idx" ON "users" USING btree ("image_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP CONSTRAINT "users_image_id_media_id_fk";
  
  DROP INDEX "users_image_idx";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "users" DROP COLUMN "image_id";
  ALTER TABLE "users" DROP COLUMN "phone_number";
  ALTER TABLE "users" DROP COLUMN "address_street";
  ALTER TABLE "users" DROP COLUMN "address_address_line2";
  ALTER TABLE "users" DROP COLUMN "address_postal_code";
  ALTER TABLE "users" DROP COLUMN "address_city";
  ALTER TABLE "users" DROP COLUMN "address_country";
  DROP TYPE "public"."enum_users_role";`)
}
