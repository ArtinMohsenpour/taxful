# Home page

In Payload, open **Website → Home page** (`/admin/globals/home`). Choose German or English with the locale selector.

- **Hero** controls the introductory line, both heading lines and description. All four are optional: clear a field to hide it, or clear all four to show only the diagram. Empty text adds no empty heading or line break.
- **Accounting companies** controls the top row. Choose one to six companies and drag rows to reorder them. Built-in wordmarks are local SVG assets. For another company, choose the custom option, enter its name and select an image from Media. Company selection/order is shared between locales; custom names are localized.
- **Diagram & workflow** controls the source label, text under Taxful, destination labels and four workflow steps.

Use **Live Preview** to see unsaved edits beside the form, or **Preview** to open the preview page. **Save Draft** preserves edits without changing the public page; **Publish** makes them public. History keeps at most 25 versions. German is the fallback for missing English diagram/workflow labels and custom company names. Optional hero text stays hidden when empty in the selected language. Keep text short for the mobile diagram.

The home preview uses `/de?preview=true&previewGlobal=home` (or `/en`). It requires an authenticated CMS user. Only the selected global receives live updates: Home preview shows the published Navbar, and Navbar preview shows the published Home. Public reads use published content; anonymous draft and version-history access is denied. Preview population follows Media read access.

The file-import disclaimer and “Planned” tax-office label remain application translations. The companies illustrate file sources; they do not imply direct integrations. The ELSTER branch is a future workflow, not a current tax-submission feature.

## Modules and motion

`src/globals/Home.ts` composes fields from `src/fields/home/`. `src/lib/home/` separates CMS loading, fallback copy, provider metadata and display normalization. Small components and colocated CSS modules live in `src/components/home/hero/`; only the pause control and live preview need client state. No animation package is required.

Each company has a staggered phase in a shared 12-second CSS cycle. Its incoming pulse reaches Taxful at 27%, triggers a glow using the primary colour, then continues toward customers. The number of pulses, grid columns and SVG connections adapt to the selected companies. Pause stops all three stages together. Reduced-motion preferences disable movement and glow.

## Database and verification

Apply Payload migration `20261009_113849_home_page` before deploying the app. It adds only Home/versions tables and initializes the current published German/English copy and six providers. It does not change existing Navbar, staff or customer records. The migration has been applied to the local development database.

Generate schema artifacts with `pnpm generate:types` and `pnpm generate:importmap`. Check CMS permissions, localized publication and drafts with `tests/int/home.int.spec.ts`, unsaved preview with `tests/int/home-preview.int.spec.ts`, and the actual editor with `tests/e2e/home.e2e.spec.ts`. `tests/e2e/frontend.e2e.spec.ts` covers bilingual rendering, themes, mobile layout, preview authentication, motion controls and staggered timing.
