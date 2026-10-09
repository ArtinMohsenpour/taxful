import type { CollectionConfig } from 'payload'
import { cmsEditor } from '../access/cms-editor'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: cmsEditor,
    update: cmsEditor,
    delete: cmsEditor,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
