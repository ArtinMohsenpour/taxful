import type { GlobalConfig } from 'payload'
import { ValidationError } from 'payload'
import { cmsEditor } from '../access/cms-editor'
import { navigationLinkFields } from '../fields/navigation-link'
import { internalHref, externalHref } from '../lib/navigation-links'

export const Navbar: GlobalConfig = {
  slug: 'navbar',
  label: 'Navbar',
  admin: {
    group: 'Website',
    description:
      'Reorder items by dragging. Translate labels using the locale selector. Publish to update the public navigation. Internal paths link to pages; they do not create pages.',
  },
  access: { read: () => true, update: cmsEditor, readVersions: cmsEditor },
  versions: { drafts: true },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Validate active links only; dropdown parents intentionally have no destination.
        for (const item of data?.items ?? []) {
          const links = item.type === 'dropdown' ? (item.children ?? []) : [item]
          if (item.type === 'dropdown' && links.length === 0)
            throw new ValidationError({
              global: 'navbar',
              errors: [{ path: 'items', message: 'Dropdowns need at least one link.' }],
            })
          for (const entry of links) {
            const link = entry.link
            const valid =
              link?.type === 'external' ? externalHref(link.url) : internalHref(link?.path)
            if (!valid)
              throw new ValidationError({
                global: 'navbar',
                errors: [
                  {
                    path: 'items',
                    message: 'Each link needs a valid internal path or an HTTP/HTTPS URL.',
                  },
                ],
              })
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'logo',
      label: 'Company logo',
      type: 'upload',
      relationTo: 'media',
      maxDepth: 1,
      filterOptions: { mimeType: { contains: 'image/' } },
      admin: {
        description:
          'Upload or choose an image to replace the Taxful branding. A transparent logo works best. Remove it to restore the default.',
      },
    },
    {
      name: 'items',
      type: 'array',
      maxRows: 8,
      labels: { singular: 'Navbar item', plural: 'Navbar items' },
      fields: [
        { name: 'label', type: 'text', required: true, localized: true, maxLength: 60 },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'link',
          options: [
            { label: 'Link / button', value: 'link' },
            { label: 'Dropdown', value: 'dropdown' },
          ],
        },
        {
          name: 'appearance',
          type: 'select',
          defaultValue: 'link',
          options: [
            { label: 'Text link', value: 'link' },
            { label: 'Button', value: 'button' },
          ],
          admin: { condition: (_, sibling) => sibling.type === 'link' },
        },
        {
          name: 'link',
          type: 'group',
          admin: { condition: (_, sibling) => sibling.type !== 'dropdown' },
          fields: navigationLinkFields(),
        },
        {
          name: 'children',
          type: 'array',
          maxRows: 12,
          admin: { condition: (_, sibling) => sibling.type === 'dropdown' },
          fields: [
            { name: 'label', type: 'text', required: true, localized: true, maxLength: 60 },
            { name: 'description', type: 'text', localized: true },
            { name: 'link', type: 'group', fields: navigationLinkFields() },
          ],
        },
      ],
    },
  ],
}
