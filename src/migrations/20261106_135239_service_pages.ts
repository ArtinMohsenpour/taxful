import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { seedServicePages } from './seeds/services-20261106'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_service_pages_icon" AS ENUM('outgoing-invoices', 'incoming-invoices', 'converter', 'check', 'files', 'security', 'team', 'preview');
  CREATE TYPE "public"."enum_service_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__service_pages_v_version_icon" AS ENUM('outgoing-invoices', 'incoming-invoices', 'converter', 'check', 'files', 'security', 'team', 'preview');
  CREATE TYPE "public"."enum__service_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__service_pages_v_published_locale" AS ENUM('de', 'en');
  CREATE TABLE "service_pages_key_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "service_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"sort_order" numeric DEFAULT 100,
  	"icon" "enum_service_pages_icon",
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_service_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "service_pages_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"sections" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_service_pages_v_version_key_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_service_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_sort_order" numeric DEFAULT 100,
  	"version_icon" "enum__service_pages_v_version_icon",
  	"version_seo_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__service_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__service_pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_service_pages_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_sections" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "service_pages_id" integer;
  ALTER TABLE "service_pages_key_points" ADD CONSTRAINT "service_pages_key_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."service_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "service_pages" ADD CONSTRAINT "service_pages_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "service_pages_locales" ADD CONSTRAINT "service_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."service_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_service_pages_v_version_key_points" ADD CONSTRAINT "_service_pages_v_version_key_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_service_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_service_pages_v" ADD CONSTRAINT "_service_pages_v_parent_id_service_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."service_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_service_pages_v" ADD CONSTRAINT "_service_pages_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_service_pages_v_locales" ADD CONSTRAINT "_service_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_service_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "service_pages_key_points_order_idx" ON "service_pages_key_points" USING btree ("_order");
  CREATE INDEX "service_pages_key_points_parent_id_idx" ON "service_pages_key_points" USING btree ("_parent_id");
  CREATE INDEX "service_pages_key_points_locale_idx" ON "service_pages_key_points" USING btree ("_locale");
  CREATE UNIQUE INDEX "service_pages_slug_idx" ON "service_pages" USING btree ("slug");
  CREATE INDEX "service_pages_sort_order_idx" ON "service_pages" USING btree ("sort_order");
  CREATE INDEX "service_pages_seo_seo_image_idx" ON "service_pages" USING btree ("seo_image_id");
  CREATE INDEX "service_pages_updated_at_idx" ON "service_pages" USING btree ("updated_at");
  CREATE INDEX "service_pages_created_at_idx" ON "service_pages" USING btree ("created_at");
  CREATE INDEX "service_pages__status_idx" ON "service_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "service_pages_locales_locale_parent_id_unique" ON "service_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_service_pages_v_version_key_points_order_idx" ON "_service_pages_v_version_key_points" USING btree ("_order");
  CREATE INDEX "_service_pages_v_version_key_points_parent_id_idx" ON "_service_pages_v_version_key_points" USING btree ("_parent_id");
  CREATE INDEX "_service_pages_v_version_key_points_locale_idx" ON "_service_pages_v_version_key_points" USING btree ("_locale");
  CREATE INDEX "_service_pages_v_parent_idx" ON "_service_pages_v" USING btree ("parent_id");
  CREATE INDEX "_service_pages_v_version_version_slug_idx" ON "_service_pages_v" USING btree ("version_slug");
  CREATE INDEX "_service_pages_v_version_version_sort_order_idx" ON "_service_pages_v" USING btree ("version_sort_order");
  CREATE INDEX "_service_pages_v_version_seo_version_seo_image_idx" ON "_service_pages_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_service_pages_v_version_version_updated_at_idx" ON "_service_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_service_pages_v_version_version_created_at_idx" ON "_service_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_service_pages_v_version_version__status_idx" ON "_service_pages_v" USING btree ("version__status");
  CREATE INDEX "_service_pages_v_created_at_idx" ON "_service_pages_v" USING btree ("created_at");
  CREATE INDEX "_service_pages_v_updated_at_idx" ON "_service_pages_v" USING btree ("updated_at");
  CREATE INDEX "_service_pages_v_snapshot_idx" ON "_service_pages_v" USING btree ("snapshot");
  CREATE INDEX "_service_pages_v_published_locale_idx" ON "_service_pages_v" USING btree ("published_locale");
  CREATE INDEX "_service_pages_v_latest_idx" ON "_service_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_service_pages_v_locales_locale_parent_id_unique" ON "_service_pages_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_service_pages_fk" FOREIGN KEY ("service_pages_id") REFERENCES "public"."service_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_service_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("service_pages_id");`)

  // Content is created as drafts for review; see docs/website-builder.md.
  await seedServicePages(payload, req)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Remove the lock reference before the tables: DROP TABLE ... CASCADE would
  // already remove its foreign key, and the generated order then fails.
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_service_pages_fk";
  DROP INDEX "payload_locked_documents_rels_service_pages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "service_pages_id";
  ALTER TABLE "service_pages_key_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "service_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "service_pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_service_pages_v_version_key_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_service_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_service_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "service_pages_key_points" CASCADE;
  DROP TABLE "service_pages" CASCADE;
  DROP TABLE "service_pages_locales" CASCADE;
  DROP TABLE "_service_pages_v_version_key_points" CASCADE;
  DROP TABLE "_service_pages_v" CASCADE;
  DROP TABLE "_service_pages_v_locales" CASCADE;
  DROP TYPE "public"."enum_service_pages_icon";
  DROP TYPE "public"."enum_service_pages_status";
  DROP TYPE "public"."enum__service_pages_v_version_icon";
  DROP TYPE "public"."enum__service_pages_v_version_status";
  DROP TYPE "public"."enum__service_pages_v_published_locale";`)
}
