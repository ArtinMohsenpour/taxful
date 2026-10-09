import type { Field, TextFieldSingleValidation, UploadFieldSingleValidation } from 'payload'
import { accountingProviders } from '@/lib/home/accounting-providers'
import { text, upload } from 'payload/shared'

const isCustom = (siblingData: unknown) =>
  typeof siblingData === 'object' &&
  siblingData !== null &&
  'provider' in siblingData &&
  siblingData.provider === 'custom'

const validateName: TextFieldSingleValidation = (value, options) => {
  if (isCustom(options.siblingData) && !value?.trim()) return 'Enter the company name.'
  return text(value, options)
}

const validateLogo: UploadFieldSingleValidation = (value, options) => {
  if (isCustom(options.siblingData) && !value) return 'Choose a logo image.'
  return upload(value, options)
}

export const homeProviderFields: Field[] = [
  {
    name: 'providers',
    type: 'array',
    label: 'Accounting companies',
    required: true,
    minRows: 1,
    maxRows: 6,
    labels: { singular: 'Company', plural: 'Companies' },
    admin: {
      description:
        'Choose one to six companies. Drag rows to reorder them. These illustrate file imports; they do not advertise direct integrations.',
    },
    fields: [
      {
        name: 'provider',
        type: 'select',
        required: true,
        options: [
          ...accountingProviders.map(({ id, name }) => ({ label: name, value: id })),
          { label: 'Another company — upload a logo', value: 'custom' },
        ],
      },
      {
        name: 'name',
        label: 'Company name',
        type: 'text',
        localized: true,
        maxLength: 60,
        admin: { condition: (_, sibling) => sibling.provider === 'custom' },
        validate: validateName,
      },
      {
        name: 'logo',
        label: 'Company logo',
        type: 'upload',
        relationTo: 'media',
        maxDepth: 1,
        filterOptions: { mimeType: { contains: 'image/' } },
        admin: {
          condition: (_, sibling) => sibling.provider === 'custom',
          description: 'Use a transparent image. Logos are shown in one colour.',
        },
        validate: validateLogo,
      },
    ],
  },
]
