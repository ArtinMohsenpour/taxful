'use client'

import type { Home } from '@/payload-types'
import type { HomeLocale } from '@/lib/home/defaults'
import { WebsitePagePreview } from '../website/page-preview'

export function HomePreview({ home, locale }: { home: Home; locale: HomeLocale }) {
  return <WebsitePagePreview data={home} slug="home" locale={locale} />
}
