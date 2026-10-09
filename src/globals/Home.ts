import type { GlobalConfig } from 'payload'
import { cmsEditor } from '../access/cms-editor'
import { homeHeroFields } from '../fields/home/hero'
import { homeProviderFields } from '../fields/home/providers'
import { homeDiagramFields } from '../fields/home/diagram'
import { protectGlobalDrafts } from '../hooks/protect-global-drafts'
import { CMS_VERSION_LIMIT, previewURL } from '../lib/cms-settings'

const homePreviewURL = (locale: string) => `${previewURL(locale)}&previewGlobal=home`

export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Home page',
  admin: {
    group: 'Website',
    livePreview: { url: ({ locale }) => homePreviewURL(locale.code) },
    preview: (_, { locale }) => homePreviewURL(locale),
    description:
      'Edit the hero and invoice-flow illustration. Translate text with the locale selector. Preview unsaved changes, save drafts, then publish when ready.',
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
        { label: 'Hero', fields: homeHeroFields },
        { label: 'Accounting companies', fields: homeProviderFields },
        { label: 'Diagram & workflow', fields: homeDiagramFields },
      ],
    },
  ],
}
