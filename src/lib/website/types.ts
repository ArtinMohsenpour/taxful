import type { Config, Home, ServicePage } from '@/payload-types'
import type { WebsitePageSlug } from './catalog'

export type WebsiteForm = Config['collections']['website-forms']
export type WebsiteContent = NonNullable<
  NonNullable<Home['sections']>[number]['column1']
>['content']
export type ContentItem = NonNullable<WebsiteContent>[number]
export type WebsiteSection = NonNullable<Home['sections']>[number]
export type WebsitePageDocument = Config['globals'][WebsitePageSlug]
export type WebsiteSections = WebsitePageDocument['sections']
export type ServiceCard = Pick<
  ServicePage,
  'id' | 'slug' | 'title' | 'summary' | 'keyPoints' | 'icon'
>
export type ServiceCardsData = { items: ServiceCard[]; readMore: string }
