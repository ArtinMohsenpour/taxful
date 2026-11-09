import 'server-only'
import { getLocale } from 'next-intl/server'
import { Navbar } from '@/components/navbar'
import type { WebsitePageSlug } from '@/lib/website/catalog'
import { loadWebsitePage, serviceCardsFor } from '@/lib/website/load'
import { pageMetadata } from '@/lib/website/metadata'
import { faqJsonLd } from '@/lib/website/structured-data'
import { JsonLd } from './json-ld'
import { WebsitePageContent } from './page-content'
import { WebsitePagePreview } from './page-preview'

type PublicPageSlug = Exclude<WebsitePageSlug, 'home'>

export type PublicWebsitePageProps = {
  searchParams: Promise<{ preview?: string; previewGlobal?: string }>
}

async function pageContext(
  slug: PublicPageSlug,
  searchParams: PublicWebsitePageProps['searchParams'],
) {
  const [search, locale] = await Promise.all([searchParams, getLocale()])
  const preview = search.preview === 'true'
  const data = await loadWebsitePage(slug, locale, preview)
  return { locale, preview, data }
}

export async function websitePageMetadata(
  slug: PublicPageSlug,
  searchParams: PublicWebsitePageProps['searchParams'],
) {
  const { data, locale, preview } = await pageContext(slug, searchParams)
  return pageMetadata(data, slug, locale, preview)
}

export async function PublicWebsitePage({
  slug,
  searchParams,
}: PublicWebsitePageProps & { slug: PublicPageSlug }) {
  const { data, locale, preview } = await pageContext(slug, searchParams)
  const cards = await serviceCardsFor(data.sections, locale, preview)
  return (
    <div className="relative isolate flex min-h-dvh flex-col pt-3 sm:pt-6">
      <Navbar />
      <main
        id="main"
        tabIndex={-1}
        className="relative mx-auto w-full max-w-6xl flex-1 px-5 sm:px-6"
      >
        {preview ? (
          <WebsitePagePreview data={data} slug={slug} locale={locale} cards={cards} />
        ) : (
          <>
            <WebsitePageContent data={data} slug={slug} locale={locale} cards={cards} />
            <JsonLd data={faqJsonLd(data.sections)} />
          </>
        )}
      </main>
    </div>
  )
}
