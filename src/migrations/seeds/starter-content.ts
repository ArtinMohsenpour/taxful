import type { GlobalSlug, Payload, PayloadRequest } from 'payload'
import { seedFooter } from './footer-20261109'
import { seedServicePages } from './services-20261106'
import { seedWebsite, websiteSeedGlobals } from './website-20261009'

export type StarterArea = 'website' | 'services' | 'footer'

// Starter website content for a new database, run by `pnpm content:seed` after
// `pnpm payload migrate`. It is not part of a migration: Payload's Local API always
// uses the current schema, so a migration replayed on an empty database would query
// tables that later migrations add. Each area is seeded only while it is untouched,
// so running the command again, or on an existing database, changes nothing.
export async function seedStarterContent(payload: Payload, req: Partial<PayloadRequest>) {
  // Sequential: every query shares the transaction's single connection.
  const untouched = async (slugs: readonly GlobalSlug[]) => {
    for (const global of slugs) {
      const { totalDocs } = await payload.countGlobalVersions({ global, req, overrideAccess: true })
      if (totalDocs) return false
    }
    return true
  }
  const isEmpty = async (collection: 'website-forms' | 'service-pages') =>
    (await payload.count({ collection, req, overrideAccess: true })).totalDocs === 0

  const seeded: StarterArea[] = []
  // Published pages, legal drafts and the contact form (see docs/website-builder.md).
  if ((await isEmpty('website-forms')) && (await untouched(websiteSeedGlobals))) {
    await seedWebsite(payload, req)
    seeded.push('website')
  }
  // Six service pages and a Services page version, all drafts for review.
  if (await isEmpty('service-pages')) {
    await seedServicePages(payload, req)
    seeded.push('services')
  }
  // Published starter links to existing routes (see docs/footer.md).
  if (await untouched(['footer'])) {
    await seedFooter(payload, req)
    seeded.push('footer')
  }
  return seeded
}
