import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { chromium, expect } from '@playwright/test'
import { hashPassword, symmetricDecrypt } from 'better-auth/crypto'

config({ path: ['.env.local', '.env'] })
const origin = process.env.BETTER_AUTH_URL || 'http://localhost:3100'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
assert.ok(
  ['localhost', '127.0.0.1'].includes(process.env.CUSTOMER_SMTP_HOST || ''),
  'Use local Mailpit only',
)
const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
const { auth } = await import('../../src/lib/customer-auth/auth')
const id = randomUUID(),
  email = `${id}@example.test`,
  password = randomUUID() + '-Synthetic-Only'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const context = await browser.newContext({ reducedMotion: 'reduce' })
const page = await context.newPage()
const errors: string[] = []
page.on('pageerror', (error) => errors.push(error.message))
const cdp = await context.newCDPSession(page)
await cdp.send('WebAuthn.enable')
const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
  options: {
    protocol: 'ctap2',
    transport: 'internal',
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
  },
})
let codes: string[] = []
try {
  await pool.query(
    'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName",locale) VALUES($1,$2,$3,true,$4,$5,\'en\')',
    [id, 'Synthetic MFA Browser', email, 'Synthetic', 'MFA'],
  )
  await pool.query(
    'INSERT INTO customer_auth.customer_accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,\'credential\',$2,$3,now())',
    [randomUUID(), id, await hashPassword(password)],
  )
  await page.goto(`${origin}/en/login`)
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL('**/en/portal')
  await page.goto(`${origin}/en/portal/security`)
  await page.getByLabel('Current password', { exact: true }).first().fill(password)
  const setupResponse = page.waitForResponse((r) => r.url().endsWith('/two-factor/enable'))
  await page.getByRole('button', { name: 'Set up authenticator', exact: true }).click()
  const setup = await (await setupResponse).json()
  codes = setup.backupCodes
  assert.equal(codes.length, 10)
  await expect(page.getByRole('img', { name: 'Authenticator setup QR code' })).toBeVisible()
  const stored = await pool.query(
    'SELECT secret FROM customer_auth.customer_two_factors WHERE "userId"=$1',
    [id],
  )
  const secret = await symmetricDecrypt({
    key: process.env.BETTER_AUTH_SECRET!,
    data: stored.rows[0].secret,
  })
  const code = (await auth.api.generateTOTP({ body: { secret } })).code
  await page.getByLabel('I have saved my recovery codes').check()
  await page.getByLabel('Authenticator code', { exact: true }).fill(code)
  await page.getByRole('button', { name: 'Activate protection', exact: true }).click()
  await expect(page.getByText('Authenticator protection is on', { exact: true })).toBeVisible()
  await page.getByLabel('Passkey name', { exact: true }).fill('Synthetic device')
  await page.getByRole('button', { name: 'Add passkey', exact: true }).click()
  await expect(page.getByText('Synthetic device', { exact: true })).toBeVisible()
  console.log('Authenticator enrollment, local QR, activation and passkey registration passed.')

  // Generate a valid signature without the UV flag. Force the browser to permit that
  // assertion so this exercises server enforcement, not browser-only enforcement.
  await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false })
  const unverified = await page.evaluate(async () => {
    const options = await (
      await fetch('/api/customer-auth/passkey/generate-authenticate-options')
    ).json()
    options.userVerification = 'discouraged'
    const credential = (await navigator.credentials.get({
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
    })) as PublicKeyCredential
    const response = await fetch('/api/customer-auth/passkey/verify-authentication', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ response: credential.toJSON() }),
    })
    return response.status
  })
  assert.equal(unverified, 401)
  await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: true })
  await context.request.post(`${origin}/api/customer-auth/sign-out`, {
    headers: { origin },
    data: {},
  })
  await page.goto(`${origin}/en/login`)
  await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click()
  await page.waitForURL('**/en/portal')
  console.log(
    'Passkey sign-in and rejection of a valid signature without device verification passed.',
  )

  await context.request.post(`${origin}/api/customer-auth/sign-out`, {
    headers: { origin },
    data: {},
  })
  await page.goto(`${origin}/en/login?next=/en/portal/security`)
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Complete two-step verification' })).toBeVisible()
  assert.equal(
    await (await context.request.get(`${origin}/api/customer-auth/get-session`)).json(),
    null,
  )
  await page.getByRole('button', { name: 'Use a recovery code', exact: true }).click()
  await page.getByLabel('Recovery code', { exact: true }).fill(codes[0])
  await page.getByRole('button', { name: 'Verify code', exact: true }).click()
  await page.waitForURL('**/en/portal/security')
  await expect(page.getByText('Authenticator protection is on', { exact: true })).toBeVisible()
  await page.goto(`${origin}/de/portal/security`)
  await expect(
    page.getByRole('heading', { name: 'Passkeys & Zwei-Schritt-Verifizierung' }),
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await page.evaluate(() => {
    localStorage.setItem('taxful-theme', 'dark')
  })
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(
    page.getByRole('heading', { name: 'Passkeys & Zwei-Schritt-Verifizierung' }),
  ).toBeVisible()
  await page.screenshot({ path: '/tmp/taxful-mfa-mobile.png', fullPage: true })
  const disableWithKey = await context.request.post(
    `${origin}/api/customer-auth/two-factor/disable`,
    {
      headers: { origin },
      data: { password },
    },
  )
  assert.equal(disableWithKey.status(), 400, 'Cannot disable password MFA while passkeys remain')
  await page.goto(`${origin}/en/portal/security`)
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await page
    .getByRole('group', { name: 'Remove', exact: true })
    .getByRole('button', { name: 'Remove', exact: true })
    .click()
  await page.waitForURL('**/en/login')
  assert.equal(
    await (await context.request.get(`${origin}/api/customer-auth/get-session`)).json(),
    null,
  )
  assert.equal(
    (await pool.query('SELECT id FROM customer_auth.customer_sessions WHERE "userId"=$1', [id]))
      .rowCount,
    0,
  )
  assert.deepEqual(errors, [])
  console.log(
    'Password challenge, recovery login, German localization, mobile layout and browser errors passed.',
  )
} finally {
  await browser.close()
  await pool.query('DELETE FROM customer_auth.customer_verifications WHERE value=$1', [id])
  await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [id])
  await pool.end()
}
