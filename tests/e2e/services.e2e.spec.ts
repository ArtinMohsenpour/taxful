import { randomUUID } from 'node:crypto'
import { test, expect, type Page } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

const origin = process.env.E2E_BASE_URL || 'http://localhost:3000'
const slug = `e2e-service-${randomUUID().slice(0, 8)}`
const draftSlug = `${slug}-draft`
const fixtureIds: number[] = []

const paragraph = (text: string) => ({
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
})

const content = (locale: 'de' | 'en') => ({
  title: locale === 'de' ? 'Testleistung E-Rechnung' : 'Test e-invoice service',
  summary: locale === 'de' ? 'Eine Testleistung für E2E.' : 'A test service for E2E.',
  keyPoints: [{ text: 'XRechnung' }, { text: 'ZUGFeRD' }],
  sections: [
    {
      blockType: 'fullWidth' as const,
      title: locale === 'de' ? 'Häufige Fragen' : 'Questions',
      column1: {
        content: [
          {
            type: 'faq' as const,
            faq: [
              {
                question: locale === 'de' ? 'Ist das ein Test?' : 'Is this a test?',
                answer: paragraph(locale === 'de' ? 'Ja, nur ein Test.' : 'Yes, only a test.'),
              },
            ],
          },
        ],
      },
    },
  ],
})

test.describe('Service pages', () => {
  test.beforeAll(async () => {
    await seedTestUser()
    const payload = await getPayload({ config })
    const doc = await payload.create({
      collection: 'service-pages',
      overrideAccess: true,
      locale: 'de',
      data: { slug, sortOrder: 999, icon: 'check', ...content('de'), _status: 'published' },
    })
    fixtureIds.push(doc.id)
    await payload.update({
      collection: 'service-pages',
      id: doc.id,
      overrideAccess: true,
      locale: 'en',
      data: { ...content('en'), _status: 'published' },
    })
    const draft = await payload.create({
      collection: 'service-pages',
      overrideAccess: true,
      draft: true,
      locale: 'de',
      data: { slug: draftSlug, sortOrder: 998, ...content('de'), _status: 'draft' },
    })
    fixtureIds.push(draft.id)
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    for (const id of fixtureIds)
      await payload.delete({ collection: 'service-pages', id, overrideAccess: true })
    await cleanupTestUser()
  })

  test('renders a published service page with SEO metadata in both languages', async ({ page }) => {
    for (const locale of ['de', 'en'] as const) {
      const response = await page.goto(`${origin}/${locale}/services/${slug}`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(content(locale).title)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`/${locale}/services/${slug}$`),
      )
      for (const language of ['de', 'en', 'x-default'])
        await expect(page.locator(`link[hreflang="${language}"]`)).toHaveAttribute(
          'href',
          new RegExp(`/${language === 'en' ? 'en' : 'de'}/services/${slug}$`),
        )
      const types = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((scripts) =>
          scripts.flatMap((script) => {
            const data = JSON.parse(script.textContent || 'null')
            return (Array.isArray(data) ? data : [data]).map((node) => node['@type'])
          }),
        )
      expect(types).toEqual(expect.arrayContaining(['Service', 'BreadcrumbList', 'FAQPage']))
    }
  })

  test('keeps the slug when switching language', async ({ page }) => {
    await page.goto(`${origin}/de/services/${slug}`)
    await page.getByRole('switch', { name: 'Englische Sprache' }).click()
    await page.waitForURL(`${origin}/en/services/${slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(content('en').title)
  })

  test('returns 404 for malformed slugs and unpublished drafts', async ({ page }) => {
    for (const path of ['/de/services/Bad-Slug', '/de/services/a--b']) {
      expect((await page.goto(`${origin}${path}`))?.status()).toBe(404)
    }
    const draft = await page.goto(
      `${origin}/de/services/e-rechnung-erstellen?preview=true&previewCollection=service-pages`,
    )
    expect(draft?.status()).toBe(404)
  })

  test('fits a dark mobile screen and opens FAQ answers with the keyboard', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${origin}/de/services/${slug}`)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    const summary = page.locator('summary', { hasText: 'Ist das ein Test?' })
    await summary.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Ja, nur ein Test.')).toBeVisible()
  })

  test('lists the published service page in the sitemap', async ({ request }) => {
    const sitemap = await (await request.get(`${origin}/sitemap.xml`)).text()
    expect(sitemap).toContain(`/de/services/${slug}`)
    expect(sitemap).toContain(`/en/services/${slug}`)
    expect(sitemap).not.toContain(`/services/${draftSlug}`)
  })

  test('previews the draft Services page with cards for signed-in editors', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000)
    await login({ page, user: testUser, serverURL: origin })
    const shot = async (target: Page, name: string) =>
      target.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true })

    await page.goto(`${origin}/de/services?preview=true&previewGlobal=services`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'E-Rechnung-Software für XRechnung und ZUGFeRD',
    )
    const cards = page.getByRole('link', { name: /^Mehr erfahren: / })
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(6)
    await shot(page, 'services-landing-de-desktop')

    await page.goto(
      `${origin}/de/services/e-rechnung-erstellen?preview=true&previewCollection=service-pages`,
    )
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'E-Rechnung erstellen: XRechnung und ZUGFeRD in wenigen Schritten',
    )
    await shot(page, 'service-erstellen-de-desktop')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(
      `${origin}/en/services/e-rechnung-pruefen?preview=true&previewCollection=service-pages`,
    )
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Validate e-invoices: XRechnung and ZUGFeRD validator',
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await shot(page, 'service-pruefen-en-mobile-dark')
  })
})
