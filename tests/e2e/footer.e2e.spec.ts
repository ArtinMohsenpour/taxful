import { test, expect } from '@playwright/test'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

const origin = process.env.E2E_BASE_URL || 'http://localhost:3000'

// Relies on the published starter footer from migration 20261109_093459_footer.
test('public footer is bilingual, locale-aware and responsive', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const [locale, legal, notice, company] of [
    ['de', 'Rechtliche Hinweise', 'Impressum', 'Über uns'],
    ['en', 'Legal', 'Legal notice', 'About us'],
  ]) {
    await page.goto(`${origin}/${locale}/about`)
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('link', { name: company })).toHaveAttribute(
      'href',
      `/${locale}/about`,
    )
    await expect(
      footer.getByRole('navigation', { name: legal }).getByRole('link', { name: notice }),
    ).toHaveAttribute('href', `/${locale}/impressum`)
    await expect(footer).toContainText(`© ${new Date().getFullYear()} Taxful`)
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      ).toBe(false)
    }
  }
  expect(errors).toEqual([])
})

test('customer pages show the compact legal footer only', async ({ page }) => {
  await page.goto(`${origin}/en/login`)
  const footer = page.getByRole('contentinfo')
  await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/en/privacy')
  await expect(footer.getByRole('navigation', { name: 'Footer navigation' })).toHaveCount(0)
})

test.describe('Footer editor', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })
  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('labels rows and previews unsaved copy without changing the public footer', async ({
    page,
  }) => {
    test.setTimeout(60000)
    page.setDefaultTimeout(10000)
    const year = new Date().getFullYear()
    await login({ page, user: testUser })
    await page.goto(`${origin}/admin/globals/footer?locale=de`)
    await expect(page.getByRole('heading', { name: 'Footer', exact: true })).toBeVisible({
      timeout: 15000,
    })
    await page.getByRole('button', { name: 'Link columns', exact: true }).click()
    const columns = page.locator('#field-columns')
    for (const title of ['Leistungen', 'Unternehmen', 'Kundenbereich'])
      await expect(columns.getByText(title, { exact: true }).first()).toBeVisible()

    await page.locator('#live-preview-toggler').click()
    const preview = page.frameLocator('iframe[src*="previewGlobal=footer"]')
    await expect(preview.getByRole('contentinfo')).toContainText(`© ${year} Taxful`)
    await expect(preview.getByRole('contentinfo')).toBeInViewport()

    // Choose a dynamic service page from the grouped picker instead of typing a slug.
    // Toggle order: column 1, its five links, column 2, then its first link (Über uns).
    await page.getByRole('button', { name: 'Toggle block' }).nth(7).click()
    const picker = columns.getByRole('combobox').first()
    await expect(picker).toHaveValue('/about')
    await picker.click()
    const pages = page.getByRole('listbox', { name: 'Pages' })
    for (const group of ['Website', 'Services', 'Legal', 'Customer area'])
      await expect(pages.getByRole('group', { name: group })).toBeVisible()
    await pages
      .getByRole('group', { name: 'Services' })
      .getByRole('option', { name: /E-Rechnung prüfen/ })
      .click()
    await expect(picker).toHaveValue('/services/e-rechnung-pruefen')
    await expect(
      preview.getByRole('contentinfo').getByRole('link', { name: 'Über uns' }),
    ).toHaveAttribute('href', '/de/services/e-rechnung-pruefen')
    await page.getByRole('button', { name: 'Bottom bar', exact: true }).click()
    await page.locator('input[name="copyright"]').fill('© {year} Vorschau GmbH')
    await expect(preview.getByRole('contentinfo')).toContainText(`© ${year} Vorschau GmbH`)

    const published = await page.request.get(`${origin}/de/about`)
    expect(await published.text()).not.toContain('Vorschau GmbH')
  })
})
