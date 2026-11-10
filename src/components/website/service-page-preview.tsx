'use client'

import { useOrderedLivePreview } from '@/lib/live-preview'
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
  const data = useOrderedLivePreview(initialData)
  return <ServicePageContent data={data} {...props} />
}
