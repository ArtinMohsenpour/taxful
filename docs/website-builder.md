# Public website builder

Open **Website** in Payload Admin. Page globals are Home, Services, About us,
How it works, FAQ, Contact us, Privacy, Terms of use and Legal notice (Impressum).
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

Under **Website → Forms**, create a reusable form, add fields and translate labels.
Supported fields are short text, email, long text, dropdown and checkbox. Choose
which fields are required. Field keys must be unique, lowercase and stable;
`website` is reserved for the spam trap. Dropdown values must also be unique.
Enable **Accept submissions** and publish the form, then select it in a page's
form content item. A bilingual Contact form is included.

Submitted messages appear under **Website → Form submissions**. CMS staff can
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

The migration publishes starter content for Services, About, How it works, FAQ
and Contact. Privacy, Terms and Impressum start as drafts with titles and empty
content. Add reviewed company/legal copy and publish them before launch. Draft
pages return 404 publicly and are omitted from the sitemap. Navbar
links remain under the separate Navbar global; existing navigation is preserved.
The temporary footer is removed; a dedicated footer will be designed later.
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
- `src/fields/website/`: shared heading, SEO and conditional content fields.
- `src/globals/website/`: shared fixed-page factory; Home keeps its custom hero.
- `src/collections/`: reusable forms and private inbox records.
- `src/components/website/`: shared public-page composition and metadata, heading,
  sections, rich text, media, forms and preview renderers.
- `src/lib/website/`: catalog, published/draft reads, metadata, safe URLs and
  server form validation/storage.
- `src/app/(frontend)/[locale]/`: explicit named public route folders with small
  page wrappers; all CMS pages reuse `src/components/website/public-page.tsx`.

Apply `pnpm payload migrate` before running this version in another environment.
Migration `20261009_183700_website_page_builder` is additive, preserves the home
hero and includes the initial page/form content. Customer-auth tables and existing
data are untouched. Restart `pnpm dev` after CMS schema changes so the server
initializes the new Payload configuration. Generated types/import map are committed
with the migration. No new dependencies are required.

Verification: integration checks cover publication, locale isolation, selected
content validation, access denial, form validation and duplicate protection;
browser checks cover both languages, responsive grids, metadata, CMS preview,
conditional editor fields, real image/video/caption uploads in both themes and
the contact inbox workflow. Run `pnpm test:int tests/int/website.int.spec.ts` and
`pnpm test:e2e tests/e2e/website.e2e.spec.ts`, then lint/typecheck/build.
