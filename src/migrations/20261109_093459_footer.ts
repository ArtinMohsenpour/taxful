import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_footer_columns_links_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum_footer_social_platform" AS ENUM('linkedin', 'xing', 'instagram', 'facebook', 'x', 'youtube', 'tiktok', 'mastodon', 'github', 'website');
  CREATE TYPE "public"."enum_footer_partners_appearance" AS ENUM('original', 'monochrome');
  CREATE TYPE "public"."enum_footer_legal_links_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum_footer_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__footer_v_version_columns_links_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum__footer_v_version_social_platform" AS ENUM('linkedin', 'xing', 'instagram', 'facebook', 'x', 'youtube', 'tiktok', 'mastodon', 'github', 'website');
  CREATE TYPE "public"."enum__footer_v_version_partners_appearance" AS ENUM('original', 'monochrome');
  CREATE TYPE "public"."enum__footer_v_version_legal_links_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum__footer_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__footer_v_published_locale" AS ENUM('de', 'en');
  CREATE TABLE "footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_footer_columns_links_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "footer_columns_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "footer_columns_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "footer_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_footer_social_platform",
  	"url" varchar
  );
  
  CREATE TABLE "footer_social_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "footer_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"url" varchar,
  	"logo_id" integer,
  	"appearance" "enum_footer_partners_appearance" DEFAULT 'original',
  	"logo_dark_id" integer
  );
  
  CREATE TABLE "footer_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_footer_legal_links_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "footer_legal_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"logo_dark_id" integer,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"_status" "enum_footer_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "footer_locales" (
  	"tagline" varchar,
  	"contact_address" varchar,
  	"social_title" varchar,
  	"partners_title" varchar,
  	"copyright" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_footer_v_version_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__footer_v_version_columns_links_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_v_version_columns_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_footer_v_version_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_v_version_columns_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_footer_v_version_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" "enum__footer_v_version_social_platform",
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_v_version_social_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_footer_v_version_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"url" varchar,
  	"logo_id" integer,
  	"appearance" "enum__footer_v_version_partners_appearance" DEFAULT 'original',
  	"logo_dark_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_v_version_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__footer_v_version_legal_links_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_footer_v_version_legal_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_footer_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_logo_id" integer,
  	"version_logo_dark_id" integer,
  	"version_contact_email" varchar,
  	"version_contact_phone" varchar,
  	"version__status" "enum__footer_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__footer_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_footer_v_locales" (
  	"version_tagline" varchar,
  	"version_contact_address" varchar,
  	"version_social_title" varchar,
  	"version_partners_title" varchar,
  	"version_copyright" varchar,
  	"version_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "footer_columns_links" ADD CONSTRAINT "footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns_links_locales" ADD CONSTRAINT "footer_columns_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_columns_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns" ADD CONSTRAINT "footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns_locales" ADD CONSTRAINT "footer_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_social" ADD CONSTRAINT "footer_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_social_locales" ADD CONSTRAINT "footer_social_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_social"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_partners" ADD CONSTRAINT "footer_partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_partners" ADD CONSTRAINT "footer_partners_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_partners" ADD CONSTRAINT "footer_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_legal_links" ADD CONSTRAINT "footer_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_legal_links_locales" ADD CONSTRAINT "footer_legal_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_legal_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer" ADD CONSTRAINT "footer_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer" ADD CONSTRAINT "footer_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_locales" ADD CONSTRAINT "footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_columns_links" ADD CONSTRAINT "_footer_v_version_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v_version_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_columns_links_locales" ADD CONSTRAINT "_footer_v_version_columns_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v_version_columns_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_columns" ADD CONSTRAINT "_footer_v_version_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_columns_locales" ADD CONSTRAINT "_footer_v_version_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v_version_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_social" ADD CONSTRAINT "_footer_v_version_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_social_locales" ADD CONSTRAINT "_footer_v_version_social_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v_version_social"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_partners" ADD CONSTRAINT "_footer_v_version_partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_v_version_partners" ADD CONSTRAINT "_footer_v_version_partners_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_v_version_partners" ADD CONSTRAINT "_footer_v_version_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_legal_links" ADD CONSTRAINT "_footer_v_version_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_legal_links_locales" ADD CONSTRAINT "_footer_v_version_legal_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v_version_legal_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v" ADD CONSTRAINT "_footer_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_v" ADD CONSTRAINT "_footer_v_version_logo_dark_id_media_id_fk" FOREIGN KEY ("version_logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_v_locales" ADD CONSTRAINT "_footer_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "footer_columns_links_order_idx" ON "footer_columns_links" USING btree ("_order");
  CREATE INDEX "footer_columns_links_parent_id_idx" ON "footer_columns_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "footer_columns_links_locales_locale_parent_id_unique" ON "footer_columns_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_columns_order_idx" ON "footer_columns" USING btree ("_order");
  CREATE INDEX "footer_columns_parent_id_idx" ON "footer_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "footer_columns_locales_locale_parent_id_unique" ON "footer_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_social_order_idx" ON "footer_social" USING btree ("_order");
  CREATE INDEX "footer_social_parent_id_idx" ON "footer_social" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "footer_social_locales_locale_parent_id_unique" ON "footer_social_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_partners_order_idx" ON "footer_partners" USING btree ("_order");
  CREATE INDEX "footer_partners_parent_id_idx" ON "footer_partners" USING btree ("_parent_id");
  CREATE INDEX "footer_partners_logo_idx" ON "footer_partners" USING btree ("logo_id");
  CREATE INDEX "footer_partners_logo_dark_idx" ON "footer_partners" USING btree ("logo_dark_id");
  CREATE INDEX "footer_legal_links_order_idx" ON "footer_legal_links" USING btree ("_order");
  CREATE INDEX "footer_legal_links_parent_id_idx" ON "footer_legal_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "footer_legal_links_locales_locale_parent_id_unique" ON "footer_legal_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_logo_idx" ON "footer" USING btree ("logo_id");
  CREATE INDEX "footer_logo_dark_idx" ON "footer" USING btree ("logo_dark_id");
  CREATE INDEX "footer__status_idx" ON "footer" USING btree ("_status");
  CREATE UNIQUE INDEX "footer_locales_locale_parent_id_unique" ON "footer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_footer_v_version_columns_links_order_idx" ON "_footer_v_version_columns_links" USING btree ("_order");
  CREATE INDEX "_footer_v_version_columns_links_parent_id_idx" ON "_footer_v_version_columns_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_footer_v_version_columns_links_locales_locale_parent_id_uni" ON "_footer_v_version_columns_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_footer_v_version_columns_order_idx" ON "_footer_v_version_columns" USING btree ("_order");
  CREATE INDEX "_footer_v_version_columns_parent_id_idx" ON "_footer_v_version_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_footer_v_version_columns_locales_locale_parent_id_unique" ON "_footer_v_version_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_footer_v_version_social_order_idx" ON "_footer_v_version_social" USING btree ("_order");
  CREATE INDEX "_footer_v_version_social_parent_id_idx" ON "_footer_v_version_social" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_footer_v_version_social_locales_locale_parent_id_unique" ON "_footer_v_version_social_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_footer_v_version_partners_order_idx" ON "_footer_v_version_partners" USING btree ("_order");
  CREATE INDEX "_footer_v_version_partners_parent_id_idx" ON "_footer_v_version_partners" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_partners_logo_idx" ON "_footer_v_version_partners" USING btree ("logo_id");
  CREATE INDEX "_footer_v_version_partners_logo_dark_idx" ON "_footer_v_version_partners" USING btree ("logo_dark_id");
  CREATE INDEX "_footer_v_version_legal_links_order_idx" ON "_footer_v_version_legal_links" USING btree ("_order");
  CREATE INDEX "_footer_v_version_legal_links_parent_id_idx" ON "_footer_v_version_legal_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_footer_v_version_legal_links_locales_locale_parent_id_uniqu" ON "_footer_v_version_legal_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_footer_v_version_version_logo_idx" ON "_footer_v" USING btree ("version_logo_id");
  CREATE INDEX "_footer_v_version_version_logo_dark_idx" ON "_footer_v" USING btree ("version_logo_dark_id");
  CREATE INDEX "_footer_v_version_version__status_idx" ON "_footer_v" USING btree ("version__status");
  CREATE INDEX "_footer_v_created_at_idx" ON "_footer_v" USING btree ("created_at");
  CREATE INDEX "_footer_v_updated_at_idx" ON "_footer_v" USING btree ("updated_at");
  CREATE INDEX "_footer_v_snapshot_idx" ON "_footer_v" USING btree ("snapshot");
  CREATE INDEX "_footer_v_published_locale_idx" ON "_footer_v" USING btree ("published_locale");
  CREATE INDEX "_footer_v_latest_idx" ON "_footer_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_footer_v_locales_locale_parent_id_unique" ON "_footer_v_locales" USING btree ("_locale","_parent_id");`)

  // Starter content is added after all migrations by `pnpm content:seed`: the Local API
  // uses the current schema, which an empty database replaying this migration lacks.
  payload.logger.info('Footer: run `pnpm content:seed` after migrating to add starter content.')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "footer_columns_links" CASCADE;
  DROP TABLE "footer_columns_links_locales" CASCADE;
  DROP TABLE "footer_columns" CASCADE;
  DROP TABLE "footer_columns_locales" CASCADE;
  DROP TABLE "footer_social" CASCADE;
  DROP TABLE "footer_social_locales" CASCADE;
  DROP TABLE "footer_partners" CASCADE;
  DROP TABLE "footer_legal_links" CASCADE;
  DROP TABLE "footer_legal_links_locales" CASCADE;
  DROP TABLE "footer" CASCADE;
  DROP TABLE "footer_locales" CASCADE;
  DROP TABLE "_footer_v_version_columns_links" CASCADE;
  DROP TABLE "_footer_v_version_columns_links_locales" CASCADE;
  DROP TABLE "_footer_v_version_columns" CASCADE;
  DROP TABLE "_footer_v_version_columns_locales" CASCADE;
  DROP TABLE "_footer_v_version_social" CASCADE;
  DROP TABLE "_footer_v_version_social_locales" CASCADE;
  DROP TABLE "_footer_v_version_partners" CASCADE;
  DROP TABLE "_footer_v_version_legal_links" CASCADE;
  DROP TABLE "_footer_v_version_legal_links_locales" CASCADE;
  DROP TABLE "_footer_v" CASCADE;
  DROP TABLE "_footer_v_locales" CASCADE;
  DROP TYPE "public"."enum_footer_columns_links_link_type";
  DROP TYPE "public"."enum_footer_social_platform";
  DROP TYPE "public"."enum_footer_partners_appearance";
  DROP TYPE "public"."enum_footer_legal_links_link_type";
  DROP TYPE "public"."enum_footer_status";
  DROP TYPE "public"."enum__footer_v_version_columns_links_link_type";
  DROP TYPE "public"."enum__footer_v_version_social_platform";
  DROP TYPE "public"."enum__footer_v_version_partners_appearance";
  DROP TYPE "public"."enum__footer_v_version_legal_links_link_type";
  DROP TYPE "public"."enum__footer_v_version_status";
  DROP TYPE "public"."enum__footer_v_published_locale";`)
}
