import type { MetadataRoute } from 'next'
import { publishedWebsitePages } from '@/lib/website/load'
import { websiteOrigin } from '@/lib/website/metadata'

export const dynamic = 'force-dynamic'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await publishedWebsitePages('de')
  const base = websiteOrigin()
  return pages
    .filter((page) => !page.noIndex)
    .flatMap((page) =>
      ['de', 'en'].map((locale) => {
        const href = (language: string) =>
          `${base}/${language}${page.path === '/' ? '' : page.path}`
        return {
          url: href(locale),
          lastModified: page.updatedAt ? new Date(page.updatedAt) : undefined,
          alternates: { languages: { de: href('de'), en: href('en') } },
        }
      }),
    )
}
