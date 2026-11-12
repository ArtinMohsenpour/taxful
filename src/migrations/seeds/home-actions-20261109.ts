import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'

// Plain SQL, not the Local API: the Local API reads Home with the *current* config,
// whose columns may only be added by later migrations.
//
// Publishes the two starter hero buttons once, on the published Home and its latest
// version. Skips when Home already has buttons or an unpublished draft is pending
// (publishing over it would discard the draft). Safe to re-run.
export async function seedHomeActions(db: MigrateUpArgs['db'], log: (message: string) => void) {
  const pending = await db.execute(sql`
    SELECT 1 FROM "_home_v" WHERE "latest" AND "version__status" <> 'published' LIMIT 1
  `)
  if ((pending as { rows?: unknown[] }).rows?.length) {
    log('Home has an unpublished draft; add hero buttons in Pages → Home.')
    return
  }
  await db.execute(sql`
    WITH "target" AS (
      SELECT "id" FROM "home"
      WHERE "_status" = 'published'
        AND NOT EXISTS (SELECT 1 FROM "home_actions" WHERE "_parent_id" = "home"."id")
      LIMIT 1
    )
    INSERT INTO "home_actions" ("_order", "_parent_id", "id", "link_type", "link_path", "link_new_tab")
    SELECT 1, "id", 'home-seed-action-start', 'internal'::"enum_home_actions_link_type", '/signup', false FROM "target"
    UNION ALL
    SELECT 2, "id", 'home-seed-action-pricing', 'internal'::"enum_home_actions_link_type", '/pricing', false FROM "target";

    INSERT INTO "home_actions_locales" ("label", "_locale", "_parent_id")
    SELECT "seed"."label", "seed"."locale"::"_locales", "seed"."action"
    FROM (VALUES
      ('Kostenlos starten', 'de', 'home-seed-action-start'),
      ('Start for free', 'en', 'home-seed-action-start'),
      ('Preise ansehen', 'de', 'home-seed-action-pricing'),
      ('View pricing', 'en', 'home-seed-action-pricing')
    ) AS "seed" ("label", "locale", "action")
    WHERE EXISTS (SELECT 1 FROM "home_actions" WHERE "id" = "seed"."action")
      AND NOT EXISTS (SELECT 1 FROM "home_actions_locales" WHERE "_parent_id" = "seed"."action");

    -- Mirror the seeded buttons onto the latest version so the editor shows them.
    INSERT INTO "_home_v_version_actions" ("_order", "_parent_id", "link_type", "link_path", "link_new_tab", "_uuid")
    SELECT "action"."_order", "version"."id",
      "action"."link_type"::text::"enum__home_v_version_actions_link_type",
      "action"."link_path", "action"."link_new_tab", "action"."id"
    FROM "home_actions" AS "action"
    CROSS JOIN (SELECT "id" FROM "_home_v" WHERE "latest" ORDER BY "id" DESC LIMIT 1) AS "version"
    WHERE "action"."id" IN ('home-seed-action-start', 'home-seed-action-pricing')
      AND NOT EXISTS (
        SELECT 1 FROM "_home_v_version_actions" WHERE "_parent_id" = "version"."id"
      );

    INSERT INTO "_home_v_version_actions_locales" ("label", "_locale", "_parent_id")
    SELECT "label"."label", "label"."_locale", "row"."id"
    FROM "_home_v_version_actions" AS "row"
    JOIN "home_actions_locales" AS "label" ON "label"."_parent_id" = "row"."_uuid"
    WHERE "row"."_uuid" IN ('home-seed-action-start', 'home-seed-action-pricing')
      AND NOT EXISTS (
        SELECT 1 FROM "_home_v_version_actions_locales" WHERE "_parent_id" = "row"."id"
      );
  `)
}
