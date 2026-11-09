'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'
import type { ServicePage } from '@/payload-types'
import type { WebsiteLocale } from '@/lib/website/catalog'
import type { ServiceCardsData } from '@/lib/website/types'
import { ServicePageContent, type ServicePageLabels } from './service-page'

export function ServicePagePreview({
  data: initialData,
  ...props
}: {
  data: ServicePage
  locale: WebsiteLocale
  cards?: ServiceCardsData
  labels: ServicePageLabels
}) {
  const { data } = useLivePreview<ServicePage>({
    initialData,
    serverURL: typeof window === 'undefined' ? '' : window.location.origin,
    depth: 1,
  })
  return <ServicePageContent data={data} {...props} />
}
