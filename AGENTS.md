# Taxful project instructions

## Required Payload guidance

This project uses the Payload CMS skill at `.agents/skills/payload/`.
Before changing Payload configuration, collections, fields, hooks, access control, queries, jobs, or APIs, read `.agents/skills/payload/SKILL.md`. Read the relevant file in `.agents/skills/payload/reference/` when the task needs detail beyond the quick reference.

## Product

Taxful is a German-first, bilingual tax-company website and secure document-processing platform. It will have three surfaces:

1. A public company website managed through Payload.
2. A secure client portal for uploading documents, reviewing extracted information, correcting fields, tracking status, and downloading approved output.
3. A staff workspace for reviewing client records, validation issues, approvals, exports, and later tax submissions.

The initial public pages are Home, Services, About, How it works, FAQ, Contact, Privacy, and Impressum. Payload should manage localized content, navigation, SEO metadata, drafts, and publishing.

Customer accounts support company workspaces through Better Auth organizations. Document conversion now supports extraction, human review and validated XRechnung export; billing and subscriptions remain future work.

## Domain boundaries

Invoice conversion and tax-return submission are different workflows:

- XRechnung and ZUGFeRD are structured electronic-invoice formats. They are not universal tax-return formats.
- A German tax submission requires a named ELSTER procedure, tax period, official schema, validation rules, credentials, and an authorized submitting party.
- ELSTER provides ERiC as a native C library for validation and encrypted transmission. Developer registration and a manufacturer ID are required for a production integration. Do not assume ELSTER is a generic REST upload API.
- A PDF, DOCX, image, or scan can omit mandatory tax data. Extraction must expose missing or uncertain information for review and must never invent values.
- Generic internal XML must never be described as an officially accepted tax-office format.

The provisional conversion MVP is: upload, extract, normalize, human review, validate, and export for one agreed input document type and one agreed target profile. Direct submission begins only after an integration proof of concept for one specifically selected ELSTER procedure.

Outputs are XRechnung 3.0.2 UBL and ZUGFeRD EN16931 PDF/CII for supported standard invoices. Classify before invoice extraction; unrelated and uncertain documents must not show invoice fields or permit invoice export. Company owners, admins and reviewers may approve and export. The first ELSTER procedure and authorized submitting party remain product decisions; do not make irreversible submission-model choices that depend on them.

## Current technical baseline

This repository was generated from the Payload blank template with PostgreSQL.

- Package manager: pnpm with a committed `pnpm-lock.yaml`
- Runtime installed for local development: Node.js 26.8.2 through fnm
- Next.js: 16.3.3, App Router
- React and React DOM: 19.2.6
- Payload and all `@payloadcms/*` packages: 3.89.0
- PostgreSQL adapter: `@payloadcms/db-postgres` 3.89.0
- TypeScript: strict mode; generated template currently uses 5.7.3
- Formatting and linting: Prettier 3 and ESLint 9
- Testing: Vitest for integration tests and Playwright for end-to-end tests
- Rich text: Payload Lexical editor
- Image processing: Sharp

Keep `payload`, `@payloadcms/next`, `@payloadcms/ui`, `@payloadcms/db-postgres`, and other Payload packages on exactly the same version. Use current stable releases only, never canary/beta packages or peer-dependency bypass flags. “Latest” means the latest mutually compatible stable set, not blindly upgrading one package. Pin the resolved baseline and review compatibility before dependency changes.

Installed foundation dependencies: Tailwind CSS and `@tailwindcss/postcss` 4.3.3, PostCSS 8.5.28, next-intl 4.14.3, next-themes 0.4.6, and prettier-plugin-tailwindcss 0.8.1. See `docs/frontend-foundation.md` for architecture, configuration, and verification commands. Verify current compatibility before future upgrades.

next-themes 0.4.6 has a tracked pnpm patch for its React client-remount script warning (upstream #397). Preserve `patches/` and the pnpm patch registration on install. Verify locale switching in development mode as well as production; React's script warning is development-only.

## Repository state and generated files

- `src/payload.config.ts` registers `Users`, `Media`, and the localized `Navbar` global. See `docs/navbar.md` for editor usage and database setup.
- PostgreSQL schema push is disabled. Use reviewed migrations; the initial migration targets an empty database and must not be replayed over existing tables.
- `src/app/(frontend)/` contains the placeholder public site.
- `src/app/(payload)/` contains Payload routes and admin UI. Files marked as automatically generated must not be edited manually.
- `src/payload-types.ts` is generated. Run `pnpm generate:types` after schema changes; do not hand-edit it.
- `src/app/(payload)/admin/importMap.js` is generated. Use `pnpm generate:importmap` when required; do not hand-edit it.
- `.env` contains local secrets and is ignored by Git. Never print, commit, or copy its values into documentation, fixtures, or logs.
- `.env.example` and the generated `README.md` still contain MongoDB-oriented template text and must be corrected when the local environment is formalized.
- The generated `docker-compose.yml` is still the template’s MongoDB setup and is not the Taxful database definition. Replace it with an explicit PostgreSQL setup before using Compose as the project workflow.

The agreed local Docker container is `taxful-postgres` using `postgres:18-alpine`, with host port 5436 mapped to container port 5432 because host port 5432 was occupied. Verify the live mapping before infrastructure changes. Preserve its database and volume; do not recreate it when changing frontend configuration. The generated Compose file is not yet the source of truth.

## Target architecture

Keep one repository initially:

- Next.js and Payload application for the public website, client portal, staff UI, and server endpoints.
- PostgreSQL for CMS content, identities, structured records, workflow state, and audit metadata.
- Private object storage for original documents and generated files; do not store large document binaries directly in PostgreSQL.
- A background worker for extraction, OCR, normalization, validation, and export. Prefer Payload jobs if retry, locking, observability, and throughput are sufficient. Add separate queue infrastructure only when justified.
- A later native integration service as the boundary around ERiC. Keep ERiC/native dependencies out of browser and UI code.

Keep document parsing, domain normalization, tax mappings, validators, and submission adapters separate from React components and Payload collection definitions. External providers must be accessed through typed adapters so they can be tested and replaced.

## Proposed data model

Expected core records are Users, Clients, Memberships, Pages, Services, FAQs, Documents, ExtractionRuns, ReviewedRecords, ConversionJobs, Exports, AuditEvents, and later Submissions.

Every private record must belong to a client. Initial roles are `client`, `reviewer`, and `administrator`. CMS publishing rights and private client-data rights are separate permissions. Use explicit status values for workflow state, including `queued`, `processing`, `needs_review`, `failed`, `ready`, `submitted`, and `acknowledged` as applicable.

Preserve source provenance for extracted values when possible, including the source file, page, and location or parser evidence. Store canonical data separately from localized display strings. Preserve monetary precision using PostgreSQL numeric/decimal types or clearly defined integer minor units; never use floating-point arithmetic for money.

## Document workflow

The target processing sequence is:

`upload -> quarantine and security checks -> extract -> normalize -> review and correct -> validate target profile -> approve -> export`

The later submission sequence is:

`authorized submission -> acknowledgement or receipt -> reconciliation or failure handling`

Initial candidate inputs are text PDFs, scanned PDFs, DOCX, JPG, and PNG. Legacy DOC and other formats require an explicitly selected converter plus representative fixtures before being promised.

For every upload:

1. Verify file signature, permitted MIME type, size, and page limits; do not trust the filename or client MIME value.
2. Quarantine and scan before parsing.
3. Extract embedded text or existing structured invoice data first; use OCR only when needed.
4. Normalize into a versioned internal model with provenance and uncertainty indicators.
5. Present the original beside editable extracted fields and block progress on missing mandatory data.
6. Validate business rules and the selected official profile. Well-formed XML alone is not sufficient validation.
7. Generate an immutable, versioned export, validation report, and audit event after approval.

Jobs and submissions must be idempotent. A timeout is not proof that a submission failed; reconcile uncertain results before retransmitting. Never allow a retry to create duplicate exports or submissions.

Treat OCR and AI output as untrusted. Validate it and require human review according to risk. Before sending real client material to any external AI/OCR provider, document the provider, processing region, retention behavior, and contractual data-processing basis. Use synthetic or anonymized files in development and tests.

## Internationalization

- Public and portal routes use `/de` and `/en`; German is the default locale.
- Use `next-intl` for application UI messages and Payload localization for editorial fields.
- Translate navigation, forms, validation errors, notifications, emails, accessibility labels, and metadata.
- Use locale-aware date, number, and currency formatting while retaining canonical stored values.
- Language switching should preserve the equivalent page where available.
- Add localized canonical URLs, `hreflang`, and localized sitemaps.
- Define explicit fallback and publishing behavior for missing translations.
- Official schema identifiers and transmitted code values remain unchanged even when labels are translated.

## Visual system and accessibility

The design direction is bright, soft, and professional: warm ivory backgrounds, creamy surfaces, sage accents, deeper olive text, rounded navigation, and restrained shadows. The user's palette references are #8B9A6E, #F7F2EB, #EAE2D6, and #EEEEEE.

Semantic tokens live in `src/app/globals.css` and map to Tailwind v4 utilities with `@theme inline`. Import this stylesheet only from the frontend locale layout; do not apply its reset to the Payload admin. Components must use semantic tokens instead of hardcoded palette values.

| Token              | Light     | Dark      |
| ------------------ | --------- | --------- |
| background         | `#F7F2EB` | `#1D211B` |
| surface            | `#FFFDF9` | `#272C23` |
| foreground         | `#30372B` | `#F7F2EB` |
| muted foreground   | `#696C60` | `#BCBFB0` |
| primary            | `#8B9A6E` | `#A6B58B` |
| primary foreground | `#20271A` | `#20271A` |
| border             | `#E2DBCF` | `#3D4435` |
| accent             | `#EAE2D6` | `#343B2D` |
| brand ink          | `#52613F` | `#BDCBA6` |

Use primary for sage surfaces and primary foreground for their text; use brand ink for olive text on pale surfaces. Check contrast when introducing new combinations. The navbar has two animated controls: a DE/EN switch and a light/dark toggle. The system preference is used initially, without a separate system icon. Keep keyboard labels localized and disable motion under prefers-reduced-motion.

Navbar items are read from the published Payload global for each request, with German fallback. CMS users may edit and publish navigation. Customer identities remain separate from Payload Users. The navbar links to customer login or the customer portal according to the customer session.

## Customer authentication

- Better Auth manages customer identities and database sessions in the separate PostgreSQL `customer_auth` schema. Do not alter Payload Admin authentication to implement customer features.
- The endpoint is `/api/customer-auth`; localized customer pages include login, signup, forgot/reset password, email verification, invitation acceptance, portal, and portal security.
- Apply reviewed customer SQL using `pnpm customer:migrate`. These migrations have their own ledger and must not be mixed with Payload migrations.
- Organizations represent company workspaces; membership roles are owner, admin, member, and reviewer. In document processing, owners, admins, and reviewers may approve/export; members may upload and save drafts. Enforce this on the server.
- Enforce session and organization membership on the server for all future private features. Existing portal pages use `requireCustomer` and `getCustomerWorkspace`.
- Local email uses Mailpit (`pnpm customer:mail`, inbox http://localhost:8026). Customer email verification is required.
- Customer signup and profile use required `firstName` and `lastName` fields (75 characters each). Server hooks derive Better Auth's display `name`. Migration 0003 preserves existing display names without guessing name parts; existing customers complete those fields when saving their profile.
- Portal navigation uses a responsive sidebar: overview, converter, files, team, profile, security, and logout. Converter and Files now implement private uploads, asynchronous extraction, review and XRechnung export. Workspace SVG icons live in `public/icons/` and are rendered with a color-inheriting mask.
- See `docs/document-converter.md` for supported formats, data isolation, quotas, worker/services, Gemini setup and export boundaries. Do not label XRechnung as a tax return or bypass KoSIT validation. Preserve immutable approvals/exports and server-side entitlement enforcement.
- Document progress is persisted, with conservative local-text/vision routing and at most one visual fallback. File history uses server-side search, status/type/date filters, Berlin date groups and pagination. Keep original/export download authorization and revision checks on the server. Provider response schemas are compact; full strict validation remains local.
- File preview supports PDF canvases, normalized images, DOCX text and escaped XML. Deletion requires confirmation and current uploader/owner/admin permission; removes all document versions, preserves usage, and uses a durable storage-cleanup queue. Do not permit active workers to recreate deleted artifacts.
- MFA, billing and direct ELSTER submission are deferred. ZUGFeRD EN16931 export now uses shared canonical invoice data, separate CII mapping, Mustangproject PDF/A generation and independent PDF/XML validation; see `docs/invoice-export-profiles.md`.
- See `docs/customer-auth.md` for setup and operational details.

Support light, dark, and system preferences; persist explicit choices and prevent initial theme flashing. Target WCAG 2.2 AA, keyboard navigation, visible focus, meaningful semantics, reduced motion, and responsive layouts from mobile upward.

## Payload and authorization rules

- CMS Users have required `super-admin` (owner), `manager`, or `content-editor` roles. Only owners may grant owner access or modify owner accounts. Managers manage other staff; editors can read/update only their own profile and cannot modify roles. All three roles can edit Navbar. Keep future client identities separate. See `docs/cms-users.md` for profile fields, bootstrap, and migration notes.

- Reuse `CMS_VERSION_LIMIT` (25) from `src/lib/cms-settings.ts`: globals use `versions.max`, collections use `versions.maxPerDoc`. Do not enable versioning for Users or Media without a requirement.
- Navbar supports unsaved live preview using the official hook and the shared NavbarView. Reuse `previewURL` and `requirePreviewUser` for future pages, then add their own live data renderer. Preview requests must authenticate CMS users before fetching drafts. Public requests must continue using published content.

- Default access to private collections is denied and then granted deliberately.
- Enforce client isolation on the server for every read, write, export, and file download. Hiding UI is not authorization.
- Payload Local API bypasses access control by default. When acting on behalf of a user, pass the user and set `overrideAccess: false`.
- Pass `req` into nested Payload operations in hooks so they remain in the same transaction.
- Use `req.context` guards when a hook-triggered operation could call the same hook again.
- Keep reusable access functions in `src/access/`, collections in separate files, and reusable hooks in `src/hooks/`.
- Set explicit relationship depth or field selection to prevent accidental over-fetching and data leakage.
- Use restrictive upload collection access. The template’s current public `Media.read` rule is acceptable only for public website assets and must not be reused for client documents.
- Index fields used for tenant boundaries, statuses, identifiers, job lookup, and common filters.

## Security and privacy

Use private object storage, short-lived authorized downloads, encryption in transit and at rest, secure sessions, staff MFA, rate limiting, upload limits, and protected credentials. Keep secrets, full document contents, personal tax data, and authentication material out of logs.

Prefer EU-hosted application, database, storage, backups, and processing. Document actual data flows, retention/deletion policies, subprocessors, and processor agreements. EU hosting alone does not establish GDPR compliance. Legal copy and retention decisions require review by the company’s qualified legal/tax stakeholders.

Use separate development, staging, and production environments with distinct secrets and data. Maintain versioned database migrations, automated backups, restore tests, monitoring for job failures and queue depth, and an incident-ready audit trail.

## Coding conventions

- Use TypeScript strict mode; avoid `any`. Validate all external input at runtime.
- Prefer Server Components. Add Client Components only for actual browser state or interactivity and keep their boundary small.
- Keep business logic in typed domain modules and services, not route handlers or visual components.
- Use the `@/*` alias for `src/*` imports and `@payload-config` for Payload config.
- Follow the existing Prettier and ESLint configuration. Do not reformat unrelated files.
- Keep migrations, generated types, tests, and implementation changes together when a schema change requires them.
- Preserve existing user changes and inspect `git status` before editing. Do not overwrite generated or unrelated work.
- Do not add a library for a small function already supported by the platform. When adding a dependency, record why it is needed and verify maintenance, compatibility, and licensing.
- Do not expose implementation details, provider errors, stack traces, or official-looking claims to end users unless they help users take a valid action.

## Local commands and quality gates

Use pnpm commands from the repository root:

```bash
pnpm dev
pnpm lint
pnpm generate:types
pnpm generate:importmap
pnpm test:int
pnpm test:e2e
pnpm build
```

After schema changes, generate types and migrations as appropriate. Before completing a feature, run the smallest meaningful checks for that change, then run lint and a production build for foundation or cross-cutting changes. Test access-control rules with both allowed and denied cases. Use integration tests for Payload/data behavior and end-to-end tests for critical user workflows, both locales, themes, uploads, review, and export.

Official format work requires fixtures for valid, malformed, incomplete, and unsupported inputs plus validation against the selected official schema/profile. Submission work must test rejection, duplicate prevention, timeouts, reconciliation, and receipt storage.

## Delivery order

1. Domain discovery: agree on audience, representative inputs, first output/procedure, required fields, reviewer, and destination.
2. Foundation: correct Docker/PostgreSQL setup, environment documentation, Tailwind tokens, locale routing, themes, CI, and compatible dependencies.
3. Public website: responsive bilingual pages, CMS models, preview/publishing, SEO, accessibility, and legal pages.
4. Secure portal: authentication, client isolation, private uploads, and job status.
5. Conversion MVP: one complete extraction, review, validation, and export path.
6. Submission pilot: one selected ELSTER procedure with test transmission, authorization, receipts, idempotency, and recovery.
7. Production launch: hosting, storage, monitoring, backups, restore rehearsal, access review, and end-to-end acceptance.

The public website may launch before conversion and submission. Do not estimate or promise direct ELSTER submission until developer access and the first supported procedure are confirmed.

## Authoritative references

- Payload documentation: https://payloadcms.com/docs
- Payload bundled reference: `.agents/skills/payload/reference/`
- ELSTER developer and ERiC information: https://www.elster.de/eportal/infoseite/entwickler?locale=de_DE
- German Federal Ministry of Finance e-invoice FAQ: https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html
- Next.js documentation: https://nextjs.org/docs
- Tailwind theme variables: https://tailwindcss.com/docs/theme
- next-intl documentation: https://next-intl.dev/
- PostgreSQL documentation: https://www.postgresql.org/docs/

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Local processing visibility

Company invoice profiles live in `customer_auth.company_invoice_profiles`, editable by current owners/admins. Review shows all saved company details; prefill only fills blanks for an explicitly selected party or an unambiguous tax-identifier match. EUR/DE are marked defaults for blank fields, never replacements for source values. Keep approval field navigation, decimal arithmetic checks, official unit-code validation and persisted export failures. Never silently repair tax treatment or alter approved snapshots.

`pnpm dev` now runs Next.js and the document worker together via `scripts/dev.ts`. Keep PostgreSQL and `pnpm documents:services` running. Preserve safe structured stage logs and tenant-scoped processing activity. The worker heartbeat makes offline processing visible; queued files must not highlight Safety check until claimed. Scanner outages must not consume extraction attempts or bypass malware checking.
