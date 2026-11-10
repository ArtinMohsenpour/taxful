import type { CollectionConfig } from 'payload'
import { cmsEditor } from '../access/cms-editor'
import { PUBLIC_MEDIA_MAX_BYTES } from '../lib/website/media-settings'
import { ADMIN_GROUPS } from '../lib/cms-settings'
import { APIError, ValidationError } from 'payload'
import { mediaResponseHeaders, mediaUploadError } from '../lib/website/media-uploads'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media file', plural: 'Media library' },
  admin: {
    group: ADMIN_GROUPS.media,
    description:
      'Public website assets, up to 50 MB per file: JPEG, PNG, WebP, AVIF, GIF or SVG images, MP4 or WebM videos and WebVTT captions. Never upload private client documents here.',
  },
  hooks: {
    beforeOperation: [
      async ({ req }) => {
        if (
          req.file &&
          (req.file.size > PUBLIC_MEDIA_MAX_BYTES ||
            ('truncated' in req.file && req.file.truncated === true))
        )
          throw new APIError('The file is too large. Please use a file smaller than 50 MB.', 413)
        // Only inert public asset types; see src/lib/website/media-uploads.ts.
        const typeError = req.file ? await mediaUploadError(req.file) : null
        if (typeError)
          throw new ValidationError({
            collection: 'media',
            errors: [{ path: 'file', message: typeError }],
          })
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
  upload: { modifyResponseHeaders: mediaResponseHeaders },
}
