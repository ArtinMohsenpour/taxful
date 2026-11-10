# Footer editor

Open `/admin/globals/footer` or **Site settings → Footer** in Payload. The footer
appears at the bottom of every public page (home, website pages, service pages and
pricing). Login, signup and portal pages show a compact version with only the
bottom bar, so the legal links stay reachable everywhere.

## Editing

The editor has five tabs. Empty fields and sections are hidden on the website.
Use the locale selector to translate text; order and structure are shared between
German and English, and untranslated English text falls back to German.

| Tab             | Contents                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand & contact | Footer logo with an optional dark-theme version, a short tagline, and optional email, phone and postal address.                                                        |
| Link columns    | Up to five columns, each with a title and up to 12 links. Rows are collapsed and labelled by their link text; drag them to reorder.                                    |
| Social media    | Optional heading and up to ten profiles (LinkedIn, XING, Instagram, Facebook, X, YouTube, TikTok, Mastodon, GitHub or Website). Profiles render as icons in a new tab. |
| Partners        | Optional heading and up to 12 partner, membership or certification logos, each with a name (used as alt text), an optional website and an appearance.                  |
| Bottom bar      | Copyright text (`{year}` becomes the current Berlin year), up to eight legal links and optional small print.                                                           |

Links use the same model as the navbar: an internal page or an external HTTP/HTTPS
URL, optionally opening in a new tab. Internal links use the page picker described
in `navbar.md` (choose from grouped pages or type a path; the `/de` or `/en` prefix
is added automatically). New-tab links show an arrow and announce
"opens in a new tab" to screen readers. Unsafe or empty destinations are rejected
when saving and are never rendered.

### Logos

- **Footer logo**: leave it empty to reuse the navigation logo; with neither set, the
  default Taxful wordmark is shown. Upload a light **Logo for dark theme** if the main
  logo is hard to read on dark backgrounds.
- **Partner logos**: choose **Original colours** or **Monochrome (matches the theme)**.
  Monochrome needs a transparent image and keeps a calm, uniform row in both themes.
  Original-colour logos can have a dark-theme version; without one they sit on a soft
  light plate in dark mode (`--logo-plate` in `src/app/globals.css`) so they stay
  legible.
- Footer and partner logos accept SVG (preferred), PNG, WebP, AVIF, JPEG and GIF.
  Other formats are rejected on publish with a clear message. Drafts skip Payload's
  validation, so an unsupported file only shows up as an error when publishing.
  Only list partner relationships that actually exist.

### SVG safety

Media uploads go through the upload policy in `src/lib/website/media-uploads.ts` (see
[Public website builder](website-builder.md#media)). SVGs must be UTF-8 SVG documents;
files containing scripts, event handlers, `javascript:`/`data:text/html` URLs,
`foreignObject`, embedded frames/objects (also with a namespace prefix such as
`<x:script>`), entities or stylesheet imports are rejected, and `.svgz` is not
supported. This is a pattern check, not a sanitiser, so it is one of three layers:
the website renders SVGs only through `<img>`, which never runs their scripts, and
every Media file is served with a sandboxing `Content-Security-Policy`. Website
content and SEO images remain raster-only.

## Preview and publishing

Open **Live Preview** to see unsaved edits; it opens the home page and scrolls to
the footer. Select a breakpoint and locale as with the other globals. **Save
Draft** keeps work in progress; **Publish changes** updates the public footer on the
next request. The last 25 versions are retained. Preview requires a signed-in CMS
user; anonymous requests for drafts or `?preview=true&previewGlobal=footer` return
403/404.

Payload Live Preview keeps one shared cache per page, so only one global listens
for editor messages at a time. The home route selects the listener from
`previewGlobal` (`home`, `footer`, or none for the navbar).

## Starter content

Migration `20261109_093459_footer` creates the footer tables; on a new database
`pnpm content:seed` publishes starter content once (see
[Starter content](website-builder.md#starter-content)): Services, Company and Customer area columns linking to existing
routes, and Privacy, Terms of use and Legal notice in the bottom bar. It never
overwrites an existing footer. Social profiles, contact details and partner logos
are intentionally left empty; they must come from the company and must not be
invented. Links to unpublished pages return 404; the page picker marks them as drafts.

## Implementation

| Area           | Location                                                                       |
| -------------- | ------------------------------------------------------------------------------ |
| Global         | `src/globals/Footer.ts`                                                        |
| Data loading   | `src/lib/footer/read.ts` (published footer, German fallback, navbar logo)      |
| Helpers        | `src/lib/footer/contact.ts`, `src/lib/footer/social.ts`                        |
| Renderer       | `src/components/footer/footer-view.tsx` (hook-free, shared with preview)       |
| Server/preview | `src/components/footer/footer.tsx`, `src/components/footer/footer-preview.tsx` |
| Icons          | `src/components/footer/icons.tsx` (outline glyphs, `currentColor`)             |
| Admin rows     | `src/components/admin/row-label.tsx`                                           |
| Messages       | `Footer` namespace in `messages/de.json` and `messages/en.json`                |

Every link, email, phone and media URL is re-validated at render time because Live
Preview data comes straight from the editor. Media must be served from
`/api/media/file/`; other image URLs are dropped.

Anonymous visitors can read only the published footer. CMS staff (`super-admin`,
`manager`, `content-editor`) can edit, preview and read versions.

## Validation

- `tests/int/footer.int.spec.ts`: access control (anonymous write/draft denied),
  localized saves with German fallback, partner media population, rejection of
  unsafe links, missing paths, invalid social/partner URLs and phone numbers, SVG
  logos, unsafe or disguised SVG uploads, and the unsupported-format message.
- `tests/int/footer-view.int.spec.ts`: rendering, link and media sanitisation,
  navbar-logo fallback, compact variant and the live-preview hook.
- `tests/e2e/footer.e2e.spec.ts`: both locales, 320/768/1440 px without overflow,
  compact customer footer, admin row labels and unsaved Live Preview.
