import type { Payload, PayloadRequest } from 'payload'
import type { Footer, Media, User } from '@/payload-types'
import { publicMediaSelection } from '../website/media-settings'

export type FooterData = { footer: Footer; fallbackLogo: Media | null }

// Never-published (or unpublished) footers render as empty rather than leaking drafts.
const emptyFooter = (id: number): Footer => ({ id })

export async function readFooter(
  payload: Payload,
  {
    locale,
    draft = false,
    user,
    req,
  }: {
    locale: 'de' | 'en'
    draft?: boolean
    user?: User & { collection: 'users' }
    req?: Partial<PayloadRequest>
  },
): Promise<FooterData> {
  const [footer, navbar] = await Promise.all([
    payload.findGlobal({
      slug: 'footer',
      locale,
      // Structure is shared; untranslated English labels fall back to German.
      fallbackLocale: 'de',
      draft,
      user,
      req,
      overrideAccess: false,
      depth: 1,
      populate: { media: publicMediaSelection },
    }),
    // The navigation logo is the default footer logo, so editors upload it once.
    payload.findGlobal({
      slug: 'navbar',
      req: req ? { ...req } : undefined,
      overrideAccess: false,
      depth: 1,
      select: { logo: true },
      populate: { media: publicMediaSelection },
    }),
  ])
  return {
    footer: draft || footer._status === 'published' ? footer : emptyFooter(footer.id),
    fallbackLogo: typeof navbar.logo === 'object' ? (navbar.logo ?? null) : null,
  }
}
