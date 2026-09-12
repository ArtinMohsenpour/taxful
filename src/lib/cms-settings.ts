import { internalHref } from './navigation-links'

export const CMS_VERSION_LIMIT = 25

// Reuse for future page previews with their internal path.
export function previewURL(locale: string = 'de', path = '/') {
  const href = internalHref(path) || '/'
  const pathname = href.split(/[?#]/)[0]
  return `/${locale === 'en' ? 'en' : 'de'}${pathname === '/' ? '' : pathname}?preview=true`
}
