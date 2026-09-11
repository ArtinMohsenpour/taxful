export function internalHref(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const slug = value.trim()
  // Locale prefixes are added by next-intl, not stored in content.
  if (/^[a-z][a-z\d+.-]*:/i.test(slug) || /[\\\s\u0000-\u001f]/.test(slug)) return null
  const href = slug.startsWith('/') ? slug : `/${slug}`
  if (href.startsWith('//') || /^\/(de|en)(\/|$|[?#])/.test(href)) return null
  try {
    const decoded = decodeURIComponent(href)
    if (decoded.startsWith('//') || /[\\\u0000-\u001f]/.test(decoded)) return null
  } catch {
    return null
  }
  return href
}

export function externalHref(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}
