import { externalHref, internalHref } from '../navigation-links'
import type { WebsiteLocale } from './catalog'

export function websiteLink(value: unknown, locale: WebsiteLocale): string | undefined {
  if (typeof value !== 'string' || /[\u0000-\u001f\\]/.test(value)) return undefined
  const href = value.trim()
  if (/^[a-z][a-z\d+.-]*:/i.test(href) && !/^(https?:|mailto:|tel:)/i.test(href)) return undefined
  if (/^#[\w-]+$/.test(href)) return href
  if (/^mailto:[^\s?@]+@[^\s?@]+$/.test(href) || /^tel:\+?[\d ()-]+$/.test(href)) return href
  const external = externalHref(href)
  if (external) return external
  if (/^\/(de|en)(\/|$)/.test(href)) {
    const clean = internalHref(href.replace(/^\/(de|en)/, '') || '/')
    return clean ? `/${locale}${clean === '/' ? '' : clean}` : undefined
  }
  const internal = internalHref(href)
  return internal ? `/${locale}${internal === '/' ? '' : internal}` : undefined
}

// Public media currently uses Payload's same-origin local storage. Never embed
// arbitrary URLs from preview messages, or load third-party trackers as media.
export function publicMediaURL(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value, 'https://taxful.invalid')
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      return undefined
    const decoded = decodeURIComponent(url.pathname)
    if (
      !/^\/api\/media\/file\/[^/]+$/.test(decoded) ||
      /[\\\u0000-\u001f]/.test(decoded) ||
      ['.', '..'].includes(decoded.split('/').at(-1) || '')
    )
      return undefined
    return url.pathname
  } catch {
    return undefined
  }
}
