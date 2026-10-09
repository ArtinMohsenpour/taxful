import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { totp } from '../../src/lib/staff-auth/crypto'
export interface LoginOptions {
  page: Page
  serverURL?: string
  user: { email: string; password: string }
}
export async function login({
  page,
  serverURL = process.env.E2E_BASE_URL || 'http://localhost:3000',
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/admin/login`)
  await page.locator('input[name=email]').fill(user.email)
  await page.locator('input[name=password]').fill(user.password)
  const enrollment = page.waitForResponse(
    (r) => r.url().endsWith('/api/staff-mfa') && r.request().method() === 'POST',
  )
  await page.locator('button[type=submit]').click()
  const setup = (await (await enrollment).json()) as { secret: string }
  expect(setup.secret).toMatch(/^[A-Z2-7]{32}$/)
  await page.locator('input[name=code]').fill(totp(setup.secret, Math.floor(Date.now() / 30000)))
  await page.locator('button[type=submit]').click()
  await expect(page.locator('li code')).toHaveCount(10)
  await page.getByRole('button', { name: /I saved my recovery codes|Codes gespeichert/ }).click()
  await page.waitForURL(`${serverURL}/admin`)
}
