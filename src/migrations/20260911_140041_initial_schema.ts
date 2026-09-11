import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_navbar_items_children_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum_navbar_items_type" AS ENUM('link', 'dropdown');
  CREATE TYPE "public"."enum_navbar_items_appearance" AS ENUM('link', 'button');
  CREATE TYPE "public"."enum_navbar_items_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum_navbar_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__navbar_v_version_items_children_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum__navbar_v_version_items_type" AS ENUM('link', 'dropdown');
  CREATE TYPE "public"."enum__navbar_v_version_items_appearance" AS ENUM('link', 'button');
  CREATE TYPE "public"."enum__navbar_v_version_items_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum__navbar_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__navbar_v_published_locale" AS ENUM('de', 'en');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "navbar_items_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_navbar_items_children_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "navbar_items_children_locales" (
  	"label" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navbar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_navbar_items_type" DEFAULT 'link',
  	"appearance" "enum_navbar_items_appearance" DEFAULT 'link',
  	"link_type" "enum_navbar_items_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "navbar_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navbar" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_navbar_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_navbar_v_version_items_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__navbar_v_version_items_children_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navbar_v_version_items_children_locales" (
  	"label" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navbar_v_version_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__navbar_v_version_items_type" DEFAULT 'link',
  	"appearance" "enum__navbar_v_version_items_appearance" DEFAULT 'link',
  	"link_type" "enum__navbar_v_version_items_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navbar_v_version_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_navbar_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__navbar_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__navbar_v_published_locale",
  	"latest" boolean
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navbar_items_children" ADD CONSTRAINT "navbar_items_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navbar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navbar_items_children_locales" ADD CONSTRAINT "navbar_items_children_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navbar_items_children"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navbar_items" ADD CONSTRAINT "navbar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navbar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navbar_items_locales" ADD CONSTRAINT "navbar_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navbar_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navbar_v_version_items_children" ADD CONSTRAINT "_navbar_v_version_items_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navbar_v_version_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navbar_v_version_items_children_locales" ADD CONSTRAINT "_navbar_v_version_items_children_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navbar_v_version_items_children"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navbar_v_version_items" ADD CONSTRAINT "_navbar_v_version_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navbar_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navbar_v_version_items_locales" ADD CONSTRAINT "_navbar_v_version_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navbar_v_version_items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "navbar_items_children_order_idx" ON "navbar_items_children" USING btree ("_order");
  CREATE INDEX "navbar_items_children_parent_id_idx" ON "navbar_items_children" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navbar_items_children_locales_locale_parent_id_unique" ON "navbar_items_children_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navbar_items_order_idx" ON "navbar_items" USING btree ("_order");
  CREATE INDEX "navbar_items_parent_id_idx" ON "navbar_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navbar_items_locales_locale_parent_id_unique" ON "navbar_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navbar__status_idx" ON "navbar" USING btree ("_status");
  CREATE INDEX "_navbar_v_version_items_children_order_idx" ON "_navbar_v_version_items_children" USING btree ("_order");
  CREATE INDEX "_navbar_v_version_items_children_parent_id_idx" ON "_navbar_v_version_items_children" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_navbar_v_version_items_children_locales_locale_parent_id_un" ON "_navbar_v_version_items_children_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navbar_v_version_items_order_idx" ON "_navbar_v_version_items" USING btree ("_order");
  CREATE INDEX "_navbar_v_version_items_parent_id_idx" ON "_navbar_v_version_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_navbar_v_version_items_locales_locale_parent_id_unique" ON "_navbar_v_version_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_navbar_v_version_version__status_idx" ON "_navbar_v" USING btree ("version__status");
  CREATE INDEX "_navbar_v_created_at_idx" ON "_navbar_v" USING btree ("created_at");
  CREATE INDEX "_navbar_v_updated_at_idx" ON "_navbar_v" USING btree ("updated_at");
  CREATE INDEX "_navbar_v_snapshot_idx" ON "_navbar_v" USING btree ("snapshot");
  CREATE INDEX "_navbar_v_published_locale_idx" ON "_navbar_v" USING btree ("published_locale");
  CREATE INDEX "_navbar_v_latest_idx" ON "_navbar_v" USING btree ("latest");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "navbar_items_children" CASCADE;
  DROP TABLE "navbar_items_children_locales" CASCADE;
  DROP TABLE "navbar_items" CASCADE;
  DROP TABLE "navbar_items_locales" CASCADE;
  DROP TABLE "navbar" CASCADE;
  DROP TABLE "_navbar_v_version_items_children" CASCADE;
  DROP TABLE "_navbar_v_version_items_children_locales" CASCADE;
  DROP TABLE "_navbar_v_version_items" CASCADE;
  DROP TABLE "_navbar_v_version_items_locales" CASCADE;
  DROP TABLE "_navbar_v" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_navbar_items_children_link_type";
  DROP TYPE "public"."enum_navbar_items_type";
  DROP TYPE "public"."enum_navbar_items_appearance";
  DROP TYPE "public"."enum_navbar_items_link_type";
  DROP TYPE "public"."enum_navbar_status";
  DROP TYPE "public"."enum__navbar_v_version_items_children_link_type";
  DROP TYPE "public"."enum__navbar_v_version_items_type";
  DROP TYPE "public"."enum__navbar_v_version_items_appearance";
  DROP TYPE "public"."enum__navbar_v_version_items_link_type";
  DROP TYPE "public"."enum__navbar_v_version_status";
  DROP TYPE "public"."enum__navbar_v_published_locale";`)
}
