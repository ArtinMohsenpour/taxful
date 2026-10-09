import { test, expect } from '@playwright/test'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'
import type { Home } from '../../src/payload-types'

const origin = process.env.E2E_BASE_URL || 'http://localhost:3000'

test.describe('Home editor', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })
  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('previews unsaved hero text and a smaller company list without changing the public page', async ({
    page,
    request,
  }) => {
    test.setTimeout(60000)
    page.setDefaultTimeout(10000)
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))
    await login({ page, user: testUser })
    const dataResponse = await page.request.get(`${origin}/api/globals/home?locale=de&draft=true`)
    expect(dataResponse.status()).toBe(200)
    const data: Home = await dataResponse.json()
    expect(data._status).toBe('published')
    const editor = await page.goto(`${origin}/admin/globals/home?locale=de`)
    expect(editor?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Home page', exact: true })).toBeVisible({
      timeout: 15000,
    })
    await page.locator('#live-preview-toggler').click()
    const preview = page.frameLocator('iframe[src*="previewGlobal=home"]')
    await expect(preview.locator('#hero-title')).toContainText('Ihre Rechnungen.')
    await page.locator('input[name="title"]').fill('Ungespeicherte Vorschau')
    await expect(preview.locator('#hero-title')).toContainText('Ungespeicherte Vorschau')
    // Each optional heading line can stand alone, without an empty line break.
    await page.locator('input[name="title"]').fill('')
    await expect(preview.locator('#hero-title')).toHaveText('Ein klarer Ablauf.')
    await expect(preview.locator('#hero-title br')).toHaveCount(0)
    await page.locator('input[name="titleAccent"]').fill('')
    await page.locator('input[name="eyebrow"]').fill('')
    await page.locator('textarea[name="description"]').fill('')
    await expect(preview.locator('#hero-title')).toHaveCount(0)
    await expect(preview.locator('section > div')).toHaveCount(1)
    await expect(
      preview.getByRole('region', { name: 'Ihr Weg zur E-Rechnung', exact: true }),
    ).toBeVisible()
    await expect(preview.locator('#invoice-flow')).toBeVisible()
    // Restore the unsaved text for the remaining live-preview checks.
    await page.locator('input[name="title"]').fill('Ungespeicherte Vorschau')
    await page.getByRole('button', { name: 'Accounting companies', exact: true }).click()
    // Choose a different built-in company in the first row, without publishing.
    await page.locator('#field-providers__0__provider').click()
    await page.getByRole('option', { name: 'Sage', exact: true }).click()
    await expect(preview.locator('#invoice-flow img').first()).toHaveAttribute('alt', 'Sage')
    const frame = page.frames().find((frame) => frame.url().includes('previewGlobal=home'))
    if (!frame) throw new Error('Expected the authenticated Home preview frame')
    for (const width of ['320', '1024']) {
      await page.locator('input[name="live-preview-width"]').fill(width)
      for (const count of [1, 2, 3, 4, 5, 6]) {
        await frame.evaluate(
          (home) => {
            window.dispatchEvent(
              new MessageEvent('message', {
                origin: location.origin,
                data: {
                  type: 'payload-live-preview',
                  globalSlug: 'home',
                  locale: 'de',
                  data: home,
                },
              }),
            )
          },
          { ...data, providers: data.providers.slice(0, count) },
        )
        await expect(preview.locator('#invoice-flow img')).toHaveCount(count)
        expect(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        const paths = width === '320' ? '0 0 360 440' : '0 0 880 440'
        await expect(preview.locator(`svg[viewBox="${paths}"] path[pathLength="100"]`)).toHaveCount(
          count * 2,
        )
      }
    }
    const unchanged = await request.get(`${origin}/de`)
    expect(await unchanged.text()).not.toContain('Ungespeicherte Vorschau')
    await page.screenshot({ path: '/private/tmp/taxful-home-editor.png', fullPage: true })
    expect(browserErrors).toEqual([])
  })
})
