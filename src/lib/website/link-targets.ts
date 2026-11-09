import type { Payload, PayloadRequest } from 'payload'
import { websitePage, type WebsiteLocale, type WebsitePageSlug } from './catalog'

// Pages editors can pick for internal links. Folder routes are listed here (a test
// keeps this in sync with src/app/(frontend)/[locale]); service pages are read from
// the CMS. Paths are stored without the /de or /en prefix.
export type LinkTargetGroupId = 'website' | 'services' | 'legal' | 'customer'
export type LinkTargetStatus = 'published' | 'draft'

export type LinkTarget = { path: string; label: string; status?: LinkTargetStatus }
export type LinkTargetGroup = { id: LinkTargetGroupId; label: string; options: LinkTarget[] }

type StaticTarget = {
  group: LinkTargetGroupId
  path: string
  // CMS page globals report a publication status; other routes are always live.
  page?: WebsitePageSlug
  de?: string
  en?: string
}

export const linkTargetGroups: { id: LinkTargetGroupId; label: string }[] = [
  { id: 'website', label: 'Website' },
  { id: 'services', label: 'Services' },
  { id: 'legal', label: 'Legal' },
  { id: 'customer', label: 'Customer area' },
]

export const staticLinkTargets: StaticTarget[] = [
  { group: 'website', path: '/', page: 'home' },
  { group: 'website', path: '/about', page: 'about' },
  { group: 'website', path: '/how-it-works', page: 'how-it-works' },
  { group: 'website', path: '/pricing', de: 'Preise', en: 'Pricing' },
  { group: 'website', path: '/faq', page: 'faq' },
  { group: 'website', path: '/contact', page: 'contact' },
  { group: 'services', path: '/services', page: 'services' },
  { group: 'legal', path: '/privacy', page: 'privacy' },
  { group: 'legal', path: '/terms', page: 'terms' },
  { group: 'legal', path: '/impressum', page: 'impressum' },
  { group: 'customer', path: '/login', de: 'Anmelden', en: 'Log in' },
  { group: 'customer', path: '/signup', de: 'Registrieren', en: 'Sign up' },
  { group: 'customer', path: '/forgot-password', de: 'Passwort vergessen', en: 'Forgot password' },
  { group: 'customer', path: '/portal', de: 'Kundenportal', en: 'Customer portal' },
]

// Folder routes deliberately not offered: token links from emails and private
// workspace sections reached from the portal's own navigation.
export const unlinkableRoutes = [
  '/accept-invitation',
  '/reset-password',
  '/verify-email',
  '/portal/converter',
  '/portal/files',
  '/portal/profile',
  '/portal/security',
  '/portal/team',
]

const staticLabel = (target: StaticTarget, locale: WebsiteLocale) => {
  const page = target.page ? websitePage(target.page) : undefined
  return (page?.[locale] ?? target[locale] ?? target.path) as string
}

export async function listLinkTargets(
  payload: Payload,
  { locale, req }: { locale: WebsiteLocale; req?: Partial<PayloadRequest> },
): Promise<LinkTargetGroup[]> {
  const pageSlugs = staticLinkTargets.flatMap((target) => (target.page ? [target.page] : []))
  const [statuses, services] = await Promise.all([
    Promise.all(
      pageSlugs.map(async (slug) => {
        const doc = await payload.findGlobal({
          slug,
          depth: 0,
          overrideAccess: true,
          req: req ? { ...req } : undefined,
          select: { _status: true },
        })
        return [slug, doc._status === 'published' ? 'published' : 'draft'] as const
      }),
    ),
    payload.find({
      collection: 'service-pages',
      locale,
      fallbackLocale: 'de',
      depth: 0,
      limit: 200,
      sort: 'sortOrder',
      overrideAccess: true,
      req: req ? { ...req } : undefined,
      select: { slug: true, title: true, _status: true },
    }),
  ])
  const status = new Map<string, LinkTargetStatus>(statuses)
  const options = new Map<LinkTargetGroupId, LinkTarget[]>()
  for (const target of staticLinkTargets)
    options.set(target.group, [
      ...(options.get(target.group) ?? []),
      {
        path: target.path,
        label: staticLabel(target, locale),
        status: target.page ? status.get(target.page) : undefined,
      },
    ])
  options.get('services')!.push(
    ...services.docs.flatMap((doc) =>
      doc.slug
        ? [
            {
              path: `/services/${doc.slug}`,
              label: doc.title || doc.slug,
              status: (doc._status === 'published' ? 'published' : 'draft') as LinkTargetStatus,
            },
          ]
        : [],
    ),
  )
  return linkTargetGroups.map((group) => ({ ...group, options: options.get(group.id) ?? [] }))
}

// Compares stored values regardless of a leading or trailing slash, query or hash.
export function normalizeLinkPath(value: string | null | undefined) {
  const path = (value ?? '').trim().split(/[?#]/)[0]
  if (!path) return ''
  const withSlash = path.startsWith('/') ? path : `/${path}`
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash
}
