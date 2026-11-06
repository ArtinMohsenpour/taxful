import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requirePreviewUser } from '../preview-auth'
import { readWebsitePage } from './read'
import { websitePages, type WebsiteLocale, type WebsitePageSlug } from './catalog'

export const loadWebsitePage = cache(
  async (slug: WebsitePageSlug, locale: WebsiteLocale, preview: boolean) => {
    await connection()
    const payload = await getPayload({ config })
    const user = preview ? await requirePreviewUser(payload) : undefined
    const page = await readWebsitePage(payload, slug, locale, preview, user)
    if (!preview && page._status !== 'published') notFound()
    return page
  },
)

export const publishedWebsitePages = cache(async (locale: WebsiteLocale) => {
  const payload = await getPayload({ config })
  const pages = await Promise.all(
    websitePages.map(async (page) => {
      const doc = await payload.findGlobal({
        slug: page.slug,
        locale,
        overrideAccess: false,
        depth: 0,
        select: { _status: true, updatedAt: true, seo: { noIndex: true } },
      })
      return doc._status === 'published'
        ? { ...page, updatedAt: doc.updatedAt, noIndex: doc.seo?.noIndex }
        : null
    }),
  )
  return pages.filter((page) => page !== null)
})
