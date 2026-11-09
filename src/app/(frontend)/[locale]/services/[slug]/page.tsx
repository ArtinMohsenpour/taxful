import { getLocale, getTranslations } from 'next-intl/server'
import { Navbar } from '@/components/navbar'
import { JsonLd } from '@/components/website/json-ld'
import { ServicePageContent } from '@/components/website/service-page'
import { ServicePagePreview } from '@/components/website/service-page-preview'
import { websitePage } from '@/lib/website/catalog'
import { loadServicePage, serviceCardsFor } from '@/lib/website/load'
import { servicePageMetadata } from '@/lib/website/metadata'
import { servicePageJsonLd } from '@/lib/website/structured-data'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string; previewCollection?: string }>
}

async function pageContext({ params, searchParams }: Props) {
  const [{ slug }, search, locale] = await Promise.all([params, searchParams, getLocale()])
  const preview = search.preview === 'true' && search.previewCollection === 'service-pages'
  return { data: await loadServicePage(slug, locale, preview), locale, preview }
}

export async function generateMetadata(props: Props) {
  const { data, locale, preview } = await pageContext(props)
  return servicePageMetadata(data, locale, preview)
}

export default async function ServicePageRoute(props: Props) {
  const { data, locale, preview } = await pageContext(props)
  const [t, cards] = await Promise.all([
    getTranslations('Services'),
    serviceCardsFor(data.sections, locale, preview),
  ])
  const labels = {
    services: websitePage('services')![locale],
    keyPoints: t('keyPoints'),
    startFree: t('startFree'),
    viewPricing: t('viewPricing'),
  }
  return (
    <div className="relative isolate flex min-h-dvh flex-col pt-3 sm:pt-6">
      <Navbar />
      <main
        id="main"
        tabIndex={-1}
        className="relative mx-auto w-full max-w-6xl flex-1 px-5 sm:px-6"
      >
        {preview ? (
          <ServicePagePreview data={data} locale={locale} cards={cards} labels={labels} />
        ) : (
          <>
            <ServicePageContent data={data} locale={locale} cards={cards} labels={labels} />
            <JsonLd data={servicePageJsonLd(data, locale)} />
          </>
        )}
      </main>
    </div>
  )
}
