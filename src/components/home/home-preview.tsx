'use client'

import type { Home } from '@/payload-types'
import type { HomeLocale } from '@/lib/home/defaults'
import type { ServiceCardsData } from '@/lib/website/types'
import { WebsitePagePreview } from '../website/page-preview'

export function HomePreview({
  home,
  locale,
  cards,
}: {
  home: Home
  locale: HomeLocale
  cards?: ServiceCardsData
}) {
  return <WebsitePagePreview data={home} slug="home" locale={locale} cards={cards} />
}
