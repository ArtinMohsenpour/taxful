import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import type { HomeLocale } from './defaults'

type HomeReadOptions = {
  locale: HomeLocale
  draft: boolean
  user?: User & { collection: 'users' }
  req?: Partial<PayloadRequest>
}

export async function readHome(payload: Payload, { locale, draft, user, req }: HomeReadOptions) {
  const query = {
    slug: 'home' as const,
    locale,
    fallbackLocale: 'de' as const,
    draft,
    user,
    req,
    overrideAccess: false,
    depth: 1,
    populate: { media: { alt: true, url: true, width: true, height: true, mimeType: true } } as const,
  }
  const localized = payload.findGlobal(query)
  if (locale === 'de') return localized

  // Payload falls back even for explicitly cleared localized text. Read the
  // optional hero fields without fallback so an empty English field stays hidden.
  const [home, hero] = await Promise.all([
    localized,
    payload.findGlobal({
      ...query,
      req: req ? { ...req } : undefined,
      fallbackLocale: false,
      depth: 0,
      select: { eyebrow: true, title: true, titleAccent: true, description: true },
    }),
  ])
  return {
    ...home,
    eyebrow: hero.eyebrow,
    title: hero.title,
    titleAccent: hero.titleAccent,
    description: hero.description,
  }
}
