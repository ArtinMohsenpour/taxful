import type { CollectionConfig } from 'payload'
import { cmsEditor } from '../access/cms-editor'
import { ADMIN_GROUPS } from '../lib/cms-settings'

export const FormSubmissions: CollectionConfig = {
  slug: 'form-submissions',
  labels: { singular: 'Submission', plural: 'Submissions' },
  admin: {
    group: ADMIN_GROUPS.forms,
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'form', 'sourcePage', 'status', 'createdAt'],
    description:
      'Private website inbox. Read messages here and mark them handled. No email notifications are sent. Delete submissions according to your reviewed retention policy.',
  },
  access: { read: cmsEditor, create: () => false, update: cmsEditor, delete: cmsEditor },
  fields: [
    {
      name: 'reference',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: 'fingerprint',
      type: 'text',
      required: true,
      admin: { hidden: true },
      access: { read: () => false, update: () => false },
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'website-forms',
      required: true,
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: 'sourcePage',
      type: 'text',
      required: true,
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: 'locale',
      type: 'select',
      options: ['de', 'en'],
      required: true,
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: 'answers',
      label: 'Submitted answers (field labels at submission time)',
      type: 'json',
      required: true,
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: ['new', 'handled'],
      index: true,
    },
  ],
}
