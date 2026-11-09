import { editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, PayloadRequest } from 'payload'
import { websiteEditorFeatures } from '../../../fields/website/content'
import { eRechnungEmpfangen } from './e-rechnung-empfangen'
import { eRechnungErstellen } from './e-rechnung-erstellen'
import { eRechnungPruefen } from './e-rechnung-pruefen'
import { gutschriftKorrekturSchlussrechnung } from './gutschrift-korrektur-schlussrechnung'
import { landingSeed } from './landing'
import { pdfInERechnungUmwandeln } from './pdf-in-e-rechnung-umwandeln'
import { rechnungenDigitalVerwalten } from './rechnungen-digital-verwalten'
import { toSections, toServicePage } from './to-payload'
import type { ServiceSeed, ServiceSlug } from './types'

export { landingSeed }

export const serviceSeeds: ServiceSeed[] = [
  eRechnungErstellen,
  pdfInERechnungUmwandeln,
  eRechnungEmpfangen,
  eRechnungPruefen,
  gutschriftKorrekturSchlussrechnung,
  rechnungenDigitalVerwalten,
]

const locales = ['de', 'en'] as const

// Creates missing service pages and a new Services page version, all as
// drafts: legal statements need review before an editor publishes them.
// Existing service pages are never overwritten.
export async function seedServicePages(payload: Payload, req: PayloadRequest) {
  const editorConfig = await editorConfigFactory.fromFeatures({
    config: payload.config,
    features: websiteEditorFeatures,
  })
  const ids = new Map<ServiceSlug, number>()
  const created: ServiceSlug[] = []
  const skipped: ServiceSlug[] = []

  for (const seed of serviceSeeds) {
    const { docs } = await payload.find({
      collection: 'service-pages',
      req,
      overrideAccess: true,
      draft: true,
      depth: 0,
      limit: 1,
      where: { slug: { equals: seed.slug } },
      select: { slug: true },
    })
    if (docs[0]) {
      ids.set(seed.slug, docs[0].id)
      skipped.push(seed.slug)
      continue
    }
    // Card items need every id, so content is added once all pages exist.
    const doc = await payload.create({
      collection: 'service-pages',
      req,
      overrideAccess: true,
      draft: true,
      locale: 'de',
      data: {
        slug: seed.slug,
        sortOrder: seed.sortOrder,
        icon: seed.icon,
        title: seed.de.title,
        summary: seed.de.summary,
        _status: 'draft',
      },
    })
    ids.set(seed.slug, doc.id)
    created.push(seed.slug)
  }

  const context = { editorConfig, ids }
  for (const seed of serviceSeeds.filter(({ slug }) => created.includes(slug))) {
    for (const locale of locales) {
      await payload.update({
        collection: 'service-pages',
        id: ids.get(seed.slug)!,
        req,
        overrideAccess: true,
        draft: true,
        locale,
        data: { ...toServicePage(seed[locale], context), _status: 'draft' },
      })
    }
  }

  for (const locale of locales) {
    const page = landingSeed[locale]
    await payload.updateGlobal({
      slug: 'services',
      req,
      overrideAccess: true,
      draft: true,
      locale,
      data: {
        eyebrow: page.eyebrow,
        title: page.title,
        subtitle: page.subtitle,
        sections: toSections(page.sections, context),
        seo: page.seo,
        _status: 'draft',
      },
    })
  }

  return { created, skipped }
}
