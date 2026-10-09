import type { Field } from 'payload'

export const homeHeroFields: Field[] = [
  {
    name: 'eyebrow',
    label: 'Small introductory line',
    type: 'text',
    localized: true,
    maxLength: 100,
  },
  {
    name: 'title',
    label: 'Heading — first line',
    type: 'text',
    localized: true,
    maxLength: 80,
  },
  {
    name: 'titleAccent',
    label: 'Heading — highlighted line',
    type: 'text',
    localized: true,
    maxLength: 80,
  },
  {
    name: 'description',
    label: 'Description below the heading',
    type: 'textarea',
    localized: true,
    maxLength: 360,
  },
]
