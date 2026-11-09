import type {
  Field,
  GlobalConfig,
  TextFieldSingleValidation,
  UploadFieldSingleValidation,
} from 'payload'
import { upload } from 'payload/shared'
import { cmsEditor } from '../access/cms-editor'
import { navigationLinkFields } from '../fields/navigation-link'
import { protectGlobalDrafts } from '../hooks/protect-drafts'
import { ADMIN_GROUPS, CMS_VERSION_LIMIT, previewURL } from '../lib/cms-settings'
import { PHONE_PATTERN } from '../lib/footer/contact'
import { socialPlatforms } from '../lib/footer/social'
import { externalHref } from '../lib/navigation-links'

const footerPreviewURL = (locale: string) => `${previewURL(locale)}&previewGlobal=footer`

const rowLabel = (fields: string[], fallback: string, options?: Record<string, string>) => ({
  path: '/components/admin/row-label',
  clientProps: { fields, fallback, options },
})

type Condition = NonNullable<NonNullable<Field['admin']>['condition']>
// Logos may be SVG: they render through <img>, which never runs SVG scripts, and
// Media rejects unsafe SVG content on upload (src/lib/website/svg-safety.ts).
const logoTypes = [
  'image/svg+xml',
  'image/png',
  'image/webp',
  'image/avif',
  'image/jpeg',
  'image/gif',
]
const logoTypeMessage = 'Choose an SVG, PNG, WebP, AVIF, JPEG or GIF image.'

// Explains unsupported formats instead of Payload's generic "invalid selections".
const validateLogo: UploadFieldSingleValidation = async (value, options) => {
  const id = value && typeof value === 'object' && 'id' in value ? value.id : value
  if (typeof id === 'number' || typeof id === 'string') {
    const media = await options.req.payload
      .findByID({
        collection: 'media',
        id,
        depth: 0,
        req: options.req,
        overrideAccess: true,
        select: { mimeType: true },
      })
      .catch(() => null)
    if (media && !logoTypes.includes(media.mimeType ?? '')) return logoTypeMessage
  }
  return upload(value, options)
}

const imageField = (
  name: string,
  label: string,
  description: string,
  { required = false, condition }: { required?: boolean; condition?: Condition } = {},
): Field => ({
  name,
  label,
  type: 'upload',
  relationTo: 'media',
  required,
  maxDepth: 1,
  filterOptions: { mimeType: { in: logoTypes } },
  validate: validateLogo,
  admin: { description, condition },
})

const validateExternal =
  (required: boolean): TextFieldSingleValidation =>
  (value) =>
    (!required && !value?.trim()) ||
    Boolean(externalHref(value)) ||
    'Enter a valid HTTPS or HTTP URL without credentials.'

const validatePhone: TextFieldSingleValidation = (value) =>
  !value?.trim() ||
  PHONE_PATTERN.test(value.trim()) ||
  'Use digits, spaces and + ( ) / - . only, e.g. +49 30 1234567.'

// Shared by the column links and the bottom-bar legal links.
const linkList = (name: string, label: string, maxRows: number, description: string): Field => ({
  name,
  label,
  type: 'array',
  maxRows,
  labels: { singular: 'Link', plural: 'Links' },
  // Collapsed rows keep long lists scannable; each row label shows the link text.
  admin: {
    description,
    initCollapsed: true,
    components: { RowLabel: rowLabel(['label'], 'Link') },
  },
  fields: [
    { name: 'label', type: 'text', required: true, localized: true, maxLength: 80 },
    {
      name: 'link',
      label: false,
      type: 'group',
      fields: navigationLinkFields({ requirePath: true }),
    },
  ],
})

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  admin: {
    group: ADMIN_GROUPS.settings,
    livePreview: { url: ({ locale }) => footerPreviewURL(locale.code) },
    preview: (_, { locale }) => footerPreviewURL(locale),
    description:
      'Shown at the bottom of every public page; customer pages show the bottom bar only. Translate text with the locale selector — order and structure are shared. Empty sections are hidden. Preview unsaved edits, save a draft, then publish.',
  },
  access: {
    read: ({ req }) => cmsEditor({ req }) || { _status: { equals: 'published' } },
    update: cmsEditor,
    readVersions: cmsEditor,
  },
  hooks: { beforeOperation: [protectGlobalDrafts] },
  versions: { drafts: true, max: CMS_VERSION_LIMIT },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Brand & contact',
          fields: [
            imageField(
              'logo',
              'Footer logo',
              'Leave empty to reuse the navigation logo, or the default Taxful branding. SVG or a transparent PNG works best.',
            ),
            imageField(
              'logoDark',
              'Logo for dark theme',
              'Optional light version, shown instead of the footer logo in dark mode.',
              { condition: (_, sibling) => Boolean(sibling.logo) },
            ),
            {
              name: 'tagline',
              type: 'textarea',
              localized: true,
              maxLength: 240,
              admin: { description: 'A short sentence under the logo.', rows: 2 },
            },
            {
              name: 'contact',
              label: 'Contact details',
              type: 'group',
              admin: { description: 'Optional. Empty fields are not shown.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'email', type: 'email', admin: { width: '50%' } },
                    {
                      name: 'phone',
                      type: 'text',
                      maxLength: 40,
                      validate: validatePhone,
                      admin: { width: '50%', placeholder: '+49 30 1234567' },
                    },
                  ],
                },
                {
                  name: 'address',
                  type: 'textarea',
                  localized: true,
                  maxLength: 300,
                  admin: { description: 'Line breaks are kept.', rows: 3 },
                },
              ],
            },
          ],
        },
        {
          label: 'Link columns',
          fields: [
            {
              name: 'columns',
              type: 'array',
              maxRows: 5,
              labels: { singular: 'Column', plural: 'Columns' },
              admin: {
                description:
                  'Up to five columns, e.g. Services, Company and Legal. Drag rows to reorder columns and links.',
                components: { RowLabel: rowLabel(['title'], 'Column') },
              },
              fields: [
                { name: 'title', type: 'text', required: true, localized: true, maxLength: 60 },
                linkList(
                  'links',
                  'Links',
                  12,
                  'Internal paths get the /de or /en prefix automatically.',
                ),
              ],
            },
          ],
        },
        {
          label: 'Social media',
          fields: [
            {
              name: 'socialTitle',
              label: 'Heading',
              type: 'text',
              localized: true,
              maxLength: 60,
              admin: { description: 'Optional, e.g. "Follow us".' },
            },
            {
              name: 'social',
              label: 'Profiles',
              type: 'array',
              maxRows: 10,
              labels: { singular: 'Profile', plural: 'Profiles' },
              admin: {
                description: 'Shown as icons. Profiles open in a new tab.',
                components: {
                  RowLabel: rowLabel(
                    ['label', 'platform'],
                    'Profile',
                    Object.fromEntries(socialPlatforms.map(({ value, label }) => [value, label])),
                  ),
                },
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'platform',
                      type: 'select',
                      required: true,
                      options: socialPlatforms.map(({ value, label }) => ({ value, label })),
                      admin: { width: '35%' },
                    },
                    {
                      name: 'url',
                      label: 'Profile URL',
                      type: 'text',
                      required: true,
                      validate: validateExternal(true),
                      admin: { width: '65%', placeholder: 'https://' },
                    },
                  ],
                },
                {
                  name: 'label',
                  label: 'Accessible name',
                  type: 'text',
                  localized: true,
                  maxLength: 80,
                  admin: {
                    description:
                      'Optional, e.g. "Taxful on LinkedIn". Defaults to the platform name.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Partners',
          fields: [
            {
              name: 'partnersTitle',
              label: 'Heading',
              type: 'text',
              localized: true,
              maxLength: 60,
              admin: { description: 'Optional, e.g. "Partners & memberships".' },
            },
            {
              name: 'partners',
              type: 'array',
              maxRows: 12,
              labels: { singular: 'Partner', plural: 'Partners' },
              admin: {
                description:
                  'Logos of partners, memberships or certifications. Only list relationships that actually exist.',
                components: { RowLabel: rowLabel(['name'], 'Partner') },
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                      required: true,
                      maxLength: 80,
                      admin: {
                        width: '50%',
                        description: 'Used as the image description for screen readers.',
                      },
                    },
                    {
                      name: 'url',
                      label: 'Website',
                      type: 'text',
                      validate: validateExternal(false),
                      admin: {
                        width: '50%',
                        placeholder: 'https://',
                        description: 'Optional. Opens in a new tab.',
                      },
                    },
                  ],
                },
                imageField(
                  'logo',
                  'Logo',
                  'SVG works best; a transparent PNG or WebP also works.',
                  {
                    required: true,
                  },
                ),
                {
                  name: 'appearance',
                  type: 'radio',
                  defaultValue: 'original',
                  options: [
                    { label: 'Original colours', value: 'original' },
                    { label: 'Monochrome (matches the theme)', value: 'monochrome' },
                  ],
                  admin: {
                    description:
                      'Monochrome works with transparent logos and keeps a calm, uniform row in light and dark mode.',
                  },
                },
                imageField(
                  'logoDark',
                  'Logo for dark theme',
                  'Optional light version for dark mode when using original colours.',
                  { condition: (_, sibling) => sibling.appearance !== 'monochrome' },
                ),
              ],
            },
          ],
        },
        {
          label: 'Bottom bar',
          fields: [
            {
              name: 'copyright',
              type: 'text',
              localized: true,
              maxLength: 120,
              admin: {
                description: 'Use {year} for the current year, e.g. © {year} Taxful GmbH.',
              },
            },
            linkList(
              'legalLinks',
              'Legal links',
              8,
              'Short links such as Privacy, Terms and Legal notice (Impressum). Keep the legal notice reachable from every page.',
            ),
            {
              name: 'note',
              label: 'Small print',
              type: 'textarea',
              localized: true,
              maxLength: 400,
              admin: { description: 'Optional short note below the copyright.', rows: 2 },
            },
          ],
        },
      ],
    },
  ],
}
