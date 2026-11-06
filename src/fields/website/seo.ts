import type { Field } from 'payload'

export const seoFields: Field[] = [
  {
    name: 'seo',
    type: 'group',
    label: 'Search & sharing',
    fields: [
      {
        name: 'title',
        type: 'text',
        localized: true,
        maxLength: 70,
        admin: { description: 'Optional. Falls back to the page title and Taxful.' },
      },
      {
        name: 'description',
        type: 'textarea',
        localized: true,
        maxLength: 320,
        admin: { description: 'Optional search-result description. Falls back to the subtitle.' },
      },
      {
        name: 'image',
        label: 'Sharing image',
        type: 'upload',
        relationTo: 'media',
        filterOptions: {
          mimeType: { in: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] },
        },
      },
      {
        name: 'noIndex',
        label: 'Hide from search engines',
        type: 'checkbox',
        defaultValue: false,
        admin: {
          description:
            'Drafts and previews are always excluded. Canonical and language URLs are generated automatically.',
        },
      },
    ],
  },
]
