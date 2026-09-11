# Frontend foundation

The application uses PostgreSQL through `@payloadcms/db-postgres`. This frontend setup does not replace or recreate the running database.

## Installed packages

- Tailwind CSS and `@tailwindcss/postcss`: 4.3.3
- PostCSS: 8.5.28
- next-intl: 4.14.3
- next-themes: 0.4.6
- prettier-plugin-tailwindcss: 0.8.1

These are exact versions resolved from the registry during setup. The lockfile records transitive versions. No additional authentication or component libraries are needed for this foundation.

## Styling

`postcss.config.mjs` uses the v4 `@tailwindcss/postcss` plugin. `src/app/globals.css` imports Tailwind and defines semantic CSS custom properties, light/dark values, `@theme inline` mappings, and the class-based dark variant. There is no v3 JavaScript Tailwind configuration or legacy `@tailwind` directive. Prettier reads the CSS entry point when sorting classes.

The stylesheet is imported only by the frontend locale layout, keeping its reset and tokens out of Payload's separate admin layout. Use utilities such as `bg-background`, `bg-surface`, `text-foreground`, `text-muted-foreground`, and `text-primary`. Keep new design tokens in this file.

## Languages

`src/i18n/routing.ts` defines German and English with explicit `/de` and `/en` prefixes. An unprefixed visit defaults to German, independently of browser language. `src/proxy.ts` excludes Payload admin/API routes and framework/static files.

`src/i18n/request.ts` follows the Next.js 16.3 `next/root-params` integration and loads messages from `messages/de.json` or `messages/en.json`. Message keys and locale values are typed. The frontend has a locale-aware root layout; pages render on request to read the published Navbar global. Only the messages needed by interactive controls are passed to the browser.

Use `src/i18n/navigation.ts` for localized links and router operations. The language selector preserves the path, query string, and hash. Page metadata is translated. Add canonical URLs and sitemaps once the public domain and page structure are defined.

Payload content localization is configured for the same locales with German fallback. This prepares the CMS; future content fields must explicitly use `localized: true`. Existing user and media fields are not automatically duplicated or translated.

## Themes

`patches/next-themes@0.4.6.patch` fixes upstream issue https://github.com/pacocoursey/next-themes/issues/397. The package's startup-script component uses `useSyncExternalStore` with a true server snapshot and false client snapshot: initial SSR/hydration preserves the executable bootstrap, while client remounts omit it. Both ESM and CommonJS entry points are patched through pnpm. Remove the patch only after an upstream release fixes the issue and the development-console regression passes. Do not disable SSR or suppress console errors as a workaround.

The shared navbar uses a DE/EN switch with a sliding indicator and a compact light/dark toggle. The initial system preference is respected, without displaying a system icon. Both controls support keyboard activation and translated accessible names. Color and indicator transitions are implemented in CSS and respect reduced-motion preferences. Palette tokens follow warm ivory, stone, and sage, with a separate darker brand-ink token for readable text. Navigation content is managed in Payload; see `navbar.md`.

The frontend provider uses next-themes with a `class` attribute, system default, and the `taxful-theme` localStorage key. Its startup script applies the stored/system preference before hydration. Only the HTML element suppresses the expected attribute hydration difference. Theme controls wait until hydration before displaying the stored choice; the page itself remains server rendered.

## Verification

Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`. The frontend Playwright suite covers German defaults, English navigation, query/hash preservation, theme persistence and system changes, actual computed Tailwind colors, hydration errors, mobile overflow, and Payload route isolation.

For an isolated production test server, run:

```bash
E2E_BASE_URL=http://localhost:3100 E2E_SERVER_COMMAND='pnpm exec next start -p 3100' pnpm exec playwright test tests/e2e/frontend.e2e.spec.ts
```

## References checked during setup

- https://tailwindcss.com/docs/installation/framework-guides/nextjs
- https://tailwindcss.com/docs/theme
- https://next-intl.dev/docs/routing/setup
- https://github.com/pacocoursey/next-themes
