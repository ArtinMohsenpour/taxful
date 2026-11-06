import type { Home } from '@/payload-types'
import type { WebsitePageDocument } from '@/lib/website/types'
import type { WebsiteLocale, WebsitePageSlug } from '@/lib/website/catalog'
import { homeContent } from '@/lib/home/content'
import { HeroSection } from '../home/hero/hero-section'
import { PageHeading } from './page-heading'
import { WebsiteSections } from './sections'

export function WebsitePageContent({
  data,
  slug,
  locale,
  preview = false,
}: {
  data: WebsitePageDocument
  slug: WebsitePageSlug
  locale: WebsiteLocale
  preview?: boolean
}) {
  return (
    <>
      {slug === 'home' ? (
        <HeroSection {...homeContent(data as Home, locale)} />
      ) : (
        <PageHeading
          eyebrow={data.eyebrow}
          title={data.title}
          subtitle={'subtitle' in data ? data.subtitle : undefined}
        />
      )}
      <WebsiteSections sections={data.sections} locale={locale} page={slug} preview={preview} />
    </>
  )
}
