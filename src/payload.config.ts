import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Navbar } from './globals/Navbar'
import { Home } from './globals/Home'
import { WebsiteGlobals } from './globals/website/page'
import { WebsiteForms } from './collections/WebsiteForms'
import { FormSubmissions } from './collections/FormSubmissions'
import { ServicePages } from './collections/ServicePages'
import { websiteLayouts } from './blocks/website/layouts'
import { PUBLIC_MEDIA_MAX_BYTES } from './lib/website/media-settings'
import { staffEmailAdapter } from './lib/staff-auth/email'
import { installStaffMfa } from './lib/staff-auth/strategy'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  onInit: installStaffMfa,
  email: staffEmailAdapter,
  admin: {
    components: {
      afterNavLinks: ['/components/admin-nav/administration'],
      views: {
        login: { Component: '/components/staff-auth/login', path: '/login', exact: true },
        billing: { Component: '/components/billing-admin/view', path: '/billing' },
      },
    },
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 390, height: 844 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // Order sets the sidebar group order (see ADMIN_GROUPS).
  collections: [ServicePages, WebsiteForms, FormSubmissions, Media, Users],
  globals: [Home, ...WebsiteGlobals, Navbar],
  blocks: websiteLayouts,
  upload: {
    limits: { fileSize: PUBLIC_MEDIA_MAX_BYTES },
    abortOnLimit: true,
    responseOnLimit: 'The file is too large. Please use a file smaller than 50 MB.',
  },
  localization: {
    locales: ['de', 'en'],
    defaultLocale: 'de',
    fallback: true,
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    // Layouts are bounded editorial documents. Keep them in JSONB instead of
    // duplicating every block/column table across the fixed page globals.
    blocksAsJSON: true,
    // Preserve existing data/schema; use reviewed migrations rather than automatic drops.
    push: false,
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
