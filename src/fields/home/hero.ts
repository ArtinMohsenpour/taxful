import type { Field } from 'payload'
import { navigationLinkFields } from '../navigation-link'
import { rowLabel } from '../row-label'

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
  {
    name: 'actions',
    label: 'Buttons',
    type: 'array',
    maxRows: 2,
    labels: { singular: 'Button', plural: 'Buttons' },
    admin: {
      description:
        'Up to two buttons under the heading. The first is the filled main button, the second an outlined one. Order is shared; translate labels with the locale selector. Remove both to show none.',
      components: { RowLabel: rowLabel(['label'], 'Button') },
    },
    fields: [
      { name: 'label', type: 'text', required: true, localized: true, maxLength: 40 },
      {
        name: 'link',
        label: false,
        type: 'group',
        fields: navigationLinkFields({ requirePath: true }),
      },
    ],
  },
]
