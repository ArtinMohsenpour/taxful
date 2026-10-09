import type { Field } from 'payload'

export const homeDiagramFields: Field[] = [
  {
    name: 'diagram',
    type: 'group',
    label: 'Diagram labels',
    fields: [
      {
        name: 'sources',
        label: 'Above the accounting companies',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 80,
      },
      {
        name: 'processing',
        label: 'Under the Taxful logo',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 50,
      },
      {
        name: 'customers',
        label: 'Customer destination heading',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 50,
      },
      {
        name: 'formats',
        label: 'Customer destination description',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 80,
      },
      {
        name: 'taxOffice',
        label: 'Tax office destination heading',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 50,
      },
      {
        name: 'taxSubmission',
        label: 'Tax office destination description',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 80,
        admin: {
          description:
            'This branch always displays “Planned”. Direct tax submission is a future feature.',
        },
      },
    ],
  },
  {
    name: 'steps',
    type: 'group',
    label: 'Workflow steps',
    fields: ['import', 'review', 'validate', 'export'].map((name) => ({
      name,
      type: 'text' as const,
      localized: true,
      required: true,
      maxLength: 50,
    })),
  },
]
