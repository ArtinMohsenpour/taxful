import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { Navbar } from '@/components/navbar'
import { HeroSection } from '@/components/home/hero/hero-section'
import { HomePreview } from '@/components/home/home-preview'
import { loadHome } from '@/lib/home/load'
import { homeContent } from '@/lib/home/content'
import { WebsiteSections } from '@/components/website/sections'
import { pageMetadata } from '@/lib/website/metadata'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; previewGlobal?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const locale = await getLocale()
  const preview = params.preview === 'true'
  return pageMetadata(
    await loadHome(locale, preview && params.previewGlobal === 'home'),
    'home',
    locale,
    preview,
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; previewGlobal?: string }>
}) {
  const params = await searchParams
  const preview = params.preview === 'true'
  const homePreview = preview && params.previewGlobal === 'home'
  const locale = await getLocale()
  const home = await loadHome(locale, homePreview)

  return (
    <div className="relative isolate flex min-h-dvh flex-col pt-3 sm:pt-6">
      <Navbar preview={preview && !homePreview} />
      <main
        id="main"
        tabIndex={-1}
        className="relative mx-auto w-full max-w-6xl flex-1 px-5 sm:px-6"
      >
        {homePreview ? (
          <HomePreview home={home} locale={locale} />
        ) : (
          <>
            <HeroSection {...homeContent(home, locale)} />
            <WebsiteSections sections={home.sections} locale={locale} page="home" />
          </>
        )}
      </main>
    </div>
  )
}
