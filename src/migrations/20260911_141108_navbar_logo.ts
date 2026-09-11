import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "navbar" ADD COLUMN "logo_id" integer;
  ALTER TABLE "_navbar_v" ADD COLUMN "version_logo_id" integer;
  ALTER TABLE "navbar" ADD CONSTRAINT "navbar_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_navbar_v" ADD CONSTRAINT "_navbar_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "navbar_logo_idx" ON "navbar" USING btree ("logo_id");
  CREATE INDEX "_navbar_v_version_version_logo_idx" ON "_navbar_v" USING btree ("version_logo_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "navbar" DROP CONSTRAINT "navbar_logo_id_media_id_fk";
  
  ALTER TABLE "_navbar_v" DROP CONSTRAINT "_navbar_v_version_logo_id_media_id_fk";
  
  DROP INDEX "navbar_logo_idx";
  DROP INDEX "_navbar_v_version_version_logo_idx";
  ALTER TABLE "navbar" DROP COLUMN "logo_id";
  ALTER TABLE "_navbar_v" DROP COLUMN "version_logo_id";`)
}
