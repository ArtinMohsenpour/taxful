import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import type { WebsiteLocale, WebsitePageSlug } from './catalog'
import { publicMediaSelection } from './media-settings'

export async function readWebsitePage(
  payload: Payload,
  slug: WebsitePageSlug,
  locale: WebsiteLocale,
  draft = false,
  user?: User & { collection: 'users' },
  req?: Partial<PayloadRequest>,
) {
  const query = {
    slug,
    locale,
    draft,
    user,
    req,
    overrideAccess: false,
    depth: 1,
    populate: { media: publicMediaSelection },
  }
  // Explicitly blank optional copy stays blank. Sections fall back to German
  // only if an English section layout has not been created yet.
  const [page, heading] = await Promise.all([
    payload.findGlobal({ ...query, fallbackLocale: 'de' }),
    payload.findGlobal({
      ...query,
      req: req ? { ...req } : undefined,
      fallbackLocale: false,
      depth: 0,
      select:
        slug === 'home'
          ? { eyebrow: true, title: true, titleAccent: true, description: true }
          : { eyebrow: true, title: true, subtitle: true },
    }),
  ])
  return { ...page, ...heading }
}
