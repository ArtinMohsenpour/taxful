'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'
import type { ServiceCardsData, WebsitePageDocument } from '@/lib/website/types'
import type { WebsiteLocale, WebsitePageSlug } from '@/lib/website/catalog'
import { WebsitePageContent } from './page-content'

export function WebsitePagePreview({
  data: initialData,
  slug,
  locale,
  cards,
}: {
  data: WebsitePageDocument
  slug: WebsitePageSlug
  locale: WebsiteLocale
  cards?: ServiceCardsData
}) {
  const { data } = useLivePreview<WebsitePageDocument>({
    initialData,
    serverURL: typeof window === 'undefined' ? '' : window.location.origin,
    depth: 1,
  })
  return <WebsitePageContent data={data} slug={slug} locale={locale} cards={cards} preview />
}
