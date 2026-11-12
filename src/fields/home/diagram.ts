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
      // Incoming lane. Optional: empty fields use the default wording.
      {
        name: 'partners',
        label: 'Incoming source heading',
        type: 'text',
        localized: true,
        maxLength: 50,
        admin: { placeholder: 'Von Geschäftspartnern / From business partners' },
      },
      {
        name: 'partnerFormats',
        label: 'Incoming source description',
        type: 'text',
        localized: true,
        maxLength: 80,
        admin: { placeholder: 'XRechnung · ZUGFeRD · PDF' },
      },
      {
        name: 'inbox',
        label: 'Incoming destination heading',
        type: 'text',
        localized: true,
        maxLength: 50,
        admin: { placeholder: 'Rechnungseingang / Invoice inbox' },
      },
      {
        name: 'inboxStorage',
        label: 'Incoming destination description',
        type: 'text',
        localized: true,
        maxLength: 80,
        admin: {
          placeholder: 'Geprüft und abgelegt / Checked and filed',
          description:
            'Received invoices are checked and filed in the company’s Taxful inbox. Do not describe them as sent to other apps.',
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
