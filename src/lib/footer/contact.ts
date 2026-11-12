// Phone numbers are displayed as entered and dialled with digits and a leading + only.
export const PHONE_PATTERN = /^\+?[\d\s()/.-]{5,40}$/

export function phoneHref(value: string | null | undefined): string | null {
  const phone = value?.trim()
  if (!phone || !PHONE_PATTERN.test(phone)) return null
  // The pattern only allows + as the first character.
  const dial = phone.replace(/[^\d+]/g, '')
  return dial.replace(/\D/g, '').length >= 5 ? `tel:${dial}` : null
}

// Excludes characters that would add mailto headers (?, &, #) or break the URI.
const EMAIL_PART = '[^\\s@<>()[\\]\\\\,;:"?&#%/]+'
const EMAIL_PATTERN = new RegExp(`^${EMAIL_PART}@${EMAIL_PART}\\.${EMAIL_PART}$`)

export function emailHref(value: string | null | undefined): string | null {
  const email = value?.trim()
  return email && email.length <= 254 && EMAIL_PATTERN.test(email) ? `mailto:${email}` : null
}

// Copyright text may contain {year}; it is replaced at render time.
export function copyrightText(value: string | null | undefined, year = new Date().getFullYear()) {
  return value?.trim() ? value.replaceAll('{year}', String(year)) : ''
}
