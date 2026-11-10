import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_website_forms_fields_type" AS ENUM('text', 'email', 'textarea', 'select', 'checkbox');
  CREATE TYPE "public"."enum_website_forms_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__website_forms_v_version_fields_type" AS ENUM('text', 'email', 'textarea', 'select', 'checkbox');
  CREATE TYPE "public"."enum__website_forms_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__website_forms_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_form_submissions_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_form_submissions_status" AS ENUM('new', 'handled');
  CREATE TYPE "public"."enum_services_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_about_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__about_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__about_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_how_it_works_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__how_it_works_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__how_it_works_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_faq_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faq_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__faq_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_contact_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contact_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contact_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_privacy_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__privacy_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__privacy_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_terms_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__terms_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__terms_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "public"."enum_impressum_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__impressum_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__impressum_v_published_locale" AS ENUM('de', 'en');
  CREATE TABLE "website_forms_fields_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "website_forms_fields_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "website_forms_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"type" "enum_website_forms_fields_type" DEFAULT 'text',
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "website_forms_fields_locales" (
  	"label" varchar,
  	"help" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "website_forms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"enabled" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_website_forms_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "website_forms_locales" (
  	"title" varchar,
  	"description" varchar,
  	"submit_label" varchar,
  	"success_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_website_forms_v_version_fields_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_website_forms_v_version_fields_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_website_forms_v_version_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"type" "enum__website_forms_v_version_fields_type" DEFAULT 'text',
  	"required" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_website_forms_v_version_fields_locales" (
  	"label" varchar,
  	"help" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_website_forms_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_enabled" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__website_forms_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__website_forms_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_website_forms_v_locales" (
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_submit_label" varchar,
  	"version_success_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "form_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar NOT NULL,
  	"fingerprint" varchar NOT NULL,
  	"form_id" integer NOT NULL,
  	"source_page" varchar NOT NULL,
  	"locale" "enum_form_submissions_locale" NOT NULL,
  	"answers" jsonb NOT NULL,
  	"status" "enum_form_submissions_status" DEFAULT 'new' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"_status" "enum_services_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "services_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"sections" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version__status" "enum__services_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__services_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_services_v_locales" (
  	"version_eyebrow" varchar,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_sections" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "about" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"_status" "enum_about_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"sections" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_about_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version__status" "enum__about_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__about_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_about_v_locales" (
  	"version_eyebrow" varchar,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_sections" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "how_it_works" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"_status" "enum_how_it_works_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "how_it_works_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"sections" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_how_it_works_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version__status" "enum__how_it_works_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__how_it_works_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_how_it_works_v_locales" (
  	"version_eyebrow" varchar,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_sections" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "faq" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"_status" "enum_faq_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "faq_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"sections" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_faq_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version__status" "enum__faq_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__faq_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_faq_v_locales" (
  	"version_eyebrow" varchar,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_sections" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "contact" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"_status" "enum_contact_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "contact_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"sections" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_contact_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version__status" "enum__contact_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__contact_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_contact_v_locales" (
  	"version_eyebrow" varchar,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_sections" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "privacy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"_status" "enum_privacy_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "privacy_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"sections" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_privacy_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version__status" "enum__privacy_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__privacy_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_privacy_v_locales" (
  	"version_eyebrow" varchar,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_sections" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "terms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"_status" "enum_terms_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "terms_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"sections" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_terms_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version__status" "enum__terms_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__terms_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_terms_v_locales" (
  	"version_eyebrow" varchar,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_sections" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "impressum" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"_status" "enum_impressum_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "impressum_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"sections" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_impressum_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_seo_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version__status" "enum__impressum_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__impressum_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_impressum_v_locales" (
  	"version_eyebrow" varchar,
  	"version_title" varchar,
  	"version_subtitle" varchar,
  	"version_sections" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "website_forms_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "form_submissions_id" integer;
  ALTER TABLE "home" ADD COLUMN "seo_image_id" integer;
  ALTER TABLE "home" ADD COLUMN "seo_no_index" boolean DEFAULT false;
  ALTER TABLE "home_locales" ADD COLUMN "sections" jsonb;
  ALTER TABLE "home_locales" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "home_locales" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_seo_image_id" integer;
  ALTER TABLE "_home_v" ADD COLUMN "version_seo_no_index" boolean DEFAULT false;
  ALTER TABLE "_home_v_locales" ADD COLUMN "version_sections" jsonb;
  ALTER TABLE "_home_v_locales" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_home_v_locales" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "website_forms_fields_options" ADD CONSTRAINT "website_forms_fields_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."website_forms_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "website_forms_fields_options_locales" ADD CONSTRAINT "website_forms_fields_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."website_forms_fields_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "website_forms_fields" ADD CONSTRAINT "website_forms_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."website_forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "website_forms_fields_locales" ADD CONSTRAINT "website_forms_fields_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."website_forms_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "website_forms_locales" ADD CONSTRAINT "website_forms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."website_forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_website_forms_v_version_fields_options" ADD CONSTRAINT "_website_forms_v_version_fields_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_website_forms_v_version_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_website_forms_v_version_fields_options_locales" ADD CONSTRAINT "_website_forms_v_version_fields_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_website_forms_v_version_fields_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_website_forms_v_version_fields" ADD CONSTRAINT "_website_forms_v_version_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_website_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_website_forms_v_version_fields_locales" ADD CONSTRAINT "_website_forms_v_version_fields_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_website_forms_v_version_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_website_forms_v" ADD CONSTRAINT "_website_forms_v_parent_id_website_forms_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."website_forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_website_forms_v_locales" ADD CONSTRAINT "_website_forms_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_website_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_website_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."website_forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_locales" ADD CONSTRAINT "about_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_locales" ADD CONSTRAINT "_about_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "how_it_works" ADD CONSTRAINT "how_it_works_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "how_it_works_locales" ADD CONSTRAINT "how_it_works_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_how_it_works_v" ADD CONSTRAINT "_how_it_works_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_how_it_works_v_locales" ADD CONSTRAINT "_how_it_works_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_how_it_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faq" ADD CONSTRAINT "faq_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faq_locales" ADD CONSTRAINT "faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_faq_v" ADD CONSTRAINT "_faq_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_faq_v_locales" ADD CONSTRAINT "_faq_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_faq_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact" ADD CONSTRAINT "contact_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_locales" ADD CONSTRAINT "contact_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contact_v" ADD CONSTRAINT "_contact_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_contact_v_locales" ADD CONSTRAINT "_contact_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contact_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "privacy" ADD CONSTRAINT "privacy_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "privacy_locales" ADD CONSTRAINT "privacy_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."privacy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_privacy_v" ADD CONSTRAINT "_privacy_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_privacy_v_locales" ADD CONSTRAINT "_privacy_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_privacy_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "terms" ADD CONSTRAINT "terms_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "terms_locales" ADD CONSTRAINT "terms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_terms_v" ADD CONSTRAINT "_terms_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_terms_v_locales" ADD CONSTRAINT "_terms_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_terms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "impressum" ADD CONSTRAINT "impressum_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "impressum_locales" ADD CONSTRAINT "impressum_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."impressum"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_impressum_v" ADD CONSTRAINT "_impressum_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_impressum_v_locales" ADD CONSTRAINT "_impressum_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_impressum_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "website_forms_fields_options_order_idx" ON "website_forms_fields_options" USING btree ("_order");
  CREATE INDEX "website_forms_fields_options_parent_id_idx" ON "website_forms_fields_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "website_forms_fields_options_locales_locale_parent_id_unique" ON "website_forms_fields_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "website_forms_fields_order_idx" ON "website_forms_fields" USING btree ("_order");
  CREATE INDEX "website_forms_fields_parent_id_idx" ON "website_forms_fields" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "website_forms_fields_locales_locale_parent_id_unique" ON "website_forms_fields_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "website_forms_updated_at_idx" ON "website_forms" USING btree ("updated_at");
  CREATE INDEX "website_forms_created_at_idx" ON "website_forms" USING btree ("created_at");
  CREATE INDEX "website_forms__status_idx" ON "website_forms" USING btree ("_status");
  CREATE UNIQUE INDEX "website_forms_locales_locale_parent_id_unique" ON "website_forms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_website_forms_v_version_fields_options_order_idx" ON "_website_forms_v_version_fields_options" USING btree ("_order");
  CREATE INDEX "_website_forms_v_version_fields_options_parent_id_idx" ON "_website_forms_v_version_fields_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_website_forms_v_version_fields_options_locales_locale_paren" ON "_website_forms_v_version_fields_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_website_forms_v_version_fields_order_idx" ON "_website_forms_v_version_fields" USING btree ("_order");
  CREATE INDEX "_website_forms_v_version_fields_parent_id_idx" ON "_website_forms_v_version_fields" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_website_forms_v_version_fields_locales_locale_parent_id_uni" ON "_website_forms_v_version_fields_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_website_forms_v_parent_idx" ON "_website_forms_v" USING btree ("parent_id");
  CREATE INDEX "_website_forms_v_version_version_updated_at_idx" ON "_website_forms_v" USING btree ("version_updated_at");
  CREATE INDEX "_website_forms_v_version_version_created_at_idx" ON "_website_forms_v" USING btree ("version_created_at");
  CREATE INDEX "_website_forms_v_version_version__status_idx" ON "_website_forms_v" USING btree ("version__status");
  CREATE INDEX "_website_forms_v_created_at_idx" ON "_website_forms_v" USING btree ("created_at");
  CREATE INDEX "_website_forms_v_updated_at_idx" ON "_website_forms_v" USING btree ("updated_at");
  CREATE INDEX "_website_forms_v_snapshot_idx" ON "_website_forms_v" USING btree ("snapshot");
  CREATE INDEX "_website_forms_v_published_locale_idx" ON "_website_forms_v" USING btree ("published_locale");
  CREATE INDEX "_website_forms_v_latest_idx" ON "_website_forms_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_website_forms_v_locales_locale_parent_id_unique" ON "_website_forms_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "form_submissions_reference_idx" ON "form_submissions" USING btree ("reference");
  CREATE INDEX "form_submissions_form_idx" ON "form_submissions" USING btree ("form_id");
  CREATE INDEX "form_submissions_status_idx" ON "form_submissions" USING btree ("status");
  CREATE INDEX "form_submissions_updated_at_idx" ON "form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions" USING btree ("created_at");
  CREATE INDEX "services_seo_seo_image_idx" ON "services" USING btree ("seo_image_id");
  CREATE INDEX "services__status_idx" ON "services" USING btree ("_status");
  CREATE UNIQUE INDEX "services_locales_locale_parent_id_unique" ON "services_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_version_seo_version_seo_image_idx" ON "_services_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_services_v_version_version__status_idx" ON "_services_v" USING btree ("version__status");
  CREATE INDEX "_services_v_created_at_idx" ON "_services_v" USING btree ("created_at");
  CREATE INDEX "_services_v_updated_at_idx" ON "_services_v" USING btree ("updated_at");
  CREATE INDEX "_services_v_snapshot_idx" ON "_services_v" USING btree ("snapshot");
  CREATE INDEX "_services_v_published_locale_idx" ON "_services_v" USING btree ("published_locale");
  CREATE INDEX "_services_v_latest_idx" ON "_services_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_services_v_locales_locale_parent_id_unique" ON "_services_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_seo_seo_image_idx" ON "about" USING btree ("seo_image_id");
  CREATE INDEX "about__status_idx" ON "about" USING btree ("_status");
  CREATE UNIQUE INDEX "about_locales_locale_parent_id_unique" ON "about_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_about_v_version_seo_version_seo_image_idx" ON "_about_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_about_v_version_version__status_idx" ON "_about_v" USING btree ("version__status");
  CREATE INDEX "_about_v_created_at_idx" ON "_about_v" USING btree ("created_at");
  CREATE INDEX "_about_v_updated_at_idx" ON "_about_v" USING btree ("updated_at");
  CREATE INDEX "_about_v_snapshot_idx" ON "_about_v" USING btree ("snapshot");
  CREATE INDEX "_about_v_published_locale_idx" ON "_about_v" USING btree ("published_locale");
  CREATE INDEX "_about_v_latest_idx" ON "_about_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_about_v_locales_locale_parent_id_unique" ON "_about_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "how_it_works_seo_seo_image_idx" ON "how_it_works" USING btree ("seo_image_id");
  CREATE INDEX "how_it_works__status_idx" ON "how_it_works" USING btree ("_status");
  CREATE UNIQUE INDEX "how_it_works_locales_locale_parent_id_unique" ON "how_it_works_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_how_it_works_v_version_seo_version_seo_image_idx" ON "_how_it_works_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_how_it_works_v_version_version__status_idx" ON "_how_it_works_v" USING btree ("version__status");
  CREATE INDEX "_how_it_works_v_created_at_idx" ON "_how_it_works_v" USING btree ("created_at");
  CREATE INDEX "_how_it_works_v_updated_at_idx" ON "_how_it_works_v" USING btree ("updated_at");
  CREATE INDEX "_how_it_works_v_snapshot_idx" ON "_how_it_works_v" USING btree ("snapshot");
  CREATE INDEX "_how_it_works_v_published_locale_idx" ON "_how_it_works_v" USING btree ("published_locale");
  CREATE INDEX "_how_it_works_v_latest_idx" ON "_how_it_works_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_how_it_works_v_locales_locale_parent_id_unique" ON "_how_it_works_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faq_seo_seo_image_idx" ON "faq" USING btree ("seo_image_id");
  CREATE INDEX "faq__status_idx" ON "faq" USING btree ("_status");
  CREATE UNIQUE INDEX "faq_locales_locale_parent_id_unique" ON "faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faq_v_version_seo_version_seo_image_idx" ON "_faq_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_faq_v_version_version__status_idx" ON "_faq_v" USING btree ("version__status");
  CREATE INDEX "_faq_v_created_at_idx" ON "_faq_v" USING btree ("created_at");
  CREATE INDEX "_faq_v_updated_at_idx" ON "_faq_v" USING btree ("updated_at");
  CREATE INDEX "_faq_v_snapshot_idx" ON "_faq_v" USING btree ("snapshot");
  CREATE INDEX "_faq_v_published_locale_idx" ON "_faq_v" USING btree ("published_locale");
  CREATE INDEX "_faq_v_latest_idx" ON "_faq_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_faq_v_locales_locale_parent_id_unique" ON "_faq_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "contact_seo_seo_image_idx" ON "contact" USING btree ("seo_image_id");
  CREATE INDEX "contact__status_idx" ON "contact" USING btree ("_status");
  CREATE UNIQUE INDEX "contact_locales_locale_parent_id_unique" ON "contact_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_contact_v_version_seo_version_seo_image_idx" ON "_contact_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_contact_v_version_version__status_idx" ON "_contact_v" USING btree ("version__status");
  CREATE INDEX "_contact_v_created_at_idx" ON "_contact_v" USING btree ("created_at");
  CREATE INDEX "_contact_v_updated_at_idx" ON "_contact_v" USING btree ("updated_at");
  CREATE INDEX "_contact_v_snapshot_idx" ON "_contact_v" USING btree ("snapshot");
  CREATE INDEX "_contact_v_published_locale_idx" ON "_contact_v" USING btree ("published_locale");
  CREATE INDEX "_contact_v_latest_idx" ON "_contact_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_contact_v_locales_locale_parent_id_unique" ON "_contact_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "privacy_seo_seo_image_idx" ON "privacy" USING btree ("seo_image_id");
  CREATE INDEX "privacy__status_idx" ON "privacy" USING btree ("_status");
  CREATE UNIQUE INDEX "privacy_locales_locale_parent_id_unique" ON "privacy_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_privacy_v_version_seo_version_seo_image_idx" ON "_privacy_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_privacy_v_version_version__status_idx" ON "_privacy_v" USING btree ("version__status");
  CREATE INDEX "_privacy_v_created_at_idx" ON "_privacy_v" USING btree ("created_at");
  CREATE INDEX "_privacy_v_updated_at_idx" ON "_privacy_v" USING btree ("updated_at");
  CREATE INDEX "_privacy_v_snapshot_idx" ON "_privacy_v" USING btree ("snapshot");
  CREATE INDEX "_privacy_v_published_locale_idx" ON "_privacy_v" USING btree ("published_locale");
  CREATE INDEX "_privacy_v_latest_idx" ON "_privacy_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_privacy_v_locales_locale_parent_id_unique" ON "_privacy_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "terms_seo_seo_image_idx" ON "terms" USING btree ("seo_image_id");
  CREATE INDEX "terms__status_idx" ON "terms" USING btree ("_status");
  CREATE UNIQUE INDEX "terms_locales_locale_parent_id_unique" ON "terms_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_terms_v_version_seo_version_seo_image_idx" ON "_terms_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_terms_v_version_version__status_idx" ON "_terms_v" USING btree ("version__status");
  CREATE INDEX "_terms_v_created_at_idx" ON "_terms_v" USING btree ("created_at");
  CREATE INDEX "_terms_v_updated_at_idx" ON "_terms_v" USING btree ("updated_at");
  CREATE INDEX "_terms_v_snapshot_idx" ON "_terms_v" USING btree ("snapshot");
  CREATE INDEX "_terms_v_published_locale_idx" ON "_terms_v" USING btree ("published_locale");
  CREATE INDEX "_terms_v_latest_idx" ON "_terms_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_terms_v_locales_locale_parent_id_unique" ON "_terms_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "impressum_seo_seo_image_idx" ON "impressum" USING btree ("seo_image_id");
  CREATE INDEX "impressum__status_idx" ON "impressum" USING btree ("_status");
  CREATE UNIQUE INDEX "impressum_locales_locale_parent_id_unique" ON "impressum_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_impressum_v_version_seo_version_seo_image_idx" ON "_impressum_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_impressum_v_version_version__status_idx" ON "_impressum_v" USING btree ("version__status");
  CREATE INDEX "_impressum_v_created_at_idx" ON "_impressum_v" USING btree ("created_at");
  CREATE INDEX "_impressum_v_updated_at_idx" ON "_impressum_v" USING btree ("updated_at");
  CREATE INDEX "_impressum_v_snapshot_idx" ON "_impressum_v" USING btree ("snapshot");
  CREATE INDEX "_impressum_v_published_locale_idx" ON "_impressum_v" USING btree ("published_locale");
  CREATE INDEX "_impressum_v_latest_idx" ON "_impressum_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_impressum_v_locales_locale_parent_id_unique" ON "_impressum_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_website_forms_fk" FOREIGN KEY ("website_forms_id") REFERENCES "public"."website_forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_website_forms_id_idx" ON "payload_locked_documents_rels" USING btree ("website_forms_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("form_submissions_id");
  CREATE INDEX "home_seo_seo_image_idx" ON "home" USING btree ("seo_image_id");
  CREATE INDEX "_home_v_version_seo_version_seo_image_idx" ON "_home_v" USING btree ("version_seo_image_id");`)
  // Starter content is added after all migrations by `pnpm content:seed`: the Local API
  // uses the current schema, which an empty database replaying this migration lacks.
  payload.logger.info(
    'Website pages: run `pnpm content:seed` after migrating to add starter content.',
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "website_forms_fields_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "website_forms_fields_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "website_forms_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "website_forms_fields_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "website_forms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "website_forms_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_website_forms_v_version_fields_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_website_forms_v_version_fields_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_website_forms_v_version_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_website_forms_v_version_fields_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_website_forms_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_website_forms_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "services" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "services_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_services_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_services_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_about_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_about_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "how_it_works" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "how_it_works_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_how_it_works_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_how_it_works_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_faq_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_faq_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contact_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contact_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "privacy" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "privacy_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_privacy_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_privacy_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "terms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "terms_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_terms_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_terms_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "impressum" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "impressum_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_impressum_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_impressum_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "website_forms_fields_options" CASCADE;
  DROP TABLE "website_forms_fields_options_locales" CASCADE;
  DROP TABLE "website_forms_fields" CASCADE;
  DROP TABLE "website_forms_fields_locales" CASCADE;
  DROP TABLE "website_forms" CASCADE;
  DROP TABLE "website_forms_locales" CASCADE;
  DROP TABLE "_website_forms_v_version_fields_options" CASCADE;
  DROP TABLE "_website_forms_v_version_fields_options_locales" CASCADE;
  DROP TABLE "_website_forms_v_version_fields" CASCADE;
  DROP TABLE "_website_forms_v_version_fields_locales" CASCADE;
  DROP TABLE "_website_forms_v" CASCADE;
  DROP TABLE "_website_forms_v_locales" CASCADE;
  DROP TABLE "form_submissions" CASCADE;
  DROP TABLE "services" CASCADE;
  DROP TABLE "services_locales" CASCADE;
  DROP TABLE "_services_v" CASCADE;
  DROP TABLE "_services_v_locales" CASCADE;
  DROP TABLE "about" CASCADE;
  DROP TABLE "about_locales" CASCADE;
  DROP TABLE "_about_v" CASCADE;
  DROP TABLE "_about_v_locales" CASCADE;
  DROP TABLE "how_it_works" CASCADE;
  DROP TABLE "how_it_works_locales" CASCADE;
  DROP TABLE "_how_it_works_v" CASCADE;
  DROP TABLE "_how_it_works_v_locales" CASCADE;
  DROP TABLE "faq" CASCADE;
  DROP TABLE "faq_locales" CASCADE;
  DROP TABLE "_faq_v" CASCADE;
  DROP TABLE "_faq_v_locales" CASCADE;
  DROP TABLE "contact" CASCADE;
  DROP TABLE "contact_locales" CASCADE;
  DROP TABLE "_contact_v" CASCADE;
  DROP TABLE "_contact_v_locales" CASCADE;
  DROP TABLE "privacy" CASCADE;
  DROP TABLE "privacy_locales" CASCADE;
  DROP TABLE "_privacy_v" CASCADE;
  DROP TABLE "_privacy_v_locales" CASCADE;
  DROP TABLE "terms" CASCADE;
  DROP TABLE "terms_locales" CASCADE;
  DROP TABLE "_terms_v" CASCADE;
  DROP TABLE "_terms_v_locales" CASCADE;
  DROP TABLE "impressum" CASCADE;
  DROP TABLE "impressum_locales" CASCADE;
  DROP TABLE "_impressum_v" CASCADE;
  DROP TABLE "_impressum_v_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_website_forms_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_submissions_fk";
  
  ALTER TABLE "home" DROP CONSTRAINT "home_seo_image_id_media_id_fk";
  
  ALTER TABLE "_home_v" DROP CONSTRAINT "_home_v_version_seo_image_id_media_id_fk";
  
  DROP INDEX "payload_locked_documents_rels_website_forms_id_idx";
  DROP INDEX "payload_locked_documents_rels_form_submissions_id_idx";
  DROP INDEX "home_seo_seo_image_idx";
  DROP INDEX "_home_v_version_seo_version_seo_image_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "website_forms_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "form_submissions_id";
  ALTER TABLE "home" DROP COLUMN "seo_image_id";
  ALTER TABLE "home" DROP COLUMN "seo_no_index";
  ALTER TABLE "home_locales" DROP COLUMN "sections";
  ALTER TABLE "home_locales" DROP COLUMN "seo_title";
  ALTER TABLE "home_locales" DROP COLUMN "seo_description";
  ALTER TABLE "_home_v" DROP COLUMN "version_seo_image_id";
  ALTER TABLE "_home_v" DROP COLUMN "version_seo_no_index";
  ALTER TABLE "_home_v_locales" DROP COLUMN "version_sections";
  ALTER TABLE "_home_v_locales" DROP COLUMN "version_seo_title";
  ALTER TABLE "_home_v_locales" DROP COLUMN "version_seo_description";
  DROP TYPE "public"."enum_website_forms_fields_type";
  DROP TYPE "public"."enum_website_forms_status";
  DROP TYPE "public"."enum__website_forms_v_version_fields_type";
  DROP TYPE "public"."enum__website_forms_v_version_status";
  DROP TYPE "public"."enum__website_forms_v_published_locale";
  DROP TYPE "public"."enum_form_submissions_locale";
  DROP TYPE "public"."enum_form_submissions_status";
  DROP TYPE "public"."enum_services_status";
  DROP TYPE "public"."enum__services_v_version_status";
  DROP TYPE "public"."enum__services_v_published_locale";
  DROP TYPE "public"."enum_about_status";
  DROP TYPE "public"."enum__about_v_version_status";
  DROP TYPE "public"."enum__about_v_published_locale";
  DROP TYPE "public"."enum_how_it_works_status";
  DROP TYPE "public"."enum__how_it_works_v_version_status";
  DROP TYPE "public"."enum__how_it_works_v_published_locale";
  DROP TYPE "public"."enum_faq_status";
  DROP TYPE "public"."enum__faq_v_version_status";
  DROP TYPE "public"."enum__faq_v_published_locale";
  DROP TYPE "public"."enum_contact_status";
  DROP TYPE "public"."enum__contact_v_version_status";
  DROP TYPE "public"."enum__contact_v_published_locale";
  DROP TYPE "public"."enum_privacy_status";
  DROP TYPE "public"."enum__privacy_v_version_status";
  DROP TYPE "public"."enum__privacy_v_published_locale";
  DROP TYPE "public"."enum_terms_status";
  DROP TYPE "public"."enum__terms_v_version_status";
  DROP TYPE "public"."enum__terms_v_published_locale";
  DROP TYPE "public"."enum_impressum_status";
  DROP TYPE "public"."enum__impressum_v_version_status";
  DROP TYPE "public"."enum__impressum_v_published_locale";`)
}
