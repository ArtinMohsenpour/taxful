# Navbar editor

Open `/admin/globals/navbar` or **Site settings → Navigation** in Payload. The footer has its own editor; see `footer.md`. The footer reuses the navbar logo when it has none of its own.

## Live preview and history

Open **Live Preview** in the Navbar editor to see unsaved changes alongside the form. Select Mobile, Tablet, or Desktop and switch the editor locale to preview German or English. The regular Preview button opens the latest saved draft. Public visitors continue seeing published content until you publish.

Preview requires a signed-in CMS user. It shares the production Navbar renderer, including Media logo population. No autosave is needed for live updates, so typing does not create database versions.

Navbar keeps at most 25 versions using Payload's built-in retention on new version creation. Users and Media have no version history enabled. Future versioned collections should use `maxPerDoc: CMS_VERSION_LIMIT`; globals use `max: CMS_VERSION_LIMIT`. Future pages can reuse `previewURL`, `requirePreviewUser`, and the same server-data/client-preview pattern. Their content models and renderers still need to be built.

Implementation follows [Payload's client live-preview documentation](https://payloadcms.com/docs/live-preview/client).

Use **Company logo** to upload or select an image from Media, then publish. Its aspect ratio is preserved and it replaces the default Taxful branding. Remove the image to restore the default. The current internal page has an accent background; dropdown parents also highlight when a child is active.

The additive `20260911_141108_navbar_logo` migration adds optional Media references to the Navbar and its versions. Its SQL has been applied to the existing local development database, whose migration history still requires baselining as described below.

1. Add an item and enter its label. Use the locale selector to translate German and English labels; the order and structure are shared.
2. Select **Link / button** or **Dropdown**.
3. For a link, choose text or button appearance, then an internal page or an external HTTP/HTTPS URL. For internal links, open the **Page** picker (see below) or type a path such as `/about` or `/#faq`. Do not include `/de` or `/en`; the frontend adds the active locale. Paths do not create pages.
4. For a dropdown, add child links with their own labels and destinations. One level of children is supported.
5. Optionally open a link in a new tab. Drag rows to reorder.
6. Save a draft while editing, then **Publish**. Published navigation is loaded on the next page request; already-open tabs need a refresh.

Anonymous visitors can read public navigation but cannot update it. Signed-in users from the current CMS-only Users collection can edit it. Revise this permission when introducing client accounts; it must not become a permission for all future client users.

The frontend displays published content with German translation fallback. Login is a disabled frontend placeholder. The theme control shows only sun/moon; new visitors still inherit the system preference until explicitly choosing light or dark.

## Page picker

Every internal link field (navbar and footer) is a searchable picker. Click or focus it
to see pages grouped as **Website**, **Services** (the overview plus every service page
from the CMS, including drafts), **Legal** and **Customer area**, each with its title in
the editor's current locale and its path. Type to filter by title or path; use the arrow
keys and Enter, or click, to choose. Escape closes the list. Pages that are not published
show a **Draft** badge, and the hint under the field warns that visitors get “page not
found” until they are published.

You can still type any path, for example a campaign page or an anchor such as `/#faq`;
press Enter to keep it. A path that is not in the list is marked as a custom path. Stored
values are unchanged plain paths, so existing links such as `services` keep working and
are recognised.

Choices come from `GET /api/link-targets?locale=de|en`, which only CMS staff can call
(`src/lib/website/link-targets-endpoint.ts`). Folder routes are listed in
`staticLinkTargets` in `src/lib/website/link-targets.ts`; service pages are read from the
CMS. When you add a page folder under `src/app/(frontend)/[locale]/`, add it there (or to
`unlinkableRoutes` for email-token and private portal routes):
`tests/int/link-targets.int.spec.ts` fails until every folder route is accounted for. The
field component is `src/components/admin/page-link-field.tsx`.

## Database

PostgreSQL auto-push is disabled to prevent automatic schema deletion. The initial migration creates a fresh database schema. The existing local database's Navbar tables were explicitly rebuilt on user request; previous menu entries and version history were removed. Users, Media, and other tables were preserved. Future schema changes require a generated, reviewed migration.

Do not apply the initial CREATE TABLE migration directly to a database with existing application tables. Baseline that database after verifying its schema, or use the migration on a new empty database. No reset command is part of normal development.

## Validation

Integration tests cover the page picker's route catalog, service-page listing and editor-only endpoint; component tests cover grouping, filtering, keyboard selection and custom paths. Navbar integration tests verify anonymous write denial, authenticated localized saves within rolled-back transactions, and safe URL handling. Component tests cover dropdown links, Escape focus recovery, and outside-click dismissal. Frontend tests cover language/theme behavior and the login placeholder.
