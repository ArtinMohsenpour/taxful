import { isServiceSlug } from '../../fields/slug'

export const websitePages = [
  { slug: 'home', path: '/', de: 'Startseite', en: 'Home' },
  { slug: 'services', path: '/services', de: 'Leistungen', en: 'Services' },
  { slug: 'about', path: '/about', de: 'Über uns', en: 'About us' },
  { slug: 'how-it-works', path: '/how-it-works', de: 'So funktioniert es', en: 'How it works' },
  { slug: 'faq', path: '/faq', de: 'Häufige Fragen', en: 'FAQ' },
  { slug: 'contact', path: '/contact', de: 'Kontakt', en: 'Contact us' },
  { slug: 'privacy', path: '/privacy', de: 'Datenschutz', en: 'Privacy' },
  { slug: 'terms', path: '/terms', de: 'Nutzungsbedingungen', en: 'Terms of use' },
  { slug: 'impressum', path: '/impressum', de: 'Impressum', en: 'Legal notice' },
] as const

export type WebsitePageSlug = (typeof websitePages)[number]['slug']
export type WebsiteLocale = 'de' | 'en'

export function websitePage(slug: string) {
  return websitePages.find((page) => page.slug === slug)
}

export function isWebsitePreviewPath(path: string) {
  const match = path.match(/^\/(de|en)(\/[^/]+)?\/?$/)
  if (match && websitePages.some((page) => page.path === (match[2] || '/'))) return true
  const service = path.match(/^\/(de|en)\/services\/([^/]+)\/?$/)
  return Boolean(service && isServiceSlug(service[2]))
}
