import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { isServiceSlug } from '@/fields/slug'
import type { WebsiteLocale } from './catalog'
import { contentItems } from './content-items'
import { publicMediaSelection } from './media-settings'
import type { ContentItem, ServiceCard, WebsiteSections } from './types'

type ReadOptions = {
  locale: WebsiteLocale
  draft: boolean
  user?: User & { collection: 'users' }
  req?: Partial<PayloadRequest>
}

export async function readServicePage(
  payload: Payload,
  slug: string,
  { locale, draft, user, req }: ReadOptions,
) {
  if (!isServiceSlug(slug)) return null
  const { docs } = await payload.find({
    collection: 'service-pages',
    where: { slug: { equals: slug } },
    locale,
    fallbackLocale: 'de',
    draft,
    user,
    req,
    overrideAccess: false,
    depth: 1,
    limit: 1,
    pagination: false,
    populate: { media: publicMediaSelection },
  })
  return docs[0] ?? null
}

// Previews include the editor's latest drafts so a draft overview is reviewable.
export async function listServiceCards(
  payload: Payload,
  { locale, draft = false, user, req }: Omit<ReadOptions, 'draft'> & { draft?: boolean },
) {
  const { docs } = await payload.find({
    collection: 'service-pages',
    locale,
    fallbackLocale: 'de',
    draft,
    user,
    req,
    overrideAccess: false,
    depth: 0,
    limit: 100,
    pagination: false,
    sort: 'sortOrder',
    select: {
      slug: true,
      title: true,
      summary: true,
      keyPoints: true,
      icon: true,
      updatedAt: true,
      seo: { noIndex: true },
    },
  })
  return docs.map(({ id, slug, title, summary, keyPoints, icon, updatedAt, seo }) => ({
    id,
    slug,
    title,
    summary,
    keyPoints,
    icon,
    updatedAt,
    noIndex: Boolean(seo?.noIndex),
  }))
}

// The published list decides visibility: drafts, deleted pages and duplicates
// in a selection are dropped. An empty selection shows every published page.
export function selectServiceCards(
  selected: ContentItem['services'],
  published: ServiceCard[],
): ServiceCard[] {
  if (!selected?.length) return published
  const byId = new Map(published.map((card) => [card.id, card]))
  const ids = selected.map((entry) => (typeof entry === 'object' && entry ? entry.id : entry))
  return [...new Set(ids)].flatMap((id) => byId.get(id) ?? [])
}

export function hasServiceCards(sections: WebsiteSections) {
  return contentItems(sections).some((item) => item.type === 'services')
}

// Live Preview may add a card item after the page loaded, so previews always
// carry the list.
export function needsServiceCards(sections: WebsiteSections, preview: boolean) {
  return preview || hasServiceCards(sections)
}
