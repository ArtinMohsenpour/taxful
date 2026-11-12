import type { Payload, PayloadRequest } from 'payload'
import { websitePage, type WebsiteLocale, type WebsitePageSlug } from './catalog'

// Pages editors can pick for internal links. Folder routes are listed here (a test
// keeps this in sync with src/app/(frontend)/[locale]); service pages are read from
// the CMS. Paths are stored without the /de or /en prefix.
type LinkTargetGroupId = 'website' | 'services' | 'legal' | 'customer'
type LinkTargetStatus = 'published' | 'draft'

export type LinkTarget = { path: string; label: string; status?: LinkTargetStatus }
export type LinkTargetGroup = { id: LinkTargetGroupId; label: string; options: LinkTarget[] }

type StaticTarget = {
  group: LinkTargetGroupId
  path: string
  label: Record<WebsiteLocale, string>
  // CMS page globals report a publication status; other routes are always live.
  page?: WebsitePageSlug
}

// CMS pages take their path and labels from the website catalog.
const cmsPage = (group: LinkTargetGroupId, slug: WebsitePageSlug): StaticTarget => {
  const page = websitePage(slug)!
  return { group, path: page.path, label: { de: page.de, en: page.en }, page: slug }
}
const route = (group: LinkTargetGroupId, path: string, de: string, en: string): StaticTarget => ({
  group,
  path,
  label: { de, en },
})

const linkTargetGroups: { id: LinkTargetGroupId; label: string }[] = [
  { id: 'website', label: 'Website' },
  { id: 'services', label: 'Services' },
  { id: 'legal', label: 'Legal' },
  { id: 'customer', label: 'Customer area' },
]

export const staticLinkTargets: StaticTarget[] = [
  cmsPage('website', 'home'),
  cmsPage('website', 'about'),
  cmsPage('website', 'how-it-works'),
  route('website', '/pricing', 'Preise', 'Pricing'),
  cmsPage('website', 'faq'),
  cmsPage('website', 'contact'),
  cmsPage('services', 'services'),
  cmsPage('legal', 'privacy'),
  cmsPage('legal', 'terms'),
  cmsPage('legal', 'impressum'),
  route('customer', '/login', 'Anmelden', 'Log in'),
  route('customer', '/signup', 'Registrieren', 'Sign up'),
  route('customer', '/forgot-password', 'Passwort vergessen', 'Forgot password'),
  route('customer', '/portal', 'Kundenportal', 'Customer portal'),
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

// Runs with the requesting CMS user's access, so drafts are listed only for editors.
export async function listLinkTargets(
  payload: Payload,
  { locale, req }: { locale: WebsiteLocale; req: Partial<PayloadRequest> },
): Promise<LinkTargetGroup[]> {
  const pageSlugs = staticLinkTargets.flatMap((target) => (target.page ? [target.page] : []))
  const [statuses, services] = await Promise.all([
    Promise.all(
      pageSlugs.map(async (slug) => {
        const doc = await payload.findGlobal({
          slug,
          depth: 0,
          overrideAccess: false,
          req: { ...req },
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
      overrideAccess: false,
      req: { ...req },
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
        label: target.label[locale],
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
