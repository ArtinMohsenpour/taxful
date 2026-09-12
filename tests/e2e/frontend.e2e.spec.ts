import { test, expect } from '@playwright/test'

const origin = process.env.E2E_BASE_URL || 'http://localhost:3000'

test('applies the saved theme from the server bootstrap before hydration', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(() => localStorage.setItem('taxful-theme', 'dark'))
  // Block the application bundles, leaving the inline SSR theme bootstrap to run.
  await page.route('**/_next/static/**/*.js*', (route) => route.abort())
  await page.goto(`${origin}/de`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('defaults to German and switches language while preserving query and hash', async ({
  page,
}) => {
  const scriptErrors: string[] = []
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /Encountered a script tag|hydration|hydrated/i.test(message.text())
    ) {
      scriptErrors.push(message.text())
    }
  })
  await page.goto(`${origin}/?source=test#intro`)
  await expect(page).toHaveURL(`${origin}/de?source=test#intro`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Willkommen bei Taxful.')
  const language = page.getByRole('switch', { name: 'Englische Sprache' })
  await language.focus()
  await page.keyboard.press('Space')
  await expect(page).toHaveURL(`${origin}/en?source=test#intro`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome to Taxful.')
  await expect(page).toHaveTitle('Taxful')
  await page.getByRole('switch', { name: 'English language' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  expect(scriptErrors).toEqual([])
})

test('supports system, dark, and light themes with persistence and no hydration errors', async ({
  page,
}) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration|hydrated/i.test(message.text())) {
      hydrationErrors.push(message.text())
    }
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(`${origin}/en`)
  const theme = page.getByRole('button', { name: /^Appearance:/ })
  await expect(theme).toBeEnabled()
  await expect(theme).toHaveAttribute('data-theme-choice', 'dark')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(29, 33, 27)')
  await theme.click()
  await expect(page.locator('html')).toHaveClass(/light/)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 242, 235)')
  await page.reload()
  await expect(theme).toHaveAttribute('data-theme-choice', 'light')
  await theme.focus()
  await page.keyboard.press('Enter')
  await page.reload()
  await expect(theme).toHaveAttribute('data-theme-choice', 'dark')
  await theme.click()
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveClass(/light/)
  expect(hydrationErrors).toEqual([])
})

test('keeps Payload paths unlocalized and rejects unsupported pages', async ({ request }) => {
  for (const path of ['/admin', '/api/users/me']) {
    const response = await request.get(`${origin}${path}`, { maxRedirects: 0 })
    expect(response.headers().location || '').not.toMatch(/\/(de|en)\//)
    expect(response.status()).toBeLessThan(500)
  }
  const response = await request.get(`${origin}/fr`)
  expect(response.status()).toBe(404)
})

test('requires CMS authentication for draft preview', async ({ request }) => {
  const response = await request.get(`${origin}/de?preview=true`)
  expect(response.status()).toBe(404)
})

test('fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`${origin}/de`)
  const menu = page.getByRole('button', { name: 'Menü öffnen' })
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await menu.click()
  await expect(page.getByRole('button', { name: 'Anmelden' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('respects reduced motion and provides navigation landmarks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${origin}/en`)
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await expect(page.locator('.toggle-thumb').first()).toHaveCSS('transition-duration', '0s')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
})
