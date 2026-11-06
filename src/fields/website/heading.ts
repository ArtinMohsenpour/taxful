import type { Field } from 'payload'

export const pageHeadingFields: Field[] = [
  {
    name: 'eyebrow',
    label: 'Eyebrow — small text above the title',
    type: 'text',
    localized: true,
    maxLength: 100,
  },
  { name: 'title', label: 'Page title', type: 'text', localized: true, maxLength: 120 },
  { name: 'subtitle', label: 'Subtitle', type: 'textarea', localized: true, maxLength: 600 },
]
