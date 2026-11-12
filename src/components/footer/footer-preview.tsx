'use client'

import { useEffect } from 'react'
import { useOrderedLivePreview } from '@/lib/live-preview'
import type { Footer, Media } from '@/payload-types'
import { FooterView, type FooterLabels } from './footer-view'

export function FooterPreview({
  footer,
  fallbackLogo,
  labels,
  year,
}: {
  footer: Footer
  fallbackLogo: Media | null
  labels: FooterLabels
  year: number
}) {
  const data = useOrderedLivePreview(footer)
  // The preview opens the home page; bring the footer into view for the editor,
  // again after images above it have loaded and shifted the layout.
  useEffect(() => {
    const reveal = () => document.getElementById('site-footer')?.scrollIntoView?.({ block: 'end' })
    reveal()
    window.addEventListener('load', reveal, { once: true })
    return () => window.removeEventListener('load', reveal)
  }, [])
  return <FooterView footer={data} fallbackLogo={fallbackLogo} labels={labels} year={year} />
}
