import { config } from 'dotenv'
import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
config({ path: ['.env.local', '.env'] })
const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
const { getPayload } = await import('payload')
const payload = await getPayload({ config: (await import('../../src/payload.config')).default })
const browser = await chromium.launch({ headless: true })
const user = randomUUID(),
  org = randomUUID(),
  password = randomUUID() + '-Synthetic',
  email = user + '@example.test'
const staffIds: number[] = []
const errors: string[] = []
try {
  await pool.query(
    'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,$2,$3,true,$4,$5)',
    [user, 'Synthetic Billing', email, 'Synthetic', 'Billing'],
  )
  await pool.query(
    'INSERT INTO customer_auth.customer_accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$2,$4,now())',
    [randomUUID(), user, 'credential', await hashPassword(password)],
  )
  await pool.query(
    'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
    [org, 'Synthetic Billing'],
  )
  await pool.query(
    'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
    [randomUUID(), org, user, 'owner'],
  )
  const context = await browser.newContext({
    baseURL: 'http://localhost:3100',
    viewport: { width: 1440, height: 1050 },
  })
  const api = context.request
  assert.equal((await api.get('/api/billing-admin')).status(), 403)
  assert.equal(
    (
      await api.post('/api/billing/manage', {
        headers: { origin: 'http://localhost:3100' },
        data: { action: 'view', organizationId: org, locale: 'en' },
      })
    ).status(),
    401,
  )
  const anonymous = await api.get('/en/portal/billing', { maxRedirects: 0 })
  assert.equal(anonymous.status(), 307)
  assert.equal(
    (
      await api.post('/api/billing/refresh', {
        headers: { origin: 'http://localhost:3100' },
        data: { organizationId: org, locale: 'en' },
      })
    ).status(),
    401,
  )
  assert.equal(
    (
      await api.post('/api/customer-auth/sign-in/email', {
        headers: { origin: 'http://localhost:3100' },
        data: { email, password },
      })
    ).status(),
    200,
  )
  assert.equal(
    (
      await api.post('/api/billing/refresh', {
        headers: { origin: 'https://evil.example.test' },
        data: { organizationId: org, locale: 'en' },
      })
    ).status(),
    403,
  )
  assert.equal(
    (
      await api.post('/api/billing/refresh', {
        headers: { origin: 'http://localhost:3100' },
        data: { organizationId: 'forged', locale: 'en' },
      })
    ).status(),
    400,
  )
  assert.equal(
    (
      await api.post('/api/billing/refresh', {
        headers: { origin: 'http://localhost:3100' },
        data: { organizationId: org, locale: 'en' },
      })
    ).status(),
    200,
  )
  const page = await context.newPage()
  assert.equal(
    (
      await api.post('/api/billing/manage', {
        headers: { origin: 'https://evil.example.test' },
        data: { action: 'view', organizationId: org, locale: 'en' },
      })
    ).status(),
    403,
  )
  assert.equal(
    (
      await api.post('/api/billing/manage', {
        headers: { origin: 'http://localhost:3100' },
        data: { action: 'view', organizationId: 'forged', locale: 'en' },
      })
    ).status(),
    400,
  )
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/en/portal/billing')
  await page.getByRole('heading', { name: 'Subscription', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Open Stripe billing portal', exact: true }).waitFor()
  assert.ok(!(await page.locator('body').innerText()).includes('Billing.'))
  await mkdir('.private/billing-check', { recursive: true })
  await page.screenshot({ path: '.private/billing-check/subscription.png', fullPage: true })
  await pool.query(
    `INSERT INTO customer_auth.billing_subscriptions(organization_id,provider_subscription_id,plan_id,status,current_period_end)
     VALUES($1,$2,'starter','active',now()+interval '1 month')`,
    [org, 'sub_synthetic_' + org],
  )
  await pool.query(
    `INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id)
     VALUES($1,'professional',now()+interval '1 day','Synthetic later benefit',1)`,
    [org],
  )
  // Mounted portal must pick up webhook/database changes, with paid plan distinct from grants.
  await expect(page.getByRole('heading', { name: 'Starter', exact: true })).toBeVisible({
    timeout: 25000,
  })
  await expect(page.getByText('Current access: Professional', { exact: true })).toBeVisible()
  await expect(page.getByText(/Complimentary Professional access until/)).toBeVisible()
  await pool.query('DELETE FROM customer_auth.billing_plan_grants WHERE organization_id=$1', [org])
  await expect(page.getByText('Current access: Starter', { exact: true })).toBeVisible({
    timeout: 25000,
  })
  await expect(page.getByText(/Complimentary Professional access until/)).toHaveCount(0)
  await page.screenshot({ path: '.private/billing-check/subscription-synced.png', fullPage: true })
  await page.goto('/en/portal/billing/usage')
  await page.getByRole('heading', { name: 'Usage', exact: true }).waitFor()
  await page.goto('/en/portal/billing/history')
  await page.getByText('No subscription invoices yet.').waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/de/portal/billing/usage')
  await page.getByRole('heading', { name: 'Nutzung', exact: true }).waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await page.screenshot({ path: '.private/billing-check/usage-mobile.png', fullPage: true })
  await pool.query(
    'UPDATE customer_auth.organization_memberships SET role=$2 WHERE "organizationId"=$1',
    [org, 'member'],
  )
  assert.equal(
    (
      await api.post('/api/billing/refresh', {
        headers: { origin: 'http://localhost:3100' },
        data: { organizationId: org, locale: 'en' },
      })
    ).status(),
    403,
  )
  assert.equal(
    (
      await api.post('/api/billing/checkout', {
        headers: { origin: 'http://localhost:3100' },
        data: { organizationId: org, locale: 'en', plan: 'starter' },
      })
    ).status(),
    403,
  )
  await page.goto('/en/portal/billing')
  await page
    .getByText('Only a company owner can access billing. Contact your workspace owner.')
    .waitFor()
  for (const path of [
    '/en/portal/billing/checkout?plan=starter',
    '/en/portal/billing/change?plan=professional',
    '/en/portal/billing/payment',
  ]) {
    await page.goto(path)
    await page
      .getByText('Only a company owner can access billing. Contact your workspace owner.')
      .waitFor()
  }
  assert.equal(
    (
      await api.post('/api/billing/manage', {
        headers: { origin: 'http://localhost:3100' },
        data: { action: 'setup', operationId: randomUUID(), organizationId: org, locale: 'en' },
      })
    ).status(),
    403,
  )
  for (const role of ['content-editor', 'super-admin'] as const) {
    const staffEmail = randomUUID() + '@example.test'
    const staff = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { email: staffEmail, password, role, firstName: 'Synthetic', lastName: 'Billing' },
    })
    staffIds.push(staff.id)
    const staffContext = await browser.newContext({
      baseURL: 'http://localhost:3100',
      viewport: { width: 1440, height: 1050 },
    })
    assert.equal(
      (
        await staffContext.request.post('/api/users/login', {
          data: { email: staffEmail, password },
        })
      ).status(),
      200,
    )
    const result = await staffContext.request.get('/api/billing-admin')
    assert.equal(result.status(), role === 'super-admin' ? 200 : 403)
    if (role === 'super-admin') {
      const adminPage = await staffContext.newPage()
      adminPage.on('pageerror', (error) => errors.push(error.message))
      await adminPage.goto('/admin/billing')
      await adminPage.getByRole('heading', { name: 'Customers & billing', exact: true }).waitFor()
      await adminPage.getByRole('button', { name: 'Save plan', exact: true }).first().waitFor()
      await adminPage.screenshot({ path: '.private/billing-check/admin-plans.png', fullPage: true })
      const response = await staffContext.request.post('/api/billing-admin', {
        headers: { origin: 'http://localhost:3100' },
        data: {
          action: 'grant',
          id: org,
          plan: 'starter',
          days: 1,
          reason: 'Synthetic browser verification',
        },
      })
      assert.equal(response.status(), 200)
      assert.equal(
        (
          await staffContext.request.post('/api/billing-admin', {
            headers: { origin: 'https://evil.example.test' },
            data: { action: 'suspend', id: user, reason: 'Synthetic test' },
          })
        ).status(),
        403,
      )
      assert.equal(
        (
          await staffContext.request.post('/api/billing-admin', {
            headers: { origin: 'http://localhost:3100' },
            data: { action: 'suspend', id: user, reason: 'Synthetic browser verification' },
          })
        ).status(),
        200,
      )
      assert.equal(
        (
          await api.post('/api/billing/refresh', {
            headers: { origin: 'http://localhost:3100' },
            data: { organizationId: org, locale: 'en' },
          })
        ).status(),
        401,
      )
      assert.equal(
        (
          await api.post('/api/customer-auth/sign-in/email', {
            headers: { origin: 'http://localhost:3100' },
            data: { email, password },
          })
        ).status(),
        403,
      )
    }
    await staffContext.close()
  }
  assert.deepEqual(errors, [])
  console.log(
    'Billing browser checks passed: owner isolation, revoked roles, CSRF, suspended sessions, CMS roles, EN/DE and mobile layout.',
  )
} finally {
  await browser.close()
  await pool.query('DELETE FROM customer_auth.billing_staff_audit WHERE target_id=ANY($1)', [
    [org, user],
  ])
  await pool.query('DELETE FROM customer_auth.organizations WHERE id=$1', [org])
  await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
  for (const id of staffIds) await payload.delete({ collection: 'users', id, overrideAccess: true })
  await pool.end()
  await payload.destroy()
  console.log('Synthetic accounts cleaned up.')
}

// Payload keeps background handles alive even after destroy in standalone scripts.
process.exit(0)
