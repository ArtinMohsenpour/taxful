import type { GlobalConfig } from 'payload'
import { cmsEditor } from '../../access/cms-editor'
import { sectionsField } from '../../blocks/website/layouts'
import { pageHeadingFields } from '../../fields/website/heading'
import { seoFields } from '../../fields/website/seo'
import { protectGlobalDrafts } from '../../hooks/protect-global-drafts'
import { CMS_VERSION_LIMIT, previewURL } from '../../lib/cms-settings'
import { websitePages } from '../../lib/website/catalog'

export const WebsiteGlobals: GlobalConfig[] = websitePages
  .filter(({ slug }) => slug !== 'home')
  .map(({ slug, path, en }) => {
    const preview = (locale: string) => `${previewURL(locale, path)}&previewGlobal=${slug}`
    return {
      slug,
      label: `${en} page`,
      admin: {
        group: 'Website',
        description:
          'Optional headings, reusable content sections and SEO. Preview unsaved edits, save a draft, then publish. Translate using the locale selector.',
        livePreview: { url: ({ locale }) => preview(locale.code) },
        preview: (_, { locale }) => preview(locale),
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
            { label: 'Page heading', fields: pageHeadingFields },
            { label: 'Content', fields: [sectionsField()] },
            { label: 'SEO', fields: seoFields },
          ],
        },
      ],
    }
  })
