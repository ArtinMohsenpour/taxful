export function customerReturnPath(value: string | null | undefined, locale: string) {
  const fallback = `/${locale === 'en' ? 'en' : 'de'}/portal`
  if (!value || !/^\/(de|en)\/(portal(?:\/|$|\?)|accept-invitation(?:$|\?))/.test(value))
    return fallback
  if (/[\\\u0000-\u0020]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://taxful.invalid')
    if (
      url.origin !== 'https://taxful.invalid' ||
      !/^\/(de|en)\/(portal|accept-invitation)(\/|$)/.test(url.pathname)
    )
      return fallback
    return `${url.pathname}${url.search}`
  } catch {
    return fallback
  }
}
