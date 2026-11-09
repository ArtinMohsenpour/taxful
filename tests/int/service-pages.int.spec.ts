// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import type { ServicePage } from '@/payload-types'
import {
  hasServiceCards,
  listServiceCards,
  needsServiceCards,
  readServicePage,
  selectServiceCards,
} from '@/lib/website/service-pages'
import { readWebsitePage } from '@/lib/website/read'
import { pageMetadata, servicePageMetadata } from '@/lib/website/metadata'
import { faqJsonLd, serializeJsonLd, servicePageJsonLd } from '@/lib/website/structured-data'
import type { WebsitePageDocument } from '@/lib/website/types'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
}, 30000)
afterAll(async () => {
  await payload?.destroy()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const unique = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`

function paragraph(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '' as const,
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: null,
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          children: [
            { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
          ],
        },
      ],
    },
  }
}

const faqSection = (question: string, answer: string) => ({
  blockType: 'fullWidth' as const,
  column1: { content: [{ type: 'faq' as const, faq: [{ question, answer: paragraph(answer) }] }] },
})

function servicePage(slug: string, overrides: Partial<ServicePage> = {}) {
  return {
    slug,
    title: 'E-Rechnung erstellen',
    summary: 'XRechnung und ZUGFeRD erstellen.',
    keyPoints: [{ text: 'a' }, { text: 'b' }],
    sortOrder: 50,
    sections: [faqSection('Gilt das?', 'Ja.')],
    _status: 'published' as const,
    ...overrides,
  }
}

async function inRollback(run: (transactionID: string | number) => Promise<void>) {
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('This test needs an isolated transaction')
  try {
    await run(transactionID)
  } finally {
    await payload.db.rollbackTransaction(transactionID).catch(() => undefined)
  }
}

describe('readServicePage', () => {
  it('returns published pages and hides draft-only pages from the public', async () => {
    await inRollback(async (transactionID) => {
      const published = unique('read-published')
      const draftOnly = unique('read-draft')
      await payload.create({
        collection: 'service-pages',
        req: { transactionID },
        overrideAccess: true,
        data: servicePage(published),
      })
      await payload.create({
        collection: 'service-pages',
        req: { transactionID },
        overrideAccess: true,
        draft: true,
        data: servicePage(draftOnly, { _status: 'draft' }),
      })
      const read = (slug: string) =>
        readServicePage(payload, slug, { locale: 'de', draft: false, req: { transactionID } })
      expect((await read(published))?.title).toBe('E-Rechnung erstellen')
      expect(await read(draftOnly)).toBeNull()
    })
  })

  it('rejects malformed slugs without querying', async () => {
    const find = vi.spyOn(payload, 'find')
    for (const slug of ['Bad', 'a--b', '../x', '']) {
      expect(await readServicePage(payload, slug, { locale: 'de', draft: false })).toBeNull()
    }
    expect(find).not.toHaveBeenCalled()
  })

  it('falls back to German content when English is missing', async () => {
    await inRollback(async (transactionID) => {
      const slug = unique('read-fallback')
      await payload.create({
        collection: 'service-pages',
        req: { transactionID },
        overrideAccess: true,
        locale: 'de',
        data: servicePage(slug),
      })
      const english = await readServicePage(payload, slug, {
        locale: 'en',
        draft: false,
        req: { transactionID },
      })
      expect(english?.title).toBe('E-Rechnung erstellen')
      expect(english?.sections).toHaveLength(1)
    })
  })
})

describe('service cards', () => {
  it('lists published pages by sort order with their indexing flag', async () => {
    await inRollback(async (transactionID) => {
      const [first, second, draft, hidden] = ['first', 'second', 'draft', 'hidden'].map((p) =>
        unique(`cards-${p}`),
      )
      const req = { transactionID }
      await payload.create({
        collection: 'service-pages',
        req,
        overrideAccess: true,
        data: servicePage(second, { sortOrder: 2 }),
      })
      await payload.create({
        collection: 'service-pages',
        req,
        overrideAccess: true,
        data: servicePage(first, { sortOrder: 1 }),
      })
      await payload.create({
        collection: 'service-pages',
        req,
        overrideAccess: true,
        draft: true,
        data: servicePage(draft, { _status: 'draft', sortOrder: 0 }),
      })
      await payload.create({
        collection: 'service-pages',
        req,
        overrideAccess: true,
        data: servicePage(hidden, { sortOrder: 3, seo: { noIndex: true } }),
      })
      const cards = await listServiceCards(payload, { locale: 'de', req: { transactionID } })
      const slugs = cards.map((card) => card.slug)
      expect(slugs.indexOf(first)).toBeLessThan(slugs.indexOf(second))
      expect(slugs).not.toContain(draft)
      expect(cards.find((card) => card.slug === hidden)?.noIndex).toBe(true)
      expect(cards.find((card) => card.slug === first)).not.toHaveProperty('sections')
    })
  })

  it('includes drafts for an authenticated editor in preview', async () => {
    await inRollback(async (transactionID) => {
      const draft = unique('cards-preview-draft')
      const user = {
        ...(await payload.create({
          collection: 'users',
          req: { transactionID },
          overrideAccess: true,
          data: {
            email: `cards-${randomUUID()}@example.invalid`,
            password: randomUUID(),
            role: 'content-editor',
          },
        })),
        collection: 'users' as const,
      }
      await payload.create({
        collection: 'service-pages',
        req: { transactionID },
        overrideAccess: true,
        draft: true,
        data: servicePage(draft, { _status: 'draft' }),
      })
      const preview = await listServiceCards(payload, {
        locale: 'de',
        draft: true,
        user,
        req: { transactionID },
      })
      expect(preview.map((card) => card.slug)).toContain(draft)
      const published = await listServiceCards(payload, { locale: 'de', req: { transactionID } })
      expect(published.map((card) => card.slug)).not.toContain(draft)
    })
  })

  it('keeps the selection order and drops services that are not published', () => {
    const published = [1, 2, 3].map((id) => ({
      id,
      slug: `s${id}`,
      title: `S${id}`,
      summary: '',
      keyPoints: [],
      icon: null,
    }))
    expect(selectServiceCards(undefined, published).map((card) => card.id)).toEqual([1, 2, 3])
    expect(selectServiceCards([], published).map((card) => card.id)).toEqual([1, 2, 3])
    expect(
      selectServiceCards(
        [3, { id: 1 } as ServicePage, 99, { id: 98 } as ServicePage, 3],
        published,
      ).map((card) => card.id),
    ).toEqual([3, 1])
  })

  it('detects service-card items in any column', () => {
    expect(hasServiceCards([faqSection('Q', 'A')])).toBe(false)
    expect(
      hasServiceCards([
        {
          blockType: 'twoColumns',
          column1: { content: [] },
          column2: { content: [{ type: 'services' }] },
        },
      ]),
    ).toBe(true)
    expect(hasServiceCards(null)).toBe(false)
  })
})

describe('service cards on other pages', () => {
  it('loads cards when a page has a card item, and always in preview', () => {
    expect(needsServiceCards([faqSection('Q', 'A')], false)).toBe(false)
    expect(needsServiceCards(null, false)).toBe(false)
    expect(
      needsServiceCards(
        [{ blockType: 'fullWidth', column1: { content: [{ type: 'services' }] } }],
        false,
      ),
    ).toBe(true)
    // Live Preview: an item added after the page loaded still needs the list.
    expect(needsServiceCards([], true)).toBe(true)
  })

  it('populates selected service pages with their slug only', async () => {
    await inRollback(async (transactionID) => {
      const service = await payload.create({
        collection: 'service-pages',
        req: { transactionID },
        overrideAccess: true,
        data: servicePage(unique('populate-slug')),
      })
      const user = {
        ...(await payload.create({
          collection: 'users',
          req: { transactionID },
          overrideAccess: true,
          data: {
            email: `populate-${randomUUID()}@example.invalid`,
            password: randomUUID(),
            role: 'content-editor',
          },
        })),
        collection: 'users' as const,
      }
      await payload.updateGlobal({
        slug: 'faq',
        req: { transactionID },
        overrideAccess: true,
        draft: true,
        locale: 'de',
        data: {
          sections: [
            {
              blockType: 'fullWidth',
              column1: { content: [{ type: 'services', services: [service.id] }] },
            },
          ],
        },
      })
      const page = await readWebsitePage(payload, 'faq', 'de', true, user, { transactionID })
      const card = page.sections?.[0]?.column1?.content?.[0]?.services?.[0]
      expect(typeof card).toBe('object')
      expect(Object.keys(card as object).sort()).toEqual(['id', 'slug'])
    })
  })
})

describe('service metadata and structured data', () => {
  const doc = {
    ...servicePage('e-rechnung-erstellen'),
    id: 1,
    updatedAt: '2026-11-06T00:00:00.000Z',
    createdAt: '2026-11-06T00:00:00.000Z',
  } as ServicePage

  it('builds canonical and language URLs from the website origin', () => {
    vi.stubEnv('WEBSITE_URL', 'https://taxful.example')
    const meta = servicePageMetadata(doc, 'en', false)
    expect(meta.title).toBe('E-Rechnung erstellen | Taxful')
    expect(meta.description).toBe('XRechnung und ZUGFeRD erstellen.')
    expect(meta.alternates).toEqual({
      canonical: 'https://taxful.example/en/services/e-rechnung-erstellen',
      languages: {
        de: 'https://taxful.example/de/services/e-rechnung-erstellen',
        en: 'https://taxful.example/en/services/e-rechnung-erstellen',
        'x-default': 'https://taxful.example/de/services/e-rechnung-erstellen',
      },
    })
    expect(meta.robots).toEqual({ index: true, follow: true })
  })

  it('prefers SEO fields and hides previews and excluded pages', () => {
    const seo = { title: 'XRechnung erstellen | Taxful', description: 'Kurz.', noIndex: false }
    expect(servicePageMetadata({ ...doc, seo }, 'de', false)).toMatchObject({
      title: 'XRechnung erstellen | Taxful',
      description: 'Kurz.',
    })
    expect(servicePageMetadata(doc, 'de', true).robots).toEqual({ index: false, follow: false })
    expect(
      servicePageMetadata({ ...doc, seo: { ...seo, noIndex: true } }, 'de', false).robots,
    ).toEqual({ index: false, follow: false })
  })

  it('keeps page-global metadata unchanged', () => {
    vi.stubEnv('WEBSITE_URL', 'https://taxful.example')
    const meta = pageMetadata(
      { title: 'Über uns', subtitle: 'Wer wir sind.' } as WebsitePageDocument,
      'about',
      'de',
      false,
    )
    expect(meta).toMatchObject({
      title: 'Über uns | Taxful',
      description: 'Wer wir sind.',
      alternates: { canonical: 'https://taxful.example/de/about' },
      openGraph: { url: 'https://taxful.example/de/about', locale: 'de_DE' },
    })
  })

  it('describes the service, its breadcrumb and its questions', () => {
    vi.stubEnv('WEBSITE_URL', 'https://taxful.example')
    const nodes = servicePageJsonLd(doc, 'de')
    expect(nodes.map((node) => node['@type'])).toEqual(['Service', 'BreadcrumbList', 'FAQPage'])
    expect(nodes[0]).toMatchObject({
      name: 'E-Rechnung erstellen',
      url: 'https://taxful.example/de/services/e-rechnung-erstellen',
      provider: { '@type': 'Organization', name: 'Taxful' },
    })
    expect(nodes[2]).toMatchObject({
      mainEntity: [{ name: 'Gilt das?', acceptedAnswer: { text: 'Ja.' } }],
    })
    expect(servicePageJsonLd({ ...doc, sections: [] }, 'de').map((node) => node['@type'])).toEqual([
      'Service',
      'BreadcrumbList',
    ])
    expect(faqJsonLd([])).toBeNull()
  })

  it('keeps editor text inside the JSON-LD script', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('<')
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>')
  })
})
