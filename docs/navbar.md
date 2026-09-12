# Navbar editor

Open `/admin/globals/navbar` or **Website → Navbar** in Payload.

## Live preview and history

Open **Live Preview** in the Navbar editor to see unsaved changes alongside the form. Select Mobile, Tablet, or Desktop and switch the editor locale to preview German or English. The regular Preview button opens the latest saved draft. Public visitors continue seeing published content until you publish.

Preview requires a signed-in CMS user. It shares the production Navbar renderer, including Media logo population. No autosave is needed for live updates, so typing does not create database versions.

Navbar keeps at most 25 versions using Payload's built-in retention on new version creation. Users and Media have no version history enabled. Future versioned collections should use `maxPerDoc: CMS_VERSION_LIMIT`; globals use `max: CMS_VERSION_LIMIT`. Future pages can reuse `previewURL`, `requirePreviewUser`, and the same server-data/client-preview pattern. Their content models and renderers still need to be built.

Implementation follows [Payload's client live-preview documentation](https://payloadcms.com/docs/live-preview/client).

Use **Company logo** to upload or select an image from Media, then publish. Its aspect ratio is preserved and it replaces the default Taxful branding. Remove the image to restore the default. The current internal page has an accent background; dropdown parents also highlight when a child is active.

The additive `20260911_141108_navbar_logo` migration adds optional Media references to the Navbar and its versions. Its SQL has been applied to the existing local development database, whose migration history still requires baselining as described below.

1. Add an item and enter its label. Use the locale selector to translate German and English labels; the order and structure are shared.
2. Select **Link / button** or **Dropdown**.
3. For a link, choose text or button appearance, then an internal slug/path (`/`, `about`, `/about`, `/#faq`) or an external HTTP/HTTPS URL. Do not include `/de` or `/en`; the frontend adds the active locale. Paths do not create pages.
4. For a dropdown, add child links with their own labels and destinations. One level of children is supported.
5. Optionally open a link in a new tab. Drag rows to reorder.
6. Save a draft while editing, then **Publish**. Published navigation is loaded on the next page request; already-open tabs need a refresh.

Anonymous visitors can read public navigation but cannot update it. Signed-in users from the current CMS-only Users collection can edit it. Revise this permission when introducing client accounts; it must not become a permission for all future client users.

The frontend displays published content with German translation fallback. Login is a disabled frontend placeholder. The theme control shows only sun/moon; new visitors still inherit the system preference until explicitly choosing light or dark.

## Database

PostgreSQL auto-push is disabled to prevent automatic schema deletion. The initial migration creates a fresh database schema. The existing local database's Navbar tables were explicitly rebuilt on user request; previous menu entries and version history were removed. Users, Media, and other tables were preserved. Future schema changes require a generated, reviewed migration.

Do not apply the initial CREATE TABLE migration directly to a database with existing application tables. Baseline that database after verifying its schema, or use the migration on a new empty database. No reset command is part of normal development.

## Validation

Integration tests verify anonymous write denial, authenticated localized saves within rolled-back transactions, and safe URL handling. Component tests cover dropdown links, Escape focus recovery, and outside-click dismissal. Frontend tests cover language/theme behavior and the login placeholder.
