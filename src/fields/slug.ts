import type { TextField } from 'payload'

export const SERVICE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SERVICE_SLUG_MAX_LENGTH = 80

export function isServiceSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= SERVICE_SLUG_MAX_LENGTH &&
    SERVICE_SLUG_PATTERN.test(value)
  )
}

export const slugField: TextField = {
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  maxLength: SERVICE_SLUG_MAX_LENGTH,
  validate: (value: unknown) =>
    isServiceSlug(value) ||
    'Use lowercase letters (a–z), numbers and single hyphens, e.g. e-rechnung-erstellen.',
  admin: {
    position: 'sidebar',
    description:
      'Shared by both languages: /de/services/<slug> and /en/services/<slug>. Avoid changing it after publishing.',
  },
}
