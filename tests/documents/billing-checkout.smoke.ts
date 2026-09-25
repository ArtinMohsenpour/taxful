import { config } from 'dotenv'
import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
config({ path: ['.env.local', '.env'] })
if (process.env.STRIPE_INTEGRATION !== 'true') throw new Error('Explicit Stripe test mode required')
const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
const { stripeClient } = await import('../../src/lib/billing/stripe')
const stripe = stripeClient(),
  user = randomUUID(),
  org = randomUUID(),
  password = randomUUID() + '-Synthetic',
  email = `${user}@example.test`
const browser = await chromium.launch({ headless: true })
const errors: string[] = []
let couponId: string | undefined, promotionId: string | undefined
try {
  await pool.query(
    'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,$2,$3,true,$4,$5)',
    [user, 'Synthetic Checkout', email, 'Synthetic', 'Checkout'],
  )
  await pool.query(
    'INSERT INTO customer_auth.customer_accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$2,$4,now())',
    [randomUUID(), user, 'credential', await hashPassword(password)],
  )
  await pool.query(
    'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
    [org, 'Synthetic Checkout'],
  )
  await pool.query(
    'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
    [randomUUID(), org, user, 'owner'],
  )
  const context = await browser.newContext({
    baseURL: 'http://localhost:3100',
    viewport: { width: 1440, height: 1100 },
  })
  assert.equal(
    (
      await context.request.post('/api/customer-auth/sign-in/email', {
        headers: { origin: 'http://localhost:3100' },
        data: { email, password },
      })
    ).status(),
    200,
  )
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/en/portal/billing/checkout?plan=starter')
  await expect(page.getByRole('heading', { name: 'Complete your subscription' })).toBeVisible()
  await expect(page.getByLabel('Billing email')).toBeVisible({ timeout: 45000 })
  await page.getByLabel('Billing email').fill('billing@example.test')
  const coupon = await stripe.coupons.create({
    percent_off: 25,
    duration: 'once',
    name: 'Synthetic browser check',
  })
  couponId = coupon.id
  const promotion = await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: coupon.id },
    code: 'TEST' + org.replaceAll('-', '').slice(0, 12).toUpperCase(),
    max_redemptions: 1,
  })
  promotionId = promotion.id
  await page.getByLabel('Discount code').fill(promotion.code)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Remove discount', exact: true })).toBeVisible({
    timeout: 15000,
  })
  await mkdir('.private/billing-check', { recursive: true })
  async function frameWith(selector: string) {
    for (let attempt = 0; attempt < 100; attempt++) {
      for (const frame of page.frames()) if (await frame.locator(selector).count()) return frame
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    throw new Error(`Stripe field missing: ${selector}`)
  }
  const address = await frameWith('input[name="addressLine1"]')
  await address.getByRole('textbox').first().fill('Synthetic Checkout GmbH')
  await address.locator('select[name="country"]').selectOption('DE')
  await address.locator('input[name="addressLine1"]').fill('Teststrasse 1')
  await address.locator('input[name="addressLine1"]').press('Tab')
  await address.locator('input[name="postalCode"]').fill('10115')
  await address.locator('input[name="locality"]').fill('Berlin')
  const card = await frameWith('input[name="number"]')
  await card.locator('input[name="number"]').fill('4242424242424242')
  await card.locator('input[name="expiry"]').fill('1230')
  await card.locator('input[name="cvc"]').fill('123')
  await page.screenshot({ path: '.private/billing-check/checkout-desktop.png', fullPage: true })
  await page.getByRole('button', { name: /Subscribe and pay/ }).click()
  await page.waitForURL('**/portal/billing?checkout=returned', { timeout: 45000 })
  await expect(page.getByText('Current access: Starter', { exact: true })).toBeVisible({
    timeout: 45000,
  })
  await expect(page.getByText('•••• 4242')).toBeVisible({ timeout: 20000 })
  await page.screenshot({ path: '.private/billing-check/management-desktop.png', fullPage: true })
  await page.goto('/en/portal/billing/payment')
  await page.getByRole('button', { name: 'Add payment method', exact: true }).click()
  const newCard = await frameWith('input[name="number"]')
  await newCard.locator('input[name="number"]').fill('5555555555554444')
  await newCard.locator('input[name="expiry"]').fill('1230')
  await newCard.locator('input[name="cvc"]').fill('123')
  const zip = newCard.locator('input[name="postalCode"]')
  if (await zip.isVisible()) await zip.fill('10115')
  await page.getByRole('button', { name: 'Save and use this card', exact: true }).click()
  await page.waitForURL('**/portal/billing', { timeout: 30000 })
  await expect(page.getByText('•••• 4444')).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Edit billing information', exact: true }).click()
  await page.getByLabel('Name / company', { exact: true }).fill('Synthetic Updated GmbH')
  await page.getByRole('button', { name: 'Save billing information', exact: true }).click()
  await expect(page.getByText('Synthetic Updated GmbH', { exact: true })).toBeVisible({
    timeout: 20000,
  })
  await page.getByRole('button', { name: 'Cancel renewal', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Keep subscription', exact: true })).toBeVisible({
    timeout: 20000,
  })
  await page.getByRole('button', { name: 'Keep subscription', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Cancel renewal', exact: true })).toBeVisible({
    timeout: 20000,
  })
  await page.goto('/en/portal/billing/change?plan=professional')
  await expect(page.getByRole('button', { name: /Confirm and pay/ })).toBeVisible({
    timeout: 30000,
  })
  await page.screenshot({ path: '.private/billing-check/plan-change.png', fullPage: true })
  await page.getByRole('button', { name: /Confirm and pay/ }).click()
  await page.waitForURL('**/portal/billing?changed=true', { timeout: 30000 })
  await expect(page.getByText('Current access: Professional', { exact: true })).toBeVisible({
    timeout: 30000,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/de/portal/billing')
  await expect(page.getByRole('heading', { name: 'Zahlungsmethoden', exact: true })).toBeVisible({
    timeout: 20000,
  })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await page.screenshot({ path: '.private/billing-check/management-mobile-de.png', fullPage: true })
  await page.evaluate(() => localStorage.setItem('taxful-theme', 'dark'))
  await page.goto('/de/portal/billing/payment')
  await page.getByRole('button', { name: 'Zahlungsmethode hinzufügen', exact: true }).click()
  const darkCard = await frameWith('input[name="number"]')
  await expect(darkCard.locator('input[name="number"]')).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: '.private/billing-check/payment-dark-mobile.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log(
    'Custom checkout, discount, card setup, billing details, cancellation/resumption, upgrade and German dark/mobile management passed.',
  )
} finally {
  await browser.close()
  if (promotionId) await stripe.promotionCodes.update(promotionId, { active: false })
  if (couponId) await stripe.coupons.del(couponId)
  const customers = await pool.query(
    'SELECT provider_customer_id FROM customer_auth.billing_customers WHERE organization_id=$1',
    [org],
  )
  for (const { provider_customer_id: id } of customers.rows)
    if (id) {
      const subscriptions = await stripe.subscriptions.list({ customer: id, status: 'all' })
      for (const sub of subscriptions.data)
        if (sub.status !== 'canceled') await stripe.subscriptions.cancel(sub.id)
      await stripe.customers.del(id)
    }
  await pool.query(
    "DELETE FROM customer_auth.billing_webhook_events WHERE provider_event_id IN (SELECT details->>'eventId' FROM customer_auth.billing_audit_events WHERE organization_id=$1)",
    [org],
  )
  await pool.query('DELETE FROM customer_auth.organizations WHERE id=$1', [org])
  await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
  await pool.end()
  console.log('Synthetic checkout records cleaned up.')
}
