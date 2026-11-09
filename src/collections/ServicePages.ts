import type { CollectionConfig } from 'payload'
import { cmsEditor } from '../access/cms-editor'
import { sectionsField } from '../blocks/website/layouts'
import { seoFields } from '../fields/website/seo'
import { slugField } from '../fields/slug'
import { protectCollectionDrafts } from '../hooks/protect-drafts'
import { ADMIN_GROUPS, CMS_VERSION_LIMIT, previewURL } from '../lib/cms-settings'

const preview = (locale: string, slug: unknown) =>
  `${previewURL(locale, `/services/${typeof slug === 'string' ? slug : ''}`)}&previewCollection=service-pages`

export const ServicePages: CollectionConfig = {
  slug: 'service-pages',
  labels: { singular: 'Service page', plural: 'Service pages' },
  defaultSort: 'sortOrder',
  // Card items only need ids; the card list supplies their content.
  defaultPopulate: { slug: true },
  admin: {
    group: ADMIN_GROUPS.services,
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'sortOrder'],
    livePreview: { url: ({ data, locale }) => preview(locale.code, data?.slug) },
    preview: (doc, { locale }) => preview(locale, doc?.slug),
    description:
      'Each service has its own page at /services/<slug> and appears in Service cards. Translate with the locale selector, save drafts and publish after review.',
  },
  access: {
    read: ({ req }) => cmsEditor({ req }) || { _status: { equals: 'published' } },
    create: cmsEditor,
    update: cmsEditor,
    delete: cmsEditor,
    readVersions: cmsEditor,
  },
  hooks: { beforeOperation: [protectCollectionDrafts] },
  versions: { drafts: true, maxPerDoc: CMS_VERSION_LIMIT },
  fields: [
    slugField,
    {
      name: 'sortOrder',
      type: 'number',
      required: true,
      defaultValue: 100,
      index: true,
      admin: { position: 'sidebar', description: 'Lower numbers appear first.' },
    },
    {
      name: 'icon',
      type: 'select',
      // Names of workspace icons in public/icons/.
      options: [
        'outgoing-invoices',
        'incoming-invoices',
        'converter',
        'check',
        'files',
        'security',
        'team',
        'preview',
      ],
      admin: { position: 'sidebar', description: 'Icon on the service card.' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'title',
              label: 'Page title (H1)',
              type: 'text',
              required: true,
              localized: true,
              maxLength: 120,
            },
            {
              name: 'summary',
              type: 'textarea',
              required: true,
              localized: true,
              maxLength: 220,
              admin: { description: 'Lead paragraph and card text. Use the main keyword early.' },
            },
            {
              name: 'keyPoints',
              label: 'Key points',
              type: 'array',
              localized: true,
              minRows: 2,
              maxRows: 4,
              fields: [{ name: 'text', type: 'text', required: true, maxLength: 80 }],
            },
            sectionsField(),
          ],
        },
        { label: 'SEO', fields: seoFields },
      ],
    },
  ],
}
