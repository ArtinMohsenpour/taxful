import { config } from 'dotenv'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { mkdir } from 'node:fs/promises'
import { invoiceFixture } from './fixtures'
import { blankCompanyProfile } from '../../src/lib/documents/company-profile-schema'
import { generateXRechnung } from '../../src/lib/documents/xrechnung'
import { validateImportedInvoice } from '../../src/lib/documents/import-validation'
import { parseStructuredInvoice } from '../../src/lib/documents/structured-invoice'
import { removePrivate, writePrivate, sha256 } from '../../src/lib/documents/storage'
config({ path: ['.env.local', '.env'] })
const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
const user = randomUUID(),
  org = randomUUID(),
  email = user + '@example.test',
  password = randomUUID() + '-Test'
const browser = await chromium.launch({ headless: true })
try {
  await pool.query(
    'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,$2,$3,true,$4,$5)',
    [user, 'Synthetic Reviewer', email, 'Synthetic', 'Reviewer'],
  )
  await pool.query(
    'INSERT INTO customer_auth.customer_accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$2,$4,now())',
    [randomUUID(), user, 'credential', await hashPassword(password)],
  )
  await pool.query(
    'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
    [org, 'Synthetic Invoices'],
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
  assert.equal((await api.get('/api/invoices/customers')).status(), 401)
  assert.equal(
    (
      await api.post('/api/customer-auth/sign-in/email', {
        headers: { origin: 'http://localhost:3100' },
        data: { email, password },
      })
    ).status(),
    200,
  )
  const fixture = invoiceFixture()
  const { taxId: _taxId, ...profile } = fixture.issuer
  assert.equal(
    (
      await api.put('/api/company-profile', {
        headers: { origin: 'http://localhost:3100' },
        data: { organizationId: org, revision: 0, data: profile },
      })
    ).status(),
    200,
  )
  const recipient = { ...blankCompanyProfile, ...fixture.recipient }
  const { taxId: _buyerTaxId, ...customer } = recipient
  for (const [kind, data] of [
    ['customers', customer],
    [
      'products',
      {
        description: 'Consulting',
        unitCode: 'HUR',
        unitPrice: '100.00',
        taxRate: '19',
        currency: 'EUR',
      },
    ],
  ] as const) {
    assert.equal(
      (
        await api.post('/api/invoices/' + kind, {
          headers: { origin: 'http://localhost:3100' },
          data: { organizationId: org, revision: 0, data },
        })
      ).status(),
      200,
    )
  }
  assert.equal(
    (
      await api.post('/api/invoices/drafts', {
        headers: { origin: 'https://outside.example.test' },
        data: {},
      })
    ).status(),
    403,
  )
  const page = await context.newPage(),
    errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/en/portal/invoices/customers')
  await page.getByRole('heading', { name: 'Customers', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('City', { exact: true }).fill('Berlin')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByText('Changes saved.', { exact: true }).waitFor()
  await page.goto('/en/portal/invoices/new')
  await page.getByRole('button', { name: /Customer Enter customer/ }).click()
  await page.getByRole('option', { name: fixture.recipient.companyName, exact: true }).click()
  await page.getByRole('checkbox', { name: /Consulting/ }).check()
  await page.getByRole('button', { name: 'Create draft', exact: true }).click()
  await page.waitForURL('**/portal/files/*')
  await page.getByRole('heading', { name: 'Review extracted information' }).waitFor()
  assert.equal(await page.locator('[id="field-invoiceNote"]').count(), 0)
  assert.equal(await page.locator('[id="field-precedingInvoices"]').count(), 0)
  assert.equal(await page.locator('[id="field-advancePayments"]').count(), 0)
  const serviceDates = page
    .getByText('Different service date or service period', { exact: true })
    .locator('..')
  assert.equal(
    await serviceDates.evaluate((element) => (element as HTMLDetailsElement).open),
    false,
  )
  await page.getByRole('button', { name: /Use a saved customer/ }).click()
  await page.getByRole('option', { name: fixture.recipient.companyName, exact: true }).click()
  assert.equal(
    await page.locator('[id="field-recipient.companyName"]').inputValue(),
    fixture.recipient.companyName,
  )
  await page.locator('[id="field-recipient.companyName"]').fill('New reusable customer GmbH')
  await page.getByRole('checkbox', { name: /Save these customer details/ }).check()
  assert.equal(await page.locator('[id="field-lines.0.unitPrice"]').inputValue(), '100.00')
  await mkdir('.private/invoice-workflow-check', { recursive: true })
  await page.screenshot({
    path: '.private/invoice-workflow-check/standard-review.png',
    fullPage: true,
  })
  await page.getByText('VAT treatment and line adjustments', { exact: true }).click()
  await page
    .locator('[id="field-lines.0.allowances"]')
    .getByRole('button', { name: 'Add discount / allowance', exact: true })
    .click()
  await page.locator('[id="field-lines.0.allowances.0.reason"]').fill('Agreed loyalty discount')
  await page.locator('[id="field-lines.0.allowances.0.baseAmount"]').fill('100')
  await page.locator('[id="field-lines.0.allowances.0.percentage"]').fill('10')
  assert.equal(await page.locator('[id="field-lines.0.netAmount"]').inputValue(), '90.00')
  assert.equal(await page.locator('[id="field-grossAmount"]').inputValue(), '107.10')
  assert.equal(await page.getByRole('link', { name: 'Download original', exact: true }).count(), 0)
  assert.equal(await page.getByText('Safety check', { exact: true }).count(), 0)
  // Complete actual review inputs, preserving the company-scoped reserved number.
  assert.equal(
    await page.locator('[id="field-supplyDate"]').inputValue(),
    await page.locator('[id="field-documentDate"]').inputValue(),
  )
  await page.locator('[id="field-paymentTerms"]').fill('Paid in cash.')
  await page.locator('[data-payment-method] button').first().click()
  await page.getByRole('option', { name: /Cash/i }).click()
  await page.getByRole('button', { name: /Export format ZUGFeRD/ }).click()
  await page.getByRole('option', { name: 'XRechnung · XML', exact: true }).click()
  await page.locator('[id="field-buyerReference"]').fill('TEST-BUYER')
  await page.getByRole('button', { name: /Export format XRechnung/ }).click()
  await page.getByRole('option', { name: 'ZUGFeRD · PDF + XML', exact: true }).click()
  for (const text of [
    'I checked names, addresses and tax identifiers.',
    'I checked document and payment dates.',
    'I checked line items, amounts and VAT.',
    'I compared this data with the complete original document.',
  ]) {
    const box = page.getByRole('checkbox', { name: text, exact: true })
    if (await box.count()) await box.check()
  }
  // The four confirmation labels may change with translation wording; ensure all four are checked.
  for (const box of await page.locator('#review-confirmations input[type=checkbox]').all())
    await box.check()
  await page.getByRole('button', { name: 'Approve reviewed data', exact: true }).click()
  await page
    .getByText('Review approved. You can now generate the selected export.', { exact: true })
    .waitFor()
  const savedCustomers = await (await api.get('/api/invoices/customers')).json()
  assert.equal(
    savedCustomers.items.filter(
      (item: { data: { companyName: string } }) =>
        item.data.companyName === 'New reusable customer GmbH',
    ).length,
    1,
  )
  const pdf = page.waitForEvent('download', { timeout: 120000 })
  await page.getByRole('button', { name: 'Validate and download ZUGFeRD', exact: true }).click()
  assert.ok((await pdf).suggestedFilename().endsWith('.pdf'))
  await page.getByText('This validated invoice is locked.', { exact: false }).waitFor()
  assert.equal(await page.locator('[id="field-lines.0.unitPrice"]').isDisabled(), true)
  await page
    .getByRole('button', { name: /Export format ZUGFeRD/ })
    .last()
    .click()
  await page.getByRole('option', { name: 'XRechnung · XML', exact: true }).click()
  const xml = page.waitForEvent('download', { timeout: 120000 })
  await page.getByRole('button', { name: 'Validate and download XRechnung', exact: true }).click()
  assert.ok((await xml).suggestedFilename().endsWith('.xml'))
  await page.getByRole('button', { name: 'Record as sent', exact: true }).click()
  await page.getByRole('heading', { name: 'Sent', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Record as paid', exact: true }).click()
  await page.getByRole('heading', { name: 'Paid', exact: true }).waitFor()
  const issuedUrl = page.url()
  const issuedNumber = await page.locator('[id="field-documentNumber"]').inputValue()
  await page.getByRole('button', { name: 'Create credit note', exact: true }).click()
  await page.waitForURL((url) => url.href !== issuedUrl && url.pathname.includes('/portal/files/'))
  await page.locator('[id="field-invoiceNote"]').waitFor()
  assert.equal(await page.locator('[id="field-precedingInvoices"]').count(), 1)
  assert.equal(
    await page.locator('[id="field-precedingInvoices.0.number"]').inputValue(),
    issuedNumber,
  )
  assert.notEqual(await page.locator('[id="field-documentNumber"]').inputValue(), issuedNumber)
  await page
    .locator('[id="field-invoiceNote"]')
    .fill('Agreed cancellation of the consulting engagement.')
  for (const box of await page.locator('#review-confirmations input[type=checkbox]').all())
    await box.check()
  await page.getByRole('button', { name: 'Approve reviewed data', exact: true }).click()
  await page
    .getByText('Review approved. You can now generate the selected export.', { exact: true })
    .waitFor()
  const creditPdf = page.waitForEvent('download', { timeout: 120000 })
  await page.getByRole('button', { name: 'Validate and download ZUGFeRD', exact: true }).click()
  assert.ok((await creditPdf).suggestedFilename().endsWith('.pdf'))
  await page.getByText('This validated invoice is locked.', { exact: false }).waitFor()
  await page.goto('/en/portal/invoices/outgoing')
  await page
    .getByRole('link', { name: /TF-\d{4}-/ })
    .first()
    .waitFor()
  await page.screenshot({ path: '.private/invoice-workflow-check/outgoing.png', fullPage: true })
  const batch = randomUUID()
  await pool.query(
    'INSERT INTO customer_auth.document_batches(id,organization_id,request_key,fingerprint) VALUES($1,$2,$3,$4)',
    [batch, org, randomUUID(), 'synthetic-tabs'],
  )
  const incomingXml = Buffer.from(generateXRechnung(fixture))
  const incomingValidation = await validateImportedInvoice(
    parseStructuredInvoice(incomingXml),
    incomingXml,
    'application/xml',
  )
  for (const workflow of ['incoming', 'unclassified']) {
    const id = randomUUID()
    await pool.query(
      "INSERT INTO customer_auth.documents(id,organization_id,batch_id,uploaded_by,original_name,mime_type,size_bytes,source_sha256,status,workflow) VALUES($1,$2,$3,$4,$5,'application/pdf',1,'synthetic','needs_review',$6)",
      [
        id,
        org,
        batch,
        user,
        'Synthetic ' + workflow + (workflow === 'incoming' ? '.xml' : '.pdf'),
        workflow,
      ],
    )
    if (workflow === 'incoming') {
      await writePrivate(id, incomingXml)
      await pool.query(
        "UPDATE customer_auth.documents SET scanned_at=now(),processing_stage='complete',mime_type=$2,size_bytes=$3,source_sha256=$4,source_text=$5,extracted_data=$6,input_validation=$7 WHERE id=$1",
        [
          id,
          'application/xml',
          incomingXml.length,
          sha256(incomingXml),
          incomingXml.toString(),
          fixture,
          incomingValidation,
        ],
      )
    }
  }
  await page.goto('/en/portal/files')
  await page
    .getByRole('link', { name: /TF-\d{4}-/ })
    .first()
    .waitFor()
  assert.equal(
    await page.getByRole('link', { name: 'Synthetic incoming.xml', exact: true }).count(),
    0,
  )
  await page
    .getByRole('navigation', { name: 'Invoice direction' })
    .getByRole('link', { name: 'Incoming invoices', exact: true })
    .click()
  await page.getByRole('link', { name: 'Synthetic incoming.xml', exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: /TF-\d{4}-/ }).count(), 0)
  await page.screenshot({
    path: '.private/invoice-workflow-check/files-incoming.png',
    fullPage: true,
  })
  await page.getByRole('link', { name: 'Synthetic incoming.xml', exact: true }).click()
  await page.getByText('E-invoice format validation passed', { exact: true }).waitFor()
  assert.equal(
    await page.getByRole('button', { name: 'Approve reviewed data', exact: true }).count(),
    0,
  )
  await page.getByRole('button', { name: 'Preview document', exact: true }).click()
  await page.getByRole('dialog').locator('pre').waitFor()
  assert.ok(
    (await page.getByRole('dialog').locator('pre').textContent())?.includes('TEST-2026-001'),
  )
  await page.keyboard.press('Escape')
  const original = await page
    .getByRole('link', { name: 'Download original', exact: true })
    .getAttribute('href')
  assert.equal(sha256(await (await api.get(original!)).body()), sha256(incomingXml))
  await page.goto('/en/portal/files?workflow=incoming')
  await page
    .getByRole('navigation', { name: 'Invoice direction' })
    .getByRole('link', { name: 'Unassigned uploads', exact: true })
    .click()
  await page.getByRole('link', { name: 'Synthetic unclassified.pdf', exact: true }).waitFor()
  assert.equal(
    await page.getByRole('link', { name: 'Synthetic incoming.xml', exact: true }).count(),
    0,
  )
  await page.goto('/en/portal')
  const summary = page.getByRole('region', { name: 'Workspace summary' })
  await summary.getByText('Documents', { exact: true }).waitFor()
  for (const [label, value] of [
    ['Documents', '4'],
    ['Outgoing invoices', '2'],
    ['Incoming invoices', '1'],
    ['Saved customers', '2'],
    ['Export files', '3'],
    ['Needs attention', '2'],
  ]) {
    const card = summary.getByRole('link').filter({ hasText: label })
    await card.getByText(value, { exact: true }).waitFor()
  }
  await page.getByRole('heading', { name: 'Recent documents', exact: true }).waitFor()
  await page.screenshot({ path: '.private/invoice-workflow-check/overview.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/de/portal')
  await page
    .getByRole('heading', { name: 'Übersicht des Unternehmensbereichs', exact: true })
    .waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({
    path: '.private/invoice-workflow-check/overview-mobile.png',
    fullPage: true,
  })
  await page.goto('/de/portal/invoices/new')
  await page.getByRole('heading', { name: 'Rechnung erstellen', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: '.private/invoice-workflow-check/mobile.png', fullPage: true })
  await page.goto('/de/portal/invoices/incoming')
  await page.getByRole('heading', { name: 'Eingangsrechnungen', exact: true }).waitFor()
  assert.deepEqual(errors, [])
  console.log(
    'Invoice browser smoke passed: directories, manual draft, approval, validated PDF/XML exports, locked issue, sent/paid tracking, Files direction separation and German mobile layout.',
  )
} finally {
  const exports = await pool.query(
    'SELECT e.id FROM customer_auth.document_exports e JOIN customer_auth.documents d ON d.id=e.document_id WHERE d.organization_id=$1',
    [org],
  )
  for (const row of exports.rows) await removePrivate(row.id, 'export')
  const sources = await pool.query(
    'SELECT id FROM customer_auth.documents WHERE organization_id=$1',
    [org],
  )
  for (const row of sources.rows) await removePrivate(row.id)
  await pool.query('DELETE FROM customer_auth.organizations WHERE id=$1', [org])
  await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
  await browser.close()
  await pool.end()
}
