'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'
import type { Home } from '@/payload-types'
import { homeContent } from '@/lib/home/content'
import type { HomeLocale } from '@/lib/home/defaults'
import { HeroSection } from './hero/hero-section'

export function HomePreview({ home, locale }: { home: Home; locale: HomeLocale }) {
  const { data } = useLivePreview<Home>({
    initialData: home,
    serverURL: typeof window === 'undefined' ? '' : window.location.origin,
    depth: 1,
  })
  return <HeroSection {...homeContent(data, locale)} />
}
