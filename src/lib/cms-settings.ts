import { internalHref } from './navigation-links'

export const CMS_VERSION_LIMIT = 25

// Admin sidebar groups, in display order. Payload lists groups that contain
// collections before page-only groups, so keep collections ordered to match.
export const ADMIN_GROUPS = {
  services: 'Services',
  forms: 'Forms',
  media: 'Media',
  pages: 'Pages',
  legal: 'Legal',
  settings: 'Site settings',
} as const

// Reuse for future page previews with their internal path.
export function previewURL(locale: string = 'de', path = '/') {
  const href = internalHref(path) || '/'
  const pathname = href.split(/[?#]/)[0]
  return `/${locale === 'en' ? 'en' : 'de'}${pathname === '/' ? '' : pathname}?preview=true`
}
