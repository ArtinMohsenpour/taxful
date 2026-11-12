import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { seedHomeActions } from './seeds/home-actions-20261109'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_home_actions_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "public"."enum__home_v_version_actions_link_type" AS ENUM('internal', 'external');
  CREATE TABLE "home_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_home_actions_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "home_actions_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_home_v_version_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__home_v_version_actions_link_type" DEFAULT 'internal',
  	"link_path" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_v_version_actions_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "home_actions" ADD CONSTRAINT "home_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_actions_locales" ADD CONSTRAINT "home_actions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_actions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_version_actions" ADD CONSTRAINT "_home_v_version_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_version_actions_locales" ADD CONSTRAINT "_home_v_version_actions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v_version_actions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_actions_order_idx" ON "home_actions" USING btree ("_order");
  CREATE INDEX "home_actions_parent_id_idx" ON "home_actions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "home_actions_locales_locale_parent_id_unique" ON "home_actions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_home_v_version_actions_order_idx" ON "_home_v_version_actions" USING btree ("_order");
  CREATE INDEX "_home_v_version_actions_parent_id_idx" ON "_home_v_version_actions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_home_v_version_actions_locales_locale_parent_id_unique" ON "_home_v_version_actions_locales" USING btree ("_locale","_parent_id");`)

  // Starter buttons; see docs/home.md.
  await seedHomeActions(db, (message) => payload.logger.warn(message))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home_actions" CASCADE;
  DROP TABLE "home_actions_locales" CASCADE;
  DROP TABLE "_home_v_version_actions" CASCADE;
  DROP TABLE "_home_v_version_actions_locales" CASCADE;
  DROP TYPE "public"."enum_home_actions_link_type";
  DROP TYPE "public"."enum__home_v_version_actions_link_type";`)
}
