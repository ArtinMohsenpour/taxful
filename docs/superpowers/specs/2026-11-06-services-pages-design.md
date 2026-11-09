# Services pages: design

Date: 6 November 2026. Status: approved; revised the same day (Revision 2 below).

## Revision 2: build on the website page builder

After approval, the previously uncommitted website page builder (`docs/website-builder.md`) was committed to `main` and merged into this branch. It already provides the `/services` landing page as a `services` page global, section layouts, rich text, page SEO fields, metadata, `sitemap.ts`, `robots.ts`, `WEBSITE_URL` and live preview. The user asked to replace the old Services page with this design while keeping the change clean and minimal. Revision 2 therefore keeps every product decision, keyword, copy rule and article below, and changes only the implementation:

| Area            | Original design                              | Revision 2                                                                                                                                       |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing page    | New `services-page` global with own blocks   | Existing `services` page global; its content is replaced by a new **draft** version (published starter content stays until an editor publishes) |
| Service pages   | `services` collection                        | `service-pages` collection (the `services` slug belongs to the landing global), still served at `/[locale]/services/[slug]`                      |
| Article content | Nine new article blocks                      | Existing page sections (`sectionsField()`), plus two new content item types available on every builder page: **FAQ** and **Service cards**      |
| Callouts, steps | Dedicated blocks                             | Accent/cream sections and rich-text lists; comparison as a 50 % / 50 % section                                                                   |
| SEO fields      | New `seo` group, required meta fields        | Existing `seoFields` (optional title/description with fallbacks to title and summary)                                                           |
| Metadata        | New helpers, `NEXT_PUBLIC_SITE_URL`          | Existing `pageMetadata` logic generalized for a path; existing `WEBSITE_URL`                                                                     |
| Structured data | Service, Breadcrumb, FAQPage, ItemList       | Service, BreadcrumbList, FAQPage; FAQPage also on builder pages with FAQ items; ItemList dropped                                                  |
| Sitemap, robots | New files                                    | Existing files; sitemap adds published, indexable service pages                                                                                  |
| Seeding         | Separate content migration and seed script   | One migration (schema + seed), following `20261009_183700_website_page_builder`; seeds in `src/migrations/seeds/`                               |
| Docs            | New `docs/services.md`                       | A Services section in `docs/website-builder.md`                                                                                                  |

Forms are not offered on service pages (form submissions are bound to page globals).

## Goal

Publish SEO-focused, bilingual pages for Taxful's e-invoice software services so German businesses find Taxful when searching for e-invoice tasks. A Services landing page shows every service as a card; each service has its own article page with its own title tag, meta description, canonical URL and structured data. Editors manage everything in Payload.

The About, How it works, FAQ and other pages already use the page builder; the FAQ and Service cards content items added here are available to them too.

## Decisions

| Topic         | Decision                                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service scope | E-invoice software only. No tax advice (Steuerberatung) or tax-return services.                                                                                                                                            |
| Structure     | One Payload document and URL per service, plus a landing page.                                                                                                                                                             |
| Services      | Six pages (below).                                                                                                                                                                                                         |
| CMS model     | `services` collection and `services-page` global; reusable article blocks in `src/blocks/`.                                                                                                                                |
| URLs          | `/de/services`, `/en/services`, `/[locale]/services/[slug]`. Shared English segment, matching `/pricing`.                                                                                                                  |
| Slugs         | One slug per service, identical in both locales (not localized). German keyword slugs, because German search is the primary market.                                                                                        |
| Landing page  | `services-page` global with a **Service cards** block rendering a responsive card grid.                                                                                                                                    |
| Seeding       | Copy lives in `src/content/services/`; a content migration creates the documents as **drafts**. A qualified stakeholder reviews the legal statements and publishes in Payload.                                             |
| Free tier     | Copy may say "kostenlos starten" and mention upgrades. It does not state allowance numbers; `/pricing` and the CMS plan settings own them. Development defaults list 10 documents/month for Free; the intended limit is 5. |

## Services and keyword map

Keywords come from German Google autocomplete (6 November 2026) and competitor pages. Each page targets one primary keyword in its H1, first sentence, slug, meta title and meta description; secondary keywords appear naturally in H2s, body and FAQ questions.

| #   | Slug                                   | DE primary keyword           | DE secondary keywords                                                                                                                | EN primary keyword            | Product reality                                                                                                                                                |
| --- | -------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `e-rechnung-erstellen`                 | E-Rechnung erstellen         | XRechnung erstellen, ZUGFeRD Rechnung erstellen, E-Rechnung Software, E-Rechnung erstellen online/kostenlos, E-Rechnungspflicht 2027 | create e-invoices for Germany | Manual outgoing invoices, saved customers/products, reserved numbers `TF-YYYY-…`, XRechnung 3.0.2 UBL and ZUGFeRD EN16931 PDF/A-3, independent validation      |
| 2   | `pdf-in-e-rechnung-umwandeln`          | PDF in XRechnung umwandeln   | PDF in E-Rechnung umwandeln, E-Rechnung aus PDF erstellen, ZUGFeRD aus PDF, Word/Scan/Foto in E-Rechnung                             | convert PDF to XRechnung      | Upload PDF/DOCX/JPEG/PNG/WebP/TIFF/GIF/AVIF, malware scan, classification, AI-assisted extraction, mandatory human review, approval, validated export          |
| 3   | `e-rechnung-empfangen`                 | E-Rechnung empfangen         | XRechnung öffnen, XRechnung lesen, XRechnung Viewer, ZUGFeRD öffnen, E-Rechnung empfangen Kleinunternehmer, XRechnung öffnen Mac     | receive and open e-invoices   | Incoming uploads of XRechnung XML and ZUGFeRD PDFs parsed locally without AI, readable summary, unchanged original kept; ordinary PDFs/images use extraction   |
| 4   | `e-rechnung-pruefen`                   | E-Rechnung prüfen            | XRechnung Validator, ZUGFeRD Validator, XRechnung validieren, E-Rechnung prüfen online, KoSIT Validator                              | XRechnung validator           | KoSIT validation for XRechnung, Mustangproject validation for ZUGFeRD XML and PDF/A, report bound to file hashes; invalid files cannot be marked reviewed      |
| 5   | `gutschrift-korrektur-schlussrechnung` | E-Rechnung Gutschrift        | Korrekturrechnung E-Rechnung, Rechnungskorrektur XRechnung, Abschlagsrechnung E-Rechnung, Schlussrechnung E-Rechnung, Teilrechnung   | credit notes and corrections  | Types 381, 384, 326, 386 (ZUGFeRD only), 380 final invoice with actual payment deductions; originals never modified; self-billing not supported                |
| 6   | `rechnungen-digital-verwalten`         | Rechnungen digital verwalten | E-Rechnungen archivieren, Belege digitalisieren, Rechnungsfreigabe, Rechnungen im Team prüfen                                        | manage invoices digitally     | Private storage, search/filters, previews, outgoing/incoming/unassigned views, company workspaces, roles, approval rights, MFA and passkeys, immutable exports |

The landing page targets "E-Rechnung Software" and "XRechnung und ZUGFeRD", and introduces the e-invoicing obligation.

English pages are adapted for English searches, not translated literally.

## Copy rules

- State only implemented behaviour. Use "Taxful" as the product name; no invented customer counts, ratings, awards or testimonials.
- Never offer tax advice. Each service includes a limitations callout: Taxful is software, not a Steuerberater; it does not submit to ELSTER or the tax office; accounting tools such as DATEV or Lexware are file sources, not direct integrations.
- Do not claim: "GoBD-konform", "revisionssicher", "rechtssicher", EU hosting or EU-only processing, production email delivery, or support for self-billing, all VAT categories or foreign VAT.
- Generated XML is never described as a tax-return format.
- Present AI extraction as an assisted suggestion that the user always reviews; missing details are flagged, never invented.
- Every legal statement carries "Stand: November 2026" and links to its primary source. Avoid the reported third BMF letter of October 2026: no primary source was found.
- Do not state free-plan allowances; link to `/pricing`.
- German copy uses "Sie". English copy uses plain international English.

### Verified facts for copy

| Fact                                                                                                                                                                | Source                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Since 1 January 2025, domestic B2B supplies generally require e-invoices; recipients must be able to receive them.                                                  | BMF e-invoice FAQ; Wachstumschancengesetz; § 14 UStG               |
| Supplies in 2025 and 2026: paper, or other electronic formats with the recipient's consent, permitted until 31 December 2026.                                       | § 27 Abs. 38 Nr. 1 UStG                                            |
| Supplies in 2027: the same relief applies until 31 December 2027 only if the issuer's prior-year total turnover was at most €800,000; EDI relief until end of 2027. | § 27 Abs. 38 Nr. 2 and 3 UStG                                      |
| From 1 January 2028 the issuing obligation applies to all domestic B2B supplies covered by § 14.                                                                    | § 27 Abs. 38 UStG (transition ends)                                |
| Small-amount invoices up to €250 gross remain exempt.                                                                                                               | § 33 UStDV                                                         |
| Administrative guidance: BMF letters of 15 October 2024 and 15 October 2025.                                                                                        | bundesfinanzministerium.de                                         |
| XRechnung 3.0.2 is current, valid at least until 31 July 2027; XRechnung 4.0 is a pre-release with components announced for spring 2027.                            | KoSIT/XStandards Einkauf (verify on xeinkauf.de before publishing) |
| ZUGFeRD from 2.0.1 qualifies except profiles MINIMUM and BASIC-WL; the latest FeRD release is 2.5.2, effective 1 September 2026.                                    | BMF FAQ; ferd-net.de                                               |
| The XML (XRechnung) or the PDF with embedded XML (ZUGFeRD) is the original that must be retained. Invoices issued from 2025 have an 8-year retention period.        | GoBD amendment of 14 July 2025; BEG IV; § 14b UStG, § 147 AO       |
| Leitweg-ID addresses public-sector recipients only; B2B invoices do not need one.                                                                                   | e-rechnung-bund.de FAQ                                             |

Verify before publishing (the BMF FAQ returned HTTP 503 during research): whether an email inbox suffices for receipt, and the small-business (Kleinunternehmer) exemption from issuing.

## Content model

### Reusable article blocks (`src/blocks/`)

Each block has an `interfaceName`, localized text fields and conservative `maxLength` values.

| Block             | Fields                                                                                                     | Rendering                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `richTextSection` | `heading` (H2), `anchor` (optional, shared), `body` (Lexical: H3, lists, bold, links)                      | `<section>` with H2                                      |
| `steps`           | `heading`, `items[]` {`title`, `text`}                                                                     | `<ol>`                                                   |
| `featureList`     | `heading`, `intro`, `items[]` {`title`, `text`}                                                            | `<ul>` grid                                              |
| `comparisonTable` | `heading`, `caption`, `columns[]` {`label`}, `rows[]` {`cells[]` {`text`}}                                 | `<table>` with `<caption>`, scrollable on mobile         |
| `callout`         | `tone` (`info`, `limitation`, `legal`), `title`, `body` (Lexical)                                          | `<aside>` with tone styling                              |
| `faq`             | `heading`, `items[]` {`question`, `answer` (Lexical)}                                                      | `<details>`/`<summary>`; contributes FAQPage JSON-LD     |
| `cta`             | `heading`, `text`, `primary` {`label`, `href`}, `secondary` {`label`, `href`}                              | Internal paths through the existing `internalHref` rules |
| `relatedServices` | `heading`, `services` (relationship to `services`, hasMany, max 3)                                         | Service cards                                            |
| `serviceCards`    | `heading`, `intro`, `services` (relationship, hasMany, optional; empty means all published by `sortOrder`) | Responsive card grid; landing page only                  |

Article bodies allow every block except `serviceCards`. The landing page allows `richTextSection`, `serviceCards`, `faq`, `callout` and `cta`.

### Collection `services`

- `title` (localized, required, max 90): H1 and card title.
- `slug` (shared, required, unique, indexed): lowercase ASCII words and hyphens; validated by pattern.
- `summary` (localized, required, max 220): card text and lead paragraph.
- `keyPoints` (localized array, 2–4 items, max 80 each): card bullets.
- `icon` (select from existing `public/icons/` names, optional).
- `primaryKeyword` (localized, admin-only guidance; never rendered).
- `content` (blocks, localized as a whole field): each language has its own block list, so English can use adapted sections and FAQs. An empty English list falls back to German.
- `seo` group (localized): `metaTitle` (required, max 60), `metaDescription` (required, max 160), `ogImage` (Media, optional), `noindex` (checkbox).
- `sortOrder` (number, indexed).
- Versions: drafts, `maxPerDoc: CMS_VERSION_LIMIT`.
- Access: `read` returns all for `cmsEditor`, otherwise `{ _status: { equals: 'published' } }`; create, update, delete and readVersions require `cmsEditor`.
- A `beforeOperation` guard mirrors `protectGlobalDrafts` so non-editors cannot request drafts.
- Admin group **Website**; `useAsTitle: 'title'`; default columns title, slug, status, sortOrder.

### Global `services-page`

- `intro` group (localized): `eyebrow`, `heading` (H1), `lead`.
- `layout` blocks field (localized) as listed above.
- `seo` group as for services.
- Same access, draft guard, version limit and preview pattern as `home`.

## Routes and rendering

- `src/app/(frontend)/[locale]/services/page.tsx`: landing page.
- `src/app/(frontend)/[locale]/services/[slug]/page.tsx`: service page; `notFound()` for unknown or unpublished slugs.
- Both are Server Components and keep the Navbar/main layout used by Home and Pricing. Only the live-preview wrapper is a Client Component.
- Data access in `src/lib/services/`: `loadServicesPage`, `loadService(slug)`, `listPublishedServices()`. Public reads pass `overrideAccess: false`, explicit `depth` (1 for related services and Open Graph image) and `select` limited to rendered fields.
- Renderers in `src/components/blocks/`; service-specific UI (card, hero, preview) in `src/components/services/`.
- Rich text uses `@payloadcms/richtext-lexical/react` with converters that route internal links through the locale-aware `Link`, and open external links with `rel="noopener noreferrer"`.
- Visual style follows the semantic tokens in `src/app/globals.css`: ivory background, creamy surface cards, sage accents, brand-ink headings, rounded corners and restrained shadows. Keyboard focus is visible and motion respects `prefers-reduced-motion`.
- Missing English fields fall back to German (Payload `fallback: true`).
- Payload ISR is not introduced; pages render per request like Home.

## SEO

- `NEXT_PUBLIC_SITE_URL` (documented in `.env.example`) sets `metadataBase` in the locale layout.
- `generateMetadata` for both routes: `title` as `metaTitle | Taxful`, `description`, `alternates.canonical` `/{locale}/services[/slug]`, `alternates.languages` `de`, `en`, `x-default` (German), `openGraph` (title, description, url, locale `de_DE`/`en_GB`, image), and `robots: { index: false }` when `noindex` is set or for previews.
- JSON-LD builders in `src/lib/services/structured-data.ts` (pure, unit tested). Output is serialized with `<` escaped as `<` in `<script type="application/ld+json">`.
  - Service page: `Service` (name, description, serviceType, url, provider `Organization` Taxful, areaServed `DE`, availableLanguage `de`/`en`), `BreadcrumbList` (Home > Services > Service), and `FAQPage` when FAQ blocks exist.
  - Landing page: `ItemList` of service URLs and `BreadcrumbList`.
- `src/app/sitemap.ts`: Home, Pricing, Services and published, indexable services in both locales with `alternates.languages`; `lastModified` from `updatedAt`.
- `src/app/robots.ts`: allows public pages; disallows `/admin`, `/api` and `/*/portal`; links the sitemap.
- Internal linking: cards on the landing page, `relatedServices` on every article, CTAs to `/signup` and `/pricing`.

## Content seeding

- `src/content/services/<slug>.ts` exports `{ de, en }` documents typed against generated Payload types. Rich-text values are Markdown strings converted with `convertMarkdownToLexical` from `@payloadcms/richtext-lexical` using the configured editor.
- `src/content/services/services-page.ts` holds the landing page.
- Schema migration: generated by `pnpm payload migrate:create`, reviewed, adds only the new tables.
- Content migration: uses `payload` and `req` from the migration arguments. Creates each service in German as a draft, then updates the English locale on the same document; skips any slug that already exists. Updates the `services-page` global draft only if it has never been saved. `down` removes only documents created by this migration's slugs when they have not been published.
- Nothing is published automatically. The Navbar is not modified; editors add a "Leistungen" / "Services" link pointing to `/services`.

## Preview

- `previewURL(locale, '/services')` and `previewURL(locale, '/services/<slug>')`, with `previewCollection=services` or `previewGlobal=services-page`.
- Draft reads require `requirePreviewUser`. Live Preview uses `@payloadcms/live-preview-react` with the same renderers, as Home does.
- Preview responses are `noindex`.

## Testing

Vitest integration (`tests/int/services.int.spec.ts`, `services-page.int.spec.ts`):

- Anonymous: reads published only; cannot read drafts, versions or create/update/delete.
- CMS editor roles: create, update, read drafts.
- Slug uniqueness and pattern validation.
- `listPublishedServices` order and draft exclusion.
- Content migration creates drafts once and is idempotent.

Unit (`tests/int/services-seo.int.spec.ts`, matching the Vitest include pattern): metadata alternates/canonical, `noindex`, JSON-LD shape and `<` escaping.

Playwright (`tests/e2e/services.e2e.spec.ts`), using seeded published fixtures:

- `/de/services` and `/en/services` render all cards and link to service pages.
- Each service page renders its H1, canonical, `hreflang` and parseable JSON-LD in both locales.
- Language switch keeps the slug; dark theme and 390 px mobile layout have no horizontal scroll; FAQ is keyboard operable.
- Preview without a CMS session returns 404.

Then `pnpm generate:types`, `pnpm generate:importmap`, `pnpm lint`, `pnpm test:int`, the new e2e spec and `pnpm build`.

## Documentation

- `docs/services.md`: editor guide (blocks, SEO field limits, slugs, drafts/publishing, adding the Navbar link), keyword map, copy rules, migration notes.
- `AGENTS.md`: register the new collection, global, routes and SEO files.
- `.env.example`: `NEXT_PUBLIC_SITE_URL`.

## Out of scope

- About, How it works, FAQ, Contact, Privacy and Impressum pages.
- Localized URL segments (`/leistungen`) and localized slugs.
- Blog/guide articles (for example a standalone "E-Rechnungspflicht 2027" guide), which would be a strong next step for informational searches.
- Changing billing plan allowances.
- Search Console setup and analytics.
