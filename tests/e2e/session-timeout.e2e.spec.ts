import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { config } from 'dotenv'
import { hashPassword } from 'better-auth/crypto'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const origin = process.env.E2E_BASE_URL || 'http://localhost:3000'
const screenshots = process.env.E2E_SCREENSHOT_DIR
const user = randomUUID()
const email = `${user}@example.test`
const password = `${randomUUID()}-Synthetic-Only`
const workspace = randomUUID()
const otherWorkspace = randomUUID()
let pool: Pool

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.beforeAll(async () => {
  config({ path: ['.env.local', '.env'] })
  pool = (await import('../../src/lib/customer-auth/database')).customerPool
  await pool.query(
    'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,$2,$3,true,$4,$5)',
    [user, 'Synthetic Timeout', email, 'Synthetic', 'Timeout'],
  )
  await pool.query(
    'INSERT INTO customer_auth.customer_accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$2,$4,now())',
    [randomUUID(), user, 'credential', await hashPassword(password)],
  )
  for (const [id, name] of [
    [workspace, 'Synthetic Timeout Workspace'],
    [otherWorkspace, 'Synthetic Second Workspace'],
  ]) {
    await pool.query(
      'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
      [id, name],
    )
    await pool.query(
      'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
      [randomUUID(), id, user, 'owner'],
    )
  }
})

test.afterAll(async () => {
  await pool.query('DELETE FROM customer_auth.organizations WHERE id = ANY($1)', [
    [workspace, otherWorkspace],
  ])
  await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
  await pool.end()
})

async function signIn(context: BrowserContext) {
  const response = await context.request.post(`${origin}/api/customer-auth/sign-in/email`, {
    headers: { origin },
    // Matches the login form's default, where Better Auth never extends the session itself.
    data: { email, password, rememberMe: false },
  })
  // The suite signs in four times; Better Auth allows five sign-ins per minute per client.
  expect(response.status(), 'Sign-in failed. On 429, wait a minute and run again.').toBe(200)
}

// The timeout starts counting once the tab has hydrated and stored its first activity.
async function openPortal(page: Page, path: string) {
  const startedAt = await page.evaluate(() => Date.now())
  await page.goto(`${origin}${path}`)
  await page.waitForFunction(
    (since) => Number(localStorage.getItem('taxful-customer-activity')) >= since,
    startedAt,
  )
}

function collectErrors(...pages: Page[]) {
  const errors: string[] = []
  for (const page of pages) page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

async function capture(page: Page, name: string) {
  if (screenshots)
    await page.screenshot({ path: `${screenshots}/${name}.png`, animations: 'disabled' })
}

const warningIn = (page: Page, name = 'Are you still there?') =>
  page.getByRole('alertdialog', { name })

test('warns idle users in every tab and shares activity and sign-out between tabs', async ({
  browser,
}) => {
  const context = await browser.newContext()
  await context.clock.install()
  await signIn(context)
  const overview = await context.newPage()
  const files = await context.newPage()
  const errors = collectErrors(overview, files)
  await openPortal(overview, '/en/portal')
  // The file list refreshes in the background, which must not count as activity.
  await openPortal(files, '/en/portal/files')

  await context.clock.fastForward('29:00')
  await files.mouse.move(40, 40)
  await files.mouse.move(120, 160)
  await context.clock.runFor(2000)
  await context.clock.fastForward('29:00')
  await context.clock.runFor(2000)
  await expect(warningIn(overview)).toBeHidden()
  await expect(warningIn(files)).toBeHidden()

  await context.clock.fastForward('01:05')
  await expect(warningIn(overview)).toBeVisible()
  await expect(warningIn(files)).toBeVisible()
  await expect(warningIn(overview)).toContainText(/You’ll be signed out in \d+ seconds\./)
  await expect(warningIn(overview).getByRole('button', { name: 'Stay signed in' })).toBeFocused()
  await capture(overview, 'idle-warning-desktop')

  // Staying in one tab closes the warning everywhere.
  await warningIn(overview).getByRole('button', { name: 'Stay signed in' }).click()
  await expect(warningIn(overview)).toBeHidden()
  await expect(warningIn(files)).toBeHidden()

  // Escape also keeps the user signed in.
  await context.clock.fastForward('30:00')
  await expect(warningIn(files)).toBeVisible()
  await files.keyboard.press('Escape')
  await expect(warningIn(files)).toBeHidden()
  await expect(warningIn(overview)).toBeHidden()
  await expect(overview).toHaveURL(`${origin}/en/portal`)

  // Signing out from the sidebar signs out the other tab too.
  await overview.getByRole('complementary').getByRole('button', { name: 'Sign out' }).click()
  await overview.waitForURL(`${origin}/en/login`)
  await files.waitForURL(`${origin}/en/login`)
  expect(errors).toEqual([])
  await context.close()
})

test('signs idle users out after the countdown and explains why on the login page', async ({
  browser,
}) => {
  const context = await browser.newContext()
  await context.clock.install()
  await signIn(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await openPortal(page, '/de/portal/profile')

  await context.clock.fastForward('30:00')
  const warning = warningIn(page, 'Sind Sie noch da?')
  await expect(warning).toBeVisible()
  await expect(warning).toContainText(/Sie werden in \d+ Sekunden abgemeldet\./)
  await page.setViewportSize({ width: 390, height: 844 })
  await capture(page, 'idle-warning-mobile-de')

  await context.clock.fastForward('00:31')
  await page.waitForURL(`${origin}/de/login?reason=idle&next=%2Fde%2Fportal%2Fprofile`)
  await expect(
    page.getByText(
      'Sie wurden nach 30 Minuten ohne Aktivität abgemeldet. Melden Sie sich erneut an, um fortzufahren.',
    ),
  ).toBeVisible()
  await capture(page, 'idle-login-notice-de')
  expect((await context.request.get(`${origin}/api/documents`)).status()).toBe(401)
  expect(errors).toEqual([])
  await context.close()
})

test('confirms the password on Account security and ends sessions idle on the server', async ({
  browser,
}) => {
  const context = await browser.newContext()
  await signIn(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  const sessions = async () =>
    (
      await pool.query(
        'SELECT "activeOrganizationId", "updatedAt" > now() - interval \'30 seconds\' AS recent FROM customer_auth.customer_sessions WHERE "userId"=$1',
        [user],
      )
    ).rows

  // The server records activity at most once a minute.
  await pool.query(
    `UPDATE customer_auth.customer_sessions SET "updatedAt" = now() - interval '2 minutes' WHERE "userId"=$1`,
    [user],
  )
  expect((await context.request.get(`${origin}/api/customer-auth/get-session`)).status()).toBe(200)
  expect((await sessions())[0].recent).toBe(true)

  // An older sign-in hides the device list until the password is confirmed.
  await pool.query(
    `UPDATE customer_auth.customer_sessions SET "createdAt" = now() - interval '31 minutes', "activeOrganizationId" = $2 WHERE "userId"=$1`,
    [user, otherWorkspace],
  )
  await openPortal(page, '/en/portal/security')
  await expect(
    page.getByText('For your security, confirm your password to see your signed-in devices.', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(page.getByText('This device', { exact: true })).toBeHidden()
  await capture(page, 'security-confirm')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText('This device', { exact: true })).toBeVisible()
  // The old session is replaced and the selected workspace is kept.
  await expect.poll(sessions).toEqual([{ activeOrganizationId: otherWorkspace, recent: true }])

  // Another device can be signed out from the list. Its session is inserted directly so the suite
  // stays within Better Auth's limit of five sign-ins per minute.
  await pool.query(
    `INSERT INTO customer_auth.customer_sessions(id,"expiresAt",token,"createdAt","updatedAt","userAgent","ipAddress","userId")
    VALUES($1, now() + interval '1 day', $2, now(), now(),
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
      '198.51.100.42',$3)`,
    [randomUUID(), randomUUID(), user],
  )
  await page.reload()
  await expect(page.getByText('Chrome · macOS', { exact: true })).toBeVisible()
  await expect(page.getByText('198.51.100.…', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out device' }).click()
  await expect(page.getByText('Chrome · macOS', { exact: true })).toBeHidden()
  expect(await sessions()).toEqual([{ activeOrganizationId: otherWorkspace, recent: true }])

  await pool.query(
    `INSERT INTO customer_auth.customer_sessions(id,"expiresAt",token,"createdAt","updatedAt","userAgent","userId")
    VALUES($1, now() + interval '1 day', $2, now(), now(),
      'Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0',$3)`,
    [randomUUID(), randomUUID(), user],
  )
  await page.reload()
  await expect(page.getByText('Firefox · Linux', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out all other devices', exact: true }).click()
  await expect(page.getByText('Firefox · Linux', { exact: true })).toBeHidden()
  expect(await sessions()).toEqual([{ activeOrganizationId: otherWorkspace, recent: true }])

  await pool.query(
    `UPDATE customer_auth.customer_sessions SET "updatedAt" = now() - interval '36 minutes' WHERE "userId"=$1`,
    [user],
  )
  await page.goto(`${origin}/en/portal`)
  await page.waitForURL(`${origin}/en/login`)
  expect(await sessions()).toEqual([])
  expect(errors).toEqual([])
  await context.close()
})
