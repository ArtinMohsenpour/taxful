import { Forbidden, type CollectionConfig, type Where } from 'payload'
import { cmsEditor } from '../access/cms-editor'
import { ADMIN_GROUPS, CMS_VERSION_LIMIT } from '../lib/cms-settings'

export const WebsiteForms: CollectionConfig = {
  slug: 'website-forms',
  labels: { singular: 'Form', plural: 'Forms' },
  admin: {
    group: ADMIN_GROUPS.forms,
    useAsTitle: 'name',
    defaultColumns: ['name', 'enabled', '_status'],
    description:
      'Reusable public forms. Publish and enable a form, then select it in a page section. Messages are stored in the private submissions inbox.',
  },
  access: {
    read: ({ req }) =>
      cmsEditor({ req }) ||
      ({ _status: { equals: 'published' }, enabled: { equals: true } } satisfies Where),
    create: cmsEditor,
    update: cmsEditor,
    delete: cmsEditor,
    readVersions: cmsEditor,
  },
  hooks: {
    beforeOperation: [
      ({ operation, args, overrideAccess, req }) => {
        const read = args as { draft?: boolean; data?: unknown }
        if (
          operation === 'read' &&
          !overrideAccess &&
          !cmsEditor({ req }) &&
          (read.draft || read.data)
        )
          throw new Forbidden(req.t)
      },
    ],
  },
  versions: { drafts: true, maxPerDoc: CMS_VERSION_LIMIT },
  fields: [
    { name: 'name', label: 'Internal name', type: 'text', required: true, maxLength: 120 },
    { name: 'enabled', label: 'Accept submissions', type: 'checkbox', defaultValue: false },
    { name: 'title', type: 'text', localized: true, maxLength: 160 },
    { name: 'description', type: 'textarea', localized: true, maxLength: 600 },
    {
      name: 'submitLabel',
      label: 'Submit button label',
      type: 'text',
      localized: true,
      required: true,
      maxLength: 80,
    },
    { name: 'successMessage', type: 'textarea', localized: true, required: true, maxLength: 500 },
    {
      name: 'fields',
      type: 'array',
      minRows: 1,
      maxRows: 16,
      required: true,
      admin: { initCollapsed: true },
      validate: (value) => {
        const keys = (value || []).map((row) =>
          row && typeof row === 'object' && 'key' in row ? row.key : undefined,
        )
        return new Set(keys).size === keys.length || 'Each field needs a unique key.'
      },
      fields: [
        {
          name: 'key',
          label: 'Stable field key',
          type: 'text',
          required: true,
          maxLength: 50,
          validate: (value: unknown) =>
            (typeof value === 'string' &&
              /^[a-z][a-z0-9_]{0,49}$/.test(value) &&
              !['__proto__', 'constructor', 'prototype', 'website'].includes(value)) ||
            'Use a lowercase key starting with a letter (letters, numbers and underscores).',
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'text',
          options: [
            { label: 'Short text', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Long text', value: 'textarea' },
            { label: 'Dropdown', value: 'select' },
            { label: 'Checkbox', value: 'checkbox' },
          ],
        },
        { name: 'label', type: 'text', localized: true, required: true, maxLength: 160 },
        { name: 'help', label: 'Help text', type: 'text', localized: true, maxLength: 300 },
        { name: 'required', type: 'checkbox', defaultValue: false },
        {
          name: 'options',
          type: 'array',
          minRows: 1,
          maxRows: 20,
          required: true,
          admin: { condition: (_, sibling) => sibling?.type === 'select' },
          validate: (value) => {
            const values = (value || []).map((row) =>
              row && typeof row === 'object' && 'value' in row ? row.value : undefined,
            )
            return (
              new Set(values).size === values.length || 'Each dropdown option needs a unique value.'
            )
          },
          fields: [
            { name: 'value', type: 'text', required: true, maxLength: 80 },
            { name: 'label', type: 'text', required: true, localized: true, maxLength: 160 },
          ],
        },
      ],
    },
  ],
}
