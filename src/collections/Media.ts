import type { CollectionConfig } from 'payload'
import { cmsEditor } from '../access/cms-editor'
import { PUBLIC_MEDIA_MAX_BYTES } from '../lib/website/media-settings'
import { APIError } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    description:
      'Public website assets, up to 50 MB per file. Use MP4 or WebM for videos. Never upload private client documents here.',
  },
  hooks: {
    beforeOperation: [
      ({ req }) => {
        if (
          req.file &&
          (req.file.size > PUBLIC_MEDIA_MAX_BYTES ||
            ('truncated' in req.file && req.file.truncated === true))
        )
          throw new APIError('The file is too large. Please use a file smaller than 50 MB.', 413)
      },
    ],
  },
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
