import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_home_providers_provider" AS ENUM('datev', 'lexware', 'sevdesk', 'sage', 'wiso', 'fastbill', 'custom');
  CREATE TYPE "public"."enum_home_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_v_version_providers_provider" AS ENUM('datev', 'lexware', 'sevdesk', 'sage', 'wiso', 'fastbill', 'custom');
  CREATE TYPE "public"."enum__home_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_v_published_locale" AS ENUM('de', 'en');
  CREATE TABLE "home_providers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"provider" "enum_home_providers_provider",
  	"logo_id" integer
  );
  
  CREATE TABLE "home_providers_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_home_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"title_accent" varchar,
  	"description" varchar,
  	"diagram_sources" varchar,
  	"diagram_processing" varchar,
  	"diagram_customers" varchar,
  	"diagram_formats" varchar,
  	"diagram_tax_office" varchar,
  	"diagram_tax_submission" varchar,
  	"steps_import" varchar,
  	"steps_review" varchar,
  	"steps_validate" varchar,
  	"steps_export" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_home_v_version_providers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"provider" "enum__home_v_version_providers_provider",
  	"logo_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_v_version_providers_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_home_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__home_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__home_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_home_v_locales" (
  	"version_eyebrow" varchar,
  	"version_title" varchar,
  	"version_title_accent" varchar,
  	"version_description" varchar,
  	"version_diagram_sources" varchar,
  	"version_diagram_processing" varchar,
  	"version_diagram_customers" varchar,
  	"version_diagram_formats" varchar,
  	"version_diagram_tax_office" varchar,
  	"version_diagram_tax_submission" varchar,
  	"version_steps_import" varchar,
  	"version_steps_review" varchar,
  	"version_steps_validate" varchar,
  	"version_steps_export" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "home_providers" ADD CONSTRAINT "home_providers_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_providers" ADD CONSTRAINT "home_providers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_providers_locales" ADD CONSTRAINT "home_providers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_locales" ADD CONSTRAINT "home_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_version_providers" ADD CONSTRAINT "_home_v_version_providers_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v_version_providers" ADD CONSTRAINT "_home_v_version_providers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_version_providers_locales" ADD CONSTRAINT "_home_v_version_providers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v_version_providers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_locales" ADD CONSTRAINT "_home_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_providers_order_idx" ON "home_providers" USING btree ("_order");
  CREATE INDEX "home_providers_parent_id_idx" ON "home_providers" USING btree ("_parent_id");
  CREATE INDEX "home_providers_logo_idx" ON "home_providers" USING btree ("logo_id");
  CREATE UNIQUE INDEX "home_providers_locales_locale_parent_id_unique" ON "home_providers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "home__status_idx" ON "home" USING btree ("_status");
  CREATE UNIQUE INDEX "home_locales_locale_parent_id_unique" ON "home_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_v_version_providers_order_idx" ON "_home_v_version_providers" USING btree ("_order");
  CREATE INDEX "_home_v_version_providers_parent_id_idx" ON "_home_v_version_providers" USING btree ("_parent_id");
  CREATE INDEX "_home_v_version_providers_logo_idx" ON "_home_v_version_providers" USING btree ("logo_id");
  CREATE UNIQUE INDEX "_home_v_version_providers_locales_locale_parent_id_unique" ON "_home_v_version_providers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_v_version_version__status_idx" ON "_home_v" USING btree ("version__status");
  CREATE INDEX "_home_v_created_at_idx" ON "_home_v" USING btree ("created_at");
  CREATE INDEX "_home_v_updated_at_idx" ON "_home_v" USING btree ("updated_at");
  CREATE INDEX "_home_v_snapshot_idx" ON "_home_v" USING btree ("snapshot");
  CREATE INDEX "_home_v_published_locale_idx" ON "_home_v" USING btree ("published_locale");
  CREATE INDEX "_home_v_latest_idx" ON "_home_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_home_v_locales_locale_parent_id_unique" ON "_home_v_locales" USING btree ("_locale","_parent_id");`)
  // Initialize only the new Home global, preserving the current bilingual hero.
  await db.execute(sql`
    INSERT INTO "home" ("_status", "created_at", "updated_at") VALUES ('published', now(), now());
    INSERT INTO "home_locales" ("eyebrow", "title", "title_accent", "description", "diagram_sources", "diagram_processing", "diagram_customers", "diagram_formats", "diagram_tax_office", "diagram_tax_submission", "steps_import", "steps_review", "steps_validate", "steps_export", "_locale", "_parent_id")
    SELECT 'Ein bisschen mehr Klarheit.', 'Ihre Rechnungen.', 'Ein klarer Ablauf.', 'Dokumente importieren, Details prüfen und validierte E-Rechnungen erstellen. Von Ihrer Buchhaltung bis zur fertigen Datei – alles an einem Ort.', 'Aus Ihrer Buchhaltung', 'Prüfen & freigeben', 'Für Ihre Kunden', 'XRechnung · ZUGFeRD', 'Finanzamt', 'Übermittlung über ELSTER', 'Importieren', 'Prüfen', 'Validieren', 'Exportieren', 'de'::"_locales", id FROM "home"
    UNION ALL
    SELECT 'A little more clarity.', 'Your invoices.', 'One clear workflow.', 'Import documents, review the details and create validated e-invoices. From your accounting software to the finished file – all in one place.', 'From your accounting software', 'Review & approve', 'For your customers', 'XRechnung · ZUGFeRD', 'Tax office', 'Submission via ELSTER', 'Import', 'Review', 'Validate', 'Export', 'en'::"_locales", id FROM "home";
    INSERT INTO "home_providers" ("_order", "_parent_id", "id", "provider")
    SELECT 1, id, 'home-seed-datev', 'datev'::"enum_home_providers_provider" FROM "home"
    UNION ALL
    SELECT 2, id, 'home-seed-lexware', 'lexware'::"enum_home_providers_provider" FROM "home"
    UNION ALL
    SELECT 3, id, 'home-seed-sevdesk', 'sevdesk'::"enum_home_providers_provider" FROM "home"
    UNION ALL
    SELECT 4, id, 'home-seed-sage', 'sage'::"enum_home_providers_provider" FROM "home"
    UNION ALL
    SELECT 5, id, 'home-seed-wiso', 'wiso'::"enum_home_providers_provider" FROM "home"
    UNION ALL
    SELECT 6, id, 'home-seed-fastbill', 'fastbill'::"enum_home_providers_provider" FROM "home";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home_providers" CASCADE;
  DROP TABLE "home_providers_locales" CASCADE;
  DROP TABLE "home" CASCADE;
  DROP TABLE "home_locales" CASCADE;
  DROP TABLE "_home_v_version_providers" CASCADE;
  DROP TABLE "_home_v_version_providers_locales" CASCADE;
  DROP TABLE "_home_v" CASCADE;
  DROP TABLE "_home_v_locales" CASCADE;
  DROP TYPE "public"."enum_home_providers_provider";
  DROP TYPE "public"."enum_home_status";
  DROP TYPE "public"."enum__home_v_version_providers_provider";
  DROP TYPE "public"."enum__home_v_version_status";
  DROP TYPE "public"."enum__home_v_published_locale";`)
}
