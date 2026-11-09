# Services Pages Implementation Plan (Revision 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six SEO service pages at `/[locale]/services/[slug]` and turn the existing Services page into a card overview, reusing the website page builder.

**Architecture:** A `service-pages` collection reuses the builder's `sectionsField()` and `seoFields`. Two new builder content item types, FAQ and Service cards, work on every builder page and service page. The existing metadata, sitemap and preview patterns are extended, not duplicated. One migration adds the schema and seeds drafts.

**Tech Stack:** Payload 3.89.0 (Postgres, `blocksAsJSON`, Lexical), Next.js 16.3.6, next-intl 4.14.3, Tailwind 4 tokens, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-services-pages-design.md` (Revision 2 governs implementation).

## Global Constraints

- Read `.agents/skills/payload/SKILL.md` before Payload changes. No new dependencies; Payload packages stay at 3.89.0.
- Never hand-edit `src/payload-types.ts` or `importMap.js`; regenerate. Create migrations with `pnpm payload migrate:create`, review SQL (no drops of existing objects), apply with `pnpm payload migrate`.
- Collection slug `service-pages`; slug field shared across locales, pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 80, unique.
- Access like builder globals: `cmsEditor` edits and reads drafts; others read `{ _status: { equals: 'published' } }`; draft reads by non-editors throw `Forbidden`. Public reads use `overrideAccess: false` and explicit depth.
- Reuse: `sectionsField()`, `seoFields`, the builder rich-text editor features, `websiteLink`, `websiteOrigin`, `requirePreviewUser`, `previewURL`, `CMS_VERSION_LIMIT`.
- Copy rules and verified facts from the spec; seeded meta titles ≤ 51 characters (rendered title adds ` | Taxful`), meta descriptions ≤ 160; no "GoBD-konform", "revisionssicher", "rechtssicher"; "Stand: November 2026" on legal statements.
- Seeds create drafts only: service pages as drafts, and a draft version of the `services` global.
- No commits unless the user asks.

## Review Focus

1. Service cards that reference a draft or deleted service page: omitted for the public, no draft data. Pinned in Task 2.
2. English service page with no English sections or SEO: German fallback renders and metadata falls back to the German title. Pinned in Task 2.
3. Malformed slug URLs (`/de/services/Bad`, `/de/services/a--b`): 404 without a query. Pinned in Task 2 and Task 5.
4. FAQ answers or titles containing `</script>`: JSON-LD stays inside its script. Pinned in Task 2.
5. Live Preview of a page whose Service cards item has an empty selection: shows all published services, not nothing. Pinned in Task 3 (cards receive the published list as data).

---

### Task 1: Content model

**Files:** Modify `src/fields/website/content.ts`; create `src/collections/ServicePages.ts`, `src/fields/slug.ts`, `src/hooks/protect-collection-drafts.ts`; modify `src/payload.config.ts`; generated types/import map; migration `src/migrations/<ts>_service_pages.ts` (+ `.json`, index entry). Test: `tests/int/services.int.spec.ts`.

**Interfaces (produces):**

- `content.ts`: `export const websiteEditorFeatures` (the existing feature list, now exported and used by the existing `editor`); content `type` options gain `{ label: 'FAQ', value: 'faq' }` and `{ label: 'Service cards', value: 'services' }`; fields `faq` (array, `when('faq')`, required, 1–12 rows: `question` text required max 200, `answer` richText with the same editor, required) and `services` (relationship `service-pages`, `hasMany`, optional, `when('services')`, description: empty shows all published services).
- `ServicePages` collection: sidebar `slug` (from `src/fields/slug.ts`: `SERVICE_SLUG_PATTERN`, `isServiceSlug(value): value is string`, `slugField`), `sortOrder` (number, required, default 100, indexed), `icon` (select: converter, files, preview, security, team, check, company, download); tabs **Content** (`title` required localized max 120, `summary` required localized max 220, `keyPoints` localized array 2–4 × `text` max 80, `sectionsField()`), **SEO** (`seoFields`). `defaultSort: 'sortOrder'`, `useAsTitle: 'title'`, group Website, versions drafts `maxPerDoc: CMS_VERSION_LIMIT`, `hooks.beforeOperation: [protectCollectionDrafts]`, preview/live preview URL `` `${previewURL(locale, `/services/${slug}`)}&previewCollection=service-pages` ``.

- [ ] Write failing tests: anonymous create/draft-read/version-read → `Forbidden`; each CMS role creates a draft hidden from anonymous reads; invalid slugs (`Upper`, `a--b`, `-lead`, `trail-`, `prüfen`, `a/b`, `has space`) → `ValidationError`; duplicate slug → `ValidationError`; a `services` global draft with a FAQ item missing its question → `ValidationError`.
- [ ] Run `pnpm test:int tests/int/services.int.spec.ts` → FAIL (collection not found).
- [ ] Implement; generate types, import map and migration; review SQL; apply.
- [ ] Run → PASS.

### Task 2: Reads, metadata and structured data

**Files:** Create `src/lib/website/service-pages.ts`, `src/lib/website/structured-data.ts`; modify `src/lib/website/metadata.ts`, `src/lib/website/load.ts`, `src/lib/website/types.ts`. Test: `tests/int/service-pages.int.spec.ts`.

**Interfaces (produces):**

- `types.ts`: `ServicePageDocument = ServicePage`; `ServiceCard = Pick<ServicePage, 'id' | 'slug' | 'title' | 'summary' | 'keyPoints' | 'icon'>`.
- `service-pages.ts` (no `server-only`): `readServicePage(payload, slug, { locale, draft, user?, req? }): Promise<ServicePage | null>` (returns `null` for `!isServiceSlug(slug)` without querying; `fallbackLocale: 'de'`, depth 1, media populate like `readWebsitePage`); `listServiceCards(payload, { locale, req? }): Promise<(ServiceCard & { updatedAt: string; noIndex: boolean })[]>` (published only, `sort: 'sortOrder'`, depth 0, limit 100); `selectServiceCards(selected: WebsiteContentItem['services'], published: ServiceCard[]): ServiceCard[]` (empty → all; else selection order, only populated ids present in `published`); `hasServiceCards(sections): boolean`.
- `load.ts`: `loadServicePage(slug, locale, preview)` (cached; `notFound()` when null or unpublished outside preview); `publishedServiceCards(locale)` (cached).
- `metadata.ts`: `seoMetadata({ path, title, description, seo, locale, preview }): Metadata` holds the existing logic; `pageMetadata` delegates to it unchanged in behavior; `servicePageMetadata(doc, locale, preview)` uses path `/services/${slug}`, title `seo.title || `${title} | Taxful``, description `seo.description || summary`.
- `structured-data.ts`: `serializeJsonLd(data): string` (escapes `<` as `<`); `faqJsonLd(sections): object | null`; `servicePageJsonLd(doc, locale): object[]` → `Service` (name, description, url, provider Organization Taxful, areaServed DE, availableLanguage de/en), `BreadcrumbList` (Home, Services, page) and `FAQPage` when FAQ items exist.

- [ ] Write failing tests: published read vs draft-only → null; malformed slug → null and `payload.find` not called; English read falls back to German title/sections; `listServiceCards` order and draft exclusion; `selectServiceCards` drops draft/unknown ids and keeps order; `servicePageMetadata` canonical/alternates/`noIndex`/German fallback; `servicePageJsonLd` types with and without FAQ; `serializeJsonLd` escapes `</script>`; `pageMetadata` output for an existing page global unchanged.
- [ ] Run `pnpm test:int tests/int/service-pages.int.spec.ts` → FAIL. Implement. Run → PASS. Run `pnpm test:int tests/int/website.int.spec.ts` → PASS (no regression).

### Task 3: Rendering and routes

**Files:** Modify `src/components/website/sections.tsx`, `page-content.tsx`, `page-preview.tsx`, `public-page.tsx`, `src/app/sitemap.ts`, `messages/de.json`, `messages/en.json`; create `src/components/website/faq-list.tsx`, `service-cards.tsx`, `json-ld.tsx`, `service-page.tsx`, `service-page-preview.tsx`, `src/app/(frontend)/[locale]/services/[slug]/page.tsx`. Test: `tests/int/service-rendering.int.spec.ts`.

**Interfaces:**

- `WebsiteSections` and `WebsitePageContent` gain optional `services?: ServiceCard[]`; `page` becomes optional (forms render only when a page global is given).
- `FaqList({ items, locale })`: `<div>` of `<details>` with `<summary>` question and `WebsiteRichText` answer.
- `ServiceCards({ services, locale, readMore })`: `<ul>` grid (1 / `sm:2` / `lg:3`), each card `<h3>` title, summary, key points, link `/${locale}/services/${slug}` labelled `readMore` with the title in `aria-label`.
- `PublicWebsitePage` loads `publishedServiceCards(locale)` only when `hasServiceCards(data.sections)`, passes it down (also to preview) and renders `<JsonLd data={faqJsonLd(...)} />` outside preview.
- `ServicePageContent({ data, locale, services, labels })`: header with link back to Services (eyebrow), `<h1>`, lead summary, key points, CTAs `/${locale}/signup` (`Services.startFree`) and `/${locale}/pricing` (`Services.viewPricing`), then `WebsiteSections`.
- Route: `generateMetadata` → `servicePageMetadata`; page renders preview when `preview=true&previewCollection=service-pages`, otherwise content plus `<JsonLd data={servicePageJsonLd(...)} />`.
- Sitemap appends each published, indexable service page for `de`/`en` with alternates and `lastModified`.
- Messages namespace `Services`: `startFree`, `viewPricing`, `readMore`, `keyPoints`, `backToServices`.

- [ ] Write failing component tests: FAQ renders `details`/`summary` and answer links via `websiteLink`; cards render in selection order with localized hrefs; empty selection renders all provided services; draft ids are dropped; a `form` item without `page` renders nothing.
- [ ] Run `pnpm test:int tests/int/service-rendering.int.spec.ts` → FAIL. Implement. Run → PASS.
- [ ] With `pnpm dev`: a published test service page renders at `/de/services/<slug>` and `/en/services/<slug>`; JSON-LD present; Live Preview updates.

### Task 4: Seed content (landing draft + six articles)

**Files:** Create `src/migrations/seeds/services-20261106/` (`markdown.ts`, `types.ts`, `landing.ts`, one file per article, `index.ts` with `seedServicePages(payload, req)`); call it at the end of the Task 1 migration's `up`; `down` deletes seeded slugs that are still drafts. Test: `tests/int/services-seed.int.spec.ts`.

**Interfaces:** `markdown.ts`: `toLexical(markdown, editorConfig)` via `convertMarkdownToLexical` and `editorConfigFactory.fromFeatures({ config, features: websiteEditorFeatures })`. Seeds describe sections as `{ layout: 'fullWidth' | 'twoColumns', title?, subtitle?, tone?, columns: Item[][] }` with items `{ text: markdown } | { faq: { question, answer }[] } | { services: ServiceSlug[] | 'all' }`. `seedServicePages` creates missing service pages as German drafts, then updates English and resolves service-card slugs to ids; writes one draft version of the `services` global in both locales; returns `{ created, skipped }`.

Article requirements: the spec's keyword map, default layout (intro text, how-it-works steps, features, comparison or table-like 50/50 section where useful, accent "Was Taxful nicht übernimmt" limitation section, legal note with sources, FAQ ≥ 5, related service cards, closing text), German 1,000–1,400 words, adapted English, per-article "must cover" list from the previous plan revision (formats, KoSIT/Mustang, types 381/384/326/386/380, roles, etc.). Verify the BMF FAQ claims (email inbox, Kleinunternehmer) before writing them; omit if unverifiable.

- [ ] Write failing tests: drafts created once (second run skips), anonymous cannot read them, English differs from German, `services` global gets a draft while the published version is unchanged, every seed meets length limits and banned-word rules.
- [ ] Run `pnpm test:int tests/int/services-seed.int.spec.ts` → FAIL. Write seeds. Run → PASS. Apply the migration locally.

### Task 5: End-to-end, docs, verification

**Files:** Create `tests/e2e/services.e2e.spec.ts`; modify `docs/website-builder.md` (Services section: service pages, FAQ and Service cards items, slugs, SEO fallbacks, drafts and review, keyword map pointer), `AGENTS.md` (repository state).

- [ ] E2E with a published fixture service page: both locales 200 with H1, canonical, hreflang, parseable JSON-LD incl. FAQPage; language switch keeps slug; `/de/services/Bad-Slug` 404; 390 px dark mode without horizontal scroll; FAQ keyboard-operable; sitemap lists the fixture; anonymous preview 404.
- [ ] Run `pnpm test:e2e tests/e2e/services.e2e.spec.ts` and `tests/e2e/website.e2e.spec.ts` → PASS.
- [ ] `pnpm lint`, `pnpm test:int`, `pnpm build` → PASS.
