// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { landingSeed, seedServicePages, serviceSeeds } from '@/migrations/seeds/services-20261106'
import type { LocaleSeed, SectionSeed } from '@/migrations/seeds/services-20261106/types'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
}, 30000)
afterAll(async () => {
  await payload?.destroy()
})

const slugs = serviceSeeds.map((seed) => seed.slug)

function sectionText(sections: SectionSeed[]) {
  return sections
    .flatMap((section) => [
      section.title ?? '',
      section.subtitle ?? '',
      ...section.columns
        .flat()
        .map((item) =>
          typeof item === 'string'
            ? item
            : 'faq' in item
              ? item.faq.map(({ question, answer }) => `${question} ${answer}`).join(' ')
              : '',
        ),
    ])
    .join(' ')
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length
const faqCount = (sections: SectionSeed[]) =>
  sections
    .flatMap((section) => section.columns.flat())
    .reduce(
      (count, item) => count + (typeof item === 'object' && 'faq' in item ? item.faq.length : 0),
      0,
    )

describe('service page seeds', () => {
  it('covers the six agreed services in sort order', () => {
    expect(slugs).toEqual([
      'e-rechnung-erstellen',
      'pdf-in-e-rechnung-umwandeln',
      'e-rechnung-empfangen',
      'e-rechnung-pruefen',
      'gutschrift-korrektur-schlussrechnung',
      'rechnungen-digital-verwalten',
    ])
  })

  const pages: [string, 'de' | 'en', LocaleSeed][] = serviceSeeds.flatMap((seed) =>
    (['de', 'en'] as const).map(
      (locale) => [seed.slug, locale, seed[locale]] as [string, 'de' | 'en', LocaleSeed],
    ),
  )

  it.each(pages)('%s (%s) meets length, SEO and copy rules', (_, locale, page) => {
    expect(page.title.length).toBeLessThanOrEqual(120)
    expect(page.summary.length).toBeLessThanOrEqual(220)
    expect(page.keyPoints.length).toBeGreaterThanOrEqual(2)
    expect(page.keyPoints.length).toBeLessThanOrEqual(4)
    for (const point of page.keyPoints) expect(point.length).toBeLessThanOrEqual(80)
    expect(page.seo.title.length).toBeLessThanOrEqual(60)
    expect(page.seo.title.endsWith(' | Taxful')).toBe(true)
    expect(page.seo.description.length).toBeGreaterThanOrEqual(110)
    expect(page.seo.description.length).toBeLessThanOrEqual(160)
    expect(faqCount(page.sections)).toBeGreaterThanOrEqual(5)
    const text = `${page.title} ${page.summary} ${sectionText(page.sections)}`
    expect(words(text)).toBeGreaterThanOrEqual(locale === 'de' ? 1000 : 750)
    expect(text).toContain(locale === 'de' ? 'Stand: November 2026' : 'As of November 2026')
    for (const banned of [
      'gobd-konform',
      'gobd-compliant',
      'revisionssicher',
      'rechtssicher',
      'audit-proof',
      'garantiert',
      'guaranteed',
    ])
      expect(text.toLowerCase()).not.toContain(banned)
  })

  // Every page, including the Services overview, as one text per locale.
  const allTexts: [string, string][] = [
    ...pages.map(
      ([slug, locale, page]) =>
        [
          `${slug} (${locale})`,
          `${page.title} ${page.summary} ${page.keyPoints.join(' ')} ${sectionText(page.sections)}`,
        ] as [string, string],
    ),
    ...(['de', 'en'] as const).map(
      (locale) =>
        [
          `landing (${locale})`,
          `${landingSeed[locale].title} ${landingSeed[locale].subtitle} ${sectionText(landingSeed[locale].sections)}`,
        ] as [string, string],
    ),
  ]

  it.each(allTexts)('%s matches documented product behaviour', (_, text) => {
    // Claims the product documentation contradicts (review findings).
    for (const inaccurate of [
      'nur bei Scans und Fotos',
      'only used for scans',
      'Optionale Zwei-Faktor',
      'Optional two-factor',
      'Rechnungsnummer, Name oder Dateiname',
      'invoice number, name or file name',
      'Baufortschritt',
      'progress billing',
      'Prüfbericht zu jeder Datei',
      'report for every file',
      'dauerhaft',
      'dieselben Regeln wie die Empfänger',
      'same rules your recipients use',
      'kein Datum und keinen Betrag',
      'date or amount by guessing',
      'mit allen Positionen',
      'wird die Prüfregeln',
      'will update its rules',
      'Neue verbindliche Versionen werden',
      'New binding versions are introduced',
      'Regelsteuersatz',
      'Regelsatz',
      'standard and zero rates',
    ])
      expect(text).not.toContain(inaccurate)
    // "Small businesses" alone suggests a turnover test; the exemption is the scheme.
    expect(
      text
        .replace(/small businesses under the German small-business scheme/g, '')
        .replace(/German small-business scheme/g, '')
        .toLowerCase(),
    ).not.toContain('small business')
    // Travel tickets are § 34 UStDV, not § 33.
    if (/Fahrausweise|travel tickets/.test(text)) expect(text).toContain('ustdv_1980/__34.html')
  })

  it('discloses the external AI service on the conversion page', () => {
    const conversion = serviceSeeds.find((seed) => seed.slug === 'pdf-in-e-rechnung-umwandeln')!
    expect(sectionText(conversion.de.sections)).toContain('externen KI-Dienst')
    expect(sectionText(conversion.en.sections)).toContain('external AI service')
  })

  it('keeps German and English copy distinct', () => {
    for (const seed of serviceSeeds) expect(seed.en.title).not.toBe(seed.de.title)
    expect(landingSeed.en.title).not.toBe(landingSeed.de.title)
  })
})

describe('seedServicePages', () => {
  it('creates drafts once and adds a draft of the Services page without publishing it', async () => {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('This test needs an isolated transaction')
    const req = { transactionID }
    try {
      // Start from a database without these pages; the transaction is rolled back.
      await payload.delete({
        collection: 'service-pages',
        req,
        overrideAccess: true,
        where: { slug: { in: slugs } },
      })
      const publishedBefore = await payload.findGlobal({
        slug: 'services',
        req: { transactionID },
        overrideAccess: false,
        locale: 'de',
      })

      const first = await seedServicePages(payload, req as never)
      expect(first.created).toEqual(slugs)

      const drafts = await payload.find({
        collection: 'service-pages',
        req,
        overrideAccess: true,
        draft: true,
        locale: 'de',
        where: { slug: { in: slugs } },
        limit: 10,
      })
      expect(drafts.docs).toHaveLength(6)
      expect(drafts.docs.every((doc) => doc._status === 'draft')).toBe(true)

      const create = drafts.docs.find((doc) => doc.slug === 'e-rechnung-erstellen')!
      const english = await payload.findByID({
        collection: 'service-pages',
        id: create.id,
        req,
        overrideAccess: true,
        draft: true,
        locale: 'en',
        fallbackLocale: false,
        depth: 0,
      })
      expect(english.title).toBe(serviceSeeds[0].en.title)
      expect(english.sections?.length).toBeGreaterThan(3)

      const cards = english.sections
        ?.flatMap((section) => section.column1?.content ?? [])
        .find((item) => item.type === 'services')
      expect(cards?.services?.length).toBeGreaterThan(0)

      const publicPages = await payload.find({
        collection: 'service-pages',
        req: { transactionID },
        overrideAccess: false,
        where: { slug: { in: slugs } },
      })
      expect(publicPages.docs).toHaveLength(0)

      const publishedAfter = await payload.findGlobal({
        slug: 'services',
        req: { transactionID },
        overrideAccess: false,
        locale: 'de',
      })
      expect(publishedAfter.title).toBe(publishedBefore.title)
      const draftLanding = await payload.findGlobal({
        slug: 'services',
        req,
        overrideAccess: true,
        draft: true,
        locale: 'en',
        fallbackLocale: false,
      })
      expect(draftLanding.title).toBe(landingSeed.en.title)

      const second = await seedServicePages(payload, req as never)
      expect(second.created).toEqual([])
      expect(second.skipped).toEqual(slugs)
    } finally {
      await payload.db.rollbackTransaction(transactionID).catch(() => undefined)
    }
  }, 60000)
})
