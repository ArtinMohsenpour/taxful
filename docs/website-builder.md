# Public website builder

The Payload sidebar groups the website by task: **Services** (service pages and the
Services overview), **Forms** (forms and submissions), **Media** (media library),
**Pages** (Home, About us, How it works, FAQ, Contact us), **Legal** (Privacy policy,
Terms of use, Legal notice (Impressum)), **Site settings** (Navigation, Footer) and
**Administration** (staff accounts; customers & billing for super admins). Group names
live in `ADMIN_GROUPS` (`src/lib/cms-settings.ts`); Payload lists groups that contain
collections first, so the `collections` order in `src/payload.config.ts` sets the order.
The existing home hero and accounting-company diagram remain editable in their
original tabs. Home now also has Content and SEO tabs.

## Editing a page

1. Select German or English. Page title, subtitle and eyebrow are optional.
2. Open **Content**, add a page section and choose **100%**, **50% / 50%** or
   **33% / 33% / 33%**. Reorder, duplicate or remove sections with Payload's controls.
3. Each column contains an ordered list of content items. Choose **Rich text**,
   **Image**, **Video** or **Form** from the content-type dropdown; the appropriate
   fields appear. Multiple items allow combinations such as image plus text.
4. Optionally add section headings, a cream/accent background and vertical centering.
5. Use **Live Preview** to see unsaved edits at mobile, tablet and desktop sizes.
   Save a draft to continue later; **Publish** makes it public. The last 25
   versions are retained. Saving a draft leaves the previous published
   content available until the new version is published.

Sections are independent per locale. Missing English sections fall back to German;
an explicitly empty English array stays empty. Optional page headings stay blank
when cleared, without borrowing German text. Required form labels use German
fallback. Publishing status and nonlocalized settings apply to both languages;
check both before publishing. Preview links require a current CMS session, are
excluded from indexing and can be embedded only on known public page routes.
Private portal pages remain unframeable.

## Media

Images use the Media library and its alt description, with an optional localized
override and natural, square or landscape sizing. Public images are JPEG, PNG,
WebP, AVIF or GIF. Uploads in Media are public website assets: never put client
invoices or private documents there.

Videos use uploaded MP4/WebM files and native player controls. There is no autoplay
or third-party video embed. Optional posters, WebVTT captions and a rich-text
transcript are supported. Add captions for speech and an equivalent description
for visual information. Rich text supports headings H2–H4, lists, quotes, emphasis
and safe links; the optional page heading supplies H1.

Media accepts only these website asset types: JPEG, PNG, WebP, AVIF and GIF images,
SVG logos, MP4/WebM videos and WebVTT captions. The upload policy
(`src/lib/website/media-uploads.ts`) checks the file contents, not just the name: binary
files must match their extension, SVGs must pass the [SVG safety
check](footer.md#svg-safety) and captions must start with `WEBVTT`. Anything else, such as
HTML, XML or PDF, is rejected. Media files are public and served from this site, so every
file response is also sandboxed (`Content-Security-Policy: sandbox; default-src 'none'`,
`X-Content-Type-Options: nosniff`); files of any other type stored before this policy
download instead of opening. Tests: `tests/int/media-uploads.int.spec.ts`.

Media uploads support files up to 50 MB. Payload's file limit and Next's proxy
buffer limit are aligned, with additional room for multipart metadata. Requests
over the limit return an upload-size error rather than storing a partial file.
These public-media limits do not change the private document-upload limits.
Public media population includes `filename`: Payload needs it to calculate `url`.

All columns stack in source order on smaller screens. Two columns appear at
768 px; thirds appear at 1024 px. Styling uses the shared theme tokens, supports
light/dark themes and avoids entrance animations. The home illustration retains
its pause and reduced-motion behavior.

## Forms and inbox

Under **Forms → Forms**, create a reusable form, add fields and translate labels.
Supported fields are short text, email, long text, dropdown and checkbox. Choose
which fields are required. Field keys must be unique, lowercase and stable;
`website` is reserved for the spam trap. Dropdown values must also be unique.
Enable **Accept submissions** and publish the form, then select it in a page's
form content item. A bilingual Contact form is included.

Submitted messages appear under **Forms → Submissions**. CMS staff can
read them, mark them handled or delete them. Answers preserve the field labels
used when the message was submitted. Visitors cannot read this inbox or create
records through Payload REST/GraphQL. The dedicated submission endpoint checks
the origin, request size, rate limit, published page placement, published/enabled
form and every field's type, required value, length and dropdown option. The
endpoint stores a visitor-generated request reference for safe retries without
duplicating a message. It stores no client IP or user-agent in the submission.
Live preview disables sending. Messages are escaped as data and are not logged.

As requested, submissions are saved in the CMS only. No email is sent and there
is no email worker dependency. Staff need to check the inbox. Decide and apply
a retention/deletion policy before production; this builder does not set a legal
retention period or introduce automatic deletion. The public contact form is for
general enquiries; sensitive files belong in the private company workspace.

## SEO and publication

Each page has optional localized SEO title/description, a sharing image and a
search-engine exclusion setting. Canonical, German/English alternate URLs,
Open Graph and Twitter metadata are generated. `/sitemap.xml` lists published,
indexable public pages only; `/robots.txt` excludes private and authentication
routes. Set `WEBSITE_URL` to the real website origin before deployment. It falls
back to `BETTER_AUTH_URL`, including for public form Origin checks. Do not use an
arbitrary request Host header as the canonical origin.

`pnpm content:seed` publishes starter content for Services, About, How it works,
FAQ and Contact (see [Starter content](#starter-content)). Privacy, Terms and Impressum start as drafts with titles and empty
content. Add reviewed company/legal copy and publish them before launch. Draft
pages return 404 publicly and are omitted from the sitemap. Navbar
links remain under the separate Navbar global; existing navigation is preserved.
The footer is managed in the separate Footer global; see `footer.md`.
Each public page has its own named route folder under
`src/app/(frontend)/[locale]/`. Enter the paths below as internal links in the
Navbar global; navigation adds the current `/de` or `/en` locale automatically.
For example, `/services` opens `/en/services` in English. The `about` route is
`/about`.

| Page         | Route folder                  | Path after locale |
| ------------ | ----------------------------- | ----------------- |
| Home         | `page.tsx` at the locale root | `/`               |
| Services     | `services/`                   | `/services`       |
| About us     | `about/`                      | `/about`          |
| How it works | `how-it-works/`               | `/how-it-works`   |
| FAQ          | `faq/`                        | `/faq`            |
| Contact      | `contact/`                    | `/contact`        |
| Privacy      | `privacy/`                    | `/privacy`        |
| Terms of use | `terms/`                      | `/terms`          |
| Legal notice | `impressum/`                  | `/impressum`      |

The existing billing Pricing page has its own `pricing/` route (`/pricing`);
its content is managed by billing rather than these CMS page globals.

## Service pages

Each service has its own page at `/de/services/<slug>` and `/en/services/<slug>`,
managed under **Services → Service pages**. **Services → Services overview** is the
overview at `/services`.

- **Slug** is shared by both languages (German keywords, for example
  `e-rechnung-erstellen`): lowercase letters, numbers and single hyphens. Avoid
  changing it after publishing; links and search results use it.
- **Title**, **summary** and **key points** form the page header and the service
  card. Put the main keyword early in the title and summary.
- **Page sections** use the same layouts and content items as other pages. Use
  section titles for H2 headings and H3/H4 inside rich text.
- **Sort order** sets the card order (lower first); **icon** chooses the card icon.
- **SEO**: the title is used as entered, so include ` | Taxful` and keep it within
  60 characters; keep descriptions to about 120–160 characters. Empty fields fall
  back to `<title> | Taxful` and the summary. Pages get canonical and language
  URLs, Open Graph data and schema.org `Service`, `BreadcrumbList` and, with FAQ
  items, `FAQPage` structured data.

Two content items work on every page: **FAQ** (expandable questions, also
published as `FAQPage` data) and **Service cards** (selected service pages in the
chosen order, or all published service pages when left empty). Cards only show
published pages; Live Preview also shows your drafts. Forms are not shown on
service pages because submissions belong to page globals.

Migration `20261106_135239_service_pages` adds the collection; `pnpm content:seed`
adds six service pages plus a new version of the Services page — all as **drafts**. The
copy states e-invoicing law as of November 2026 with links to its sources and
avoids claims such as GoBD compliance, tax advice or ELSTER submission. Have a
qualified person review both languages, then publish each service page and the
Services page. Until then the public URLs return 404 and the previous Services
page stays live. The keyword map and copy rules are in
`docs/superpowers/specs/2026-11-06-services-pages-design.md`. Revisit the
XRechnung version notes when XRechnung 4.0 becomes binding.

## Architecture and deployment

### Local Home examples

`pnpm website:examples` appends four bilingual Home sections showing all three
layouts and all four content types. It creates a sage invoice illustration and a
real, silent WebM using the installed Chrome browser and native video encoder.
The Contact form must already be published and enabled. The command preserves
existing sections and the hero, keeps draft/published status, and skips examples
already present. It refuses production or a nonlocal auth origin. It is an explicit
development command, not part of deployment migrations.

Examples are identified by **Sample —** in their CMS block names. Edit, reorder or
delete them normally. The illustration source is in
`public/examples/invoice-workflow.svg`; content is in
`src/lib/website/examples/home-content.ts`. Uploaded example assets remain in the
local Media library. No real client material is used.

### Modules

- `src/blocks/website/`: shared layout definitions registered once in Payload and
  referenced by all pages, stored as bounded JSONB documents via Payload's
  `blocksAsJSON` adapter option.
- `src/fields/website/`: shared heading, SEO and conditional content fields
  (including FAQ and Service cards items).
- `src/globals/website/`: shared fixed-page factory; Home keeps its custom hero.
- `src/collections/`: reusable forms, private inbox records and service pages.
- `src/components/website/`: shared public-page composition and metadata, heading,
  sections, rich text, media, forms and preview renderers.
- `src/lib/website/`: catalog, published/draft reads, metadata, safe URLs and
  server form validation/storage.
- `src/app/(frontend)/[locale]/`: explicit named public route folders with small
  page wrappers; all CMS pages reuse `src/components/website/public-page.tsx`.

Apply `pnpm payload migrate` before running this version in another environment.
Migration `20261009_183700_website_page_builder` is additive and preserves the home
hero. Customer-auth tables and existing data are untouched.

### Starter content

Migrations only change the schema. On a new database, run `pnpm content:seed` after
`pnpm payload migrate` to add the starter content: the website pages and Contact
form, the six draft service pages with the Services page draft, and the footer
(`src/migrations/seeds/starter-content.ts`). It refuses to run while migrations are
pending, works in one transaction, and seeds an area only while it is empty (no
website form or page-global versions; no service pages; no footer versions), so it
is safe to repeat and changes nothing on an existing database.

The seeds use Payload's Local API, which always reads the current schema. Inside a
migration they would fail when an empty database is migrated from the start,
because later migrations have not added their tables yet. Write any content that a
migration itself must add in plain SQL (as `src/migrations/seeds/home-actions-20261109.ts`
does); `tests/int/starter-content.int.spec.ts` rejects Local API calls in migrations.
Databases that applied these migrations before this change already have the content. Restart `pnpm dev` after CMS schema changes so the server
initializes the new Payload configuration. Generated types/import map are committed
with the migration. No new dependencies are required.

Verification: integration checks cover publication, locale isolation, selected
content validation, access denial, form validation and duplicate protection;
browser checks cover both languages, responsive grids, metadata, CMS preview,
conditional editor fields, real image/video/caption uploads in both themes and
the contact inbox workflow. Run `pnpm test:int tests/int/website.int.spec.ts` and
`pnpm test:e2e tests/e2e/website.e2e.spec.ts`, then lint/typecheck/build.
