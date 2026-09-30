import { config } from 'dotenv'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { mkdir } from 'node:fs/promises'
import { invoiceFixture } from './fixtures'

config({ path: ['.env.local', '.env'] })
process.env.INVOICE_EMAIL_MODE = 'mailpit'
process.env.BETTER_AUTH_URL = 'http://localhost:3100'
const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
const { processInvoiceEmail } = await import('../../src/lib/invoice-email/worker')
const { removePrivate } = await import('../../src/lib/documents/storage')
const user = randomUUID(),
  org = randomUUID(),
  doc = randomUUID(),
  email = user + '@example.test',
  password = randomUUID() + '-Test'
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
})
try {
  await pool.query(
    'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,\'Synthetic Email\',$2,true,\'Synthetic\',\'Email\')',
    [user, email],
  )
  await pool.query(
    'INSERT INTO customer_auth.customer_accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,\'credential\',$2,$3,now())',
    [randomUUID(), user, await hashPassword(password)],
  )
  await pool.query(
    'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,\'Synthetic Email\',$1,now())',
    [org],
  )
  await pool.query(
    'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,\'owner\',now())',
    [randomUUID(), org, user],
  )
  await pool.query(
    "INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id) VALUES($1,'starter',now()+interval '1 day','Synthetic browser fixture','test')",
    [org],
  )
  const data = invoiceFixture()
  data.recipient.email = email
  await pool.query(
    `INSERT INTO customer_auth.documents(id,organization_id,uploaded_by,original_name,status,reviewed_data,workflow,source_kind,processing_stage)
    VALUES($1,$2,$3,'Synthetic email invoice','needs_review',$4,'outgoing','manual','complete')`,
    [doc, org, user, data],
  )
  const context = await browser.newContext({
    baseURL: 'http://localhost:3100',
    viewport: { width: 1440, height: 1000 },
  })
  context.setDefaultTimeout(15000)
  assert.equal((await context.request.get('/api/invoice-email')).status(), 401)
  const login = await context.request.post('/api/customer-auth/sign-in/email', {
    headers: { origin: 'http://localhost:3100' },
    data: { email, password },
  })
  assert.equal(login.status(), 200)
  assert.equal(
    (
      await context.request.put('/api/invoice-email', {
        headers: { origin: 'https://outside.example.test' },
        data: {},
      })
    ).status(),
    403,
  )
  const page = await context.newPage(),
    errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && /same key|MISSING_MESSAGE/.test(m.text())) errors.push(m.text())
  })
  let downloads = 0
  page.on('download', () => {
    downloads++
  })
  await page.goto('/en/portal/profile')
  await page.getByLabel('Company display name', { exact: true }).waitFor()
  // The sender can be completed in the delivery flow, without a Profile detour.
  await page.goto('/en/portal/files/' + doc)
  assert.equal((await context.request.get('/en/portal/files/' + doc + '/send')).status(), 404)
  const confirmations = page.locator('#review-confirmations input[type="checkbox"]')
  await confirmations.first().waitFor()
  for (const box of await confirmations.all()) await box.check()
  await page.getByRole('button', { name: 'Approve reviewed data', exact: true }).click()
  await page
    .getByText(
      'Review approved. Next, create the validated invoice. You can then send or download it.',
      { exact: true },
    )
    .waitFor()
  await page.getByRole('button', { name: 'Create invoice and continue', exact: true }).click()
  await page.waitForURL('**/send?format=zugferd', { timeout: 90000 })
  assert.equal(downloads, 0)
  await page.getByRole('heading', { name: 'Send or download invoice', exact: true }).waitFor()
  const chosenDownload = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download ZUGFeRD PDF', exact: true }).click()
  assert.ok((await chosenDownload).suggestedFilename().endsWith('.pdf'))
  await page.getByLabel('Company display name', { exact: true }).fill('Synthetic Company')
  await page.getByLabel('From / reply address', { exact: true }).fill('accounts@example.test')
  await page.getByRole('button', { name: 'Save sender', exact: true }).click()
  await page.getByRole('button', { name: 'Preview email', exact: true }).waitFor()
  await page.getByRole('link', { name: 'Back to outgoing invoices', exact: true }).click()
  await page.getByRole('link', { name: 'Send / delivery history', exact: true }).click()
  await page.waitForURL('**/send')
  await page.getByRole('button', { name: 'Preview email', exact: true }).click()
  assert.equal(
    await page.getByRole('button', { name: 'Queue test email', exact: true }).isEnabled(),
    false,
  )
  await page.getByLabel('I checked the recipient address and attachment.', { exact: true }).check()
  await page.getByRole('button', { name: 'Queue test email', exact: true }).click()
  await page.getByText('Email queued. Delivery history shows progress.', { exact: true }).waitFor()
  await processInvoiceEmail(undefined, org)
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByText('Accepted by local Mailpit', { exact: true }).first().waitFor()
  assert.equal(
    (await pool.query('SELECT invoice_state FROM customer_auth.documents WHERE id=$1', [doc]))
      .rows[0].invoice_state,
    'sent',
  )
  await page.getByRole('button', { name: 'Preview email', exact: true }).click()
  await page.getByLabel('I checked the recipient address and attachment.', { exact: true }).check()
  assert.equal(
    await page.getByRole('button', { name: 'Queue test email', exact: true }).isEnabled(),
    false,
  )
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await mkdir('test-results/invoice-email', { recursive: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: 'test-results/invoice-email/en-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.goto('/de/portal/files/' + doc + '/send')
  await page.getByRole('button', { name: 'E-Mail-Vorschau', exact: true }).waitFor()
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'))
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: 'test-results/invoice-email/de-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  )
  assert.deepEqual(errors, [])
  console.log(
    'Invoice delivery browser smoke passed: unique Profile keys, approval → validation → delivery, no automatic download, inline sender setup, Files shortcut, send/history/resend, DE/EN and mobile.',
  )
} finally {
  await browser.close()
  const search = await fetch(
    'http://127.0.0.1:8026/api/v1/search?query=' + encodeURIComponent('to:' + email),
  )
  const listing = (await search.json()) as { messages: { ID: string }[] }
  if (listing.messages.length)
    await fetch('http://127.0.0.1:8026/api/v1/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: listing.messages.map((m) => m.ID) }),
    })
  await pool.query('DELETE FROM customer_auth.invoice_deliveries WHERE organization_id=$1', [org])
  const exports = await pool.query(
    'SELECT e.id FROM customer_auth.document_exports e JOIN customer_auth.documents d ON d.id=e.document_id WHERE d.organization_id=$1',
    [org],
  )
  await pool.query('DELETE FROM customer_auth.organizations WHERE id=$1', [org])
  await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
  for (const exported of exports.rows) await removePrivate(exported.id, 'export')
  await pool.end()
}
