import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Replaces the planned tax-office destination with the incoming-invoice lane. The
// dropped labels only held the default wording; the new ones are optional and fall
// back to the translations in messages/*.json. See docs/home.md.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home_locales" ADD COLUMN "diagram_partners" varchar;
  ALTER TABLE "home_locales" ADD COLUMN "diagram_partner_formats" varchar;
  ALTER TABLE "home_locales" ADD COLUMN "diagram_inbox" varchar;
  ALTER TABLE "home_locales" ADD COLUMN "diagram_inbox_storage" varchar;
  ALTER TABLE "_home_v_locales" ADD COLUMN "version_diagram_partners" varchar;
  ALTER TABLE "_home_v_locales" ADD COLUMN "version_diagram_partner_formats" varchar;
  ALTER TABLE "_home_v_locales" ADD COLUMN "version_diagram_inbox" varchar;
  ALTER TABLE "_home_v_locales" ADD COLUMN "version_diagram_inbox_storage" varchar;
  ALTER TABLE "home_locales" DROP COLUMN "diagram_tax_office";
  ALTER TABLE "home_locales" DROP COLUMN "diagram_tax_submission";
  ALTER TABLE "_home_v_locales" DROP COLUMN "version_diagram_tax_office";
  ALTER TABLE "_home_v_locales" DROP COLUMN "version_diagram_tax_submission";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // The previous schema required these labels, so restore their default wording.
  await db.execute(sql`
   ALTER TABLE "home_locales" ADD COLUMN "diagram_tax_office" varchar;
  ALTER TABLE "home_locales" ADD COLUMN "diagram_tax_submission" varchar;
  ALTER TABLE "_home_v_locales" ADD COLUMN "version_diagram_tax_office" varchar;
  ALTER TABLE "_home_v_locales" ADD COLUMN "version_diagram_tax_submission" varchar;
  ALTER TABLE "home_locales" DROP COLUMN "diagram_partners";
  ALTER TABLE "home_locales" DROP COLUMN "diagram_partner_formats";
  ALTER TABLE "home_locales" DROP COLUMN "diagram_inbox";
  ALTER TABLE "home_locales" DROP COLUMN "diagram_inbox_storage";
  ALTER TABLE "_home_v_locales" DROP COLUMN "version_diagram_partners";
  ALTER TABLE "_home_v_locales" DROP COLUMN "version_diagram_partner_formats";
  ALTER TABLE "_home_v_locales" DROP COLUMN "version_diagram_inbox";
  ALTER TABLE "_home_v_locales" DROP COLUMN "version_diagram_inbox_storage";
  UPDATE "home_locales" SET
    "diagram_tax_office" = CASE "_locale" WHEN 'en' THEN 'Tax office' ELSE 'Finanzamt' END,
    "diagram_tax_submission" = CASE "_locale" WHEN 'en' THEN 'Submission via ELSTER' ELSE 'Übermittlung über ELSTER' END;
  UPDATE "_home_v_locales" SET
    "version_diagram_tax_office" = CASE "_locale" WHEN 'en' THEN 'Tax office' ELSE 'Finanzamt' END,
    "version_diagram_tax_submission" = CASE "_locale" WHEN 'en' THEN 'Submission via ELSTER' ELSE 'Übermittlung über ELSTER' END;`)
}
