import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'always',
  // German is the default for new visitors; explicit URLs select the language.
  localeDetection: false,
})
