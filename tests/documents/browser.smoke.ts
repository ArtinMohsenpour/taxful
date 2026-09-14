import { config } from 'dotenv'
import { chromium } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import sharp from 'sharp'
import assert from 'node:assert/strict'
import { blankCompanyProfile } from '../../src/lib/documents/company-profile-schema'
import { invoiceFixture } from './fixtures'
import { syntheticPdf } from './pdf-fixture'
import { writePrivate, removePrivate, sha256 } from '../../src/lib/documents/storage'
config({ path: ['.env.local', '.env'] })
const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
const user = randomUUID(),
  org = randomUUID(),
  batch = randomUUID(),
  doc = randomUUID(),
  pdfDoc = randomUUID(),
  email = user + '@example.test'
const password = randomUUID() + '-Synthetic-Only'
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
    [org, 'Synthetic Review Workspace'],
  )
  await pool.query(
    'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
    [randomUUID(), org, user, 'owner'],
  )
  await pool.query(
    'INSERT INTO customer_auth.document_batches(id,organization_id,request_key,fingerprint) VALUES($1,$2,$3,$4)',
    [batch, org, randomUUID(), 'synthetic-browser-test'],
  )
  const bytes = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="550"><rect width="800" height="550" fill="white"/><g font-family="sans-serif" fill="#30372b"><text x="55" y="85" font-size="30">SYNTHETIC TEST INVOICE</text><text x="55" y="145" font-size="20">Synthetic Supplier GmbH</text><text x="55" y="190" font-size="18">TEST-2026-001 · 2026-09-12</text><text x="55" y="265" font-size="18">Consulting service: EUR 100.00</text><text x="55" y="310" font-size="18">VAT 19%: EUR 19.00</text><text x="55" y="385" font-size="25">Total: EUR 119.00</text><text x="55" y="480" font-size="14">Generated test fixture. Not a real invoice.</text></g></svg>',
    ),
  )
    .png()
    .toBuffer()
  await writePrivate(doc, bytes)
  await writePrivate(doc, bytes, 'preview')
  await pool.query(
    "INSERT INTO customer_auth.documents(id,organization_id,batch_id,uploaded_by,original_name,mime_type,size_bytes,source_sha256,status,scanned_at,extracted_data,evidence,extraction_warnings) VALUES($1,$2,$3,$4,$5,'image/png',$6,$7,'needs_review',now(),$8,'[]','[]')",
    [
      doc,
      org,
      batch,
      user,
      'Synthetic test invoice.png',
      bytes.length,
      sha256(bytes),
      invoiceFixture(),
    ],
  )
  await pool.query(
    "INSERT INTO customer_auth.document_events(document_id,organization_id,event,details) VALUES($1,$2,'processing_stage',$3)",
    [doc, org, { stage: 'scanning' }],
  )
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    baseURL: 'http://localhost:3100',
  })
  const denied = await context.request.get('/api/documents')
  assert.equal(denied.status(), 401)
  const login = await context.request.post('/api/customer-auth/sign-in/email', {
    headers: { origin: 'http://localhost:3100' },
    data: { email, password },
  })
  assert.equal(login.status(), 200)
  const csrf = await context.request.post('/api/documents/' + doc + '/review', {
    headers: { origin: 'https://outside.example.test' },
    data: {},
  })
  assert.equal(csrf.status(), 403)
  const companyResponse = await context.request.put('/api/company-profile', {
    headers: { origin: 'http://localhost:3100' },
    data: {
      organizationId: org,
      revision: 0,
      data: {
        ...blankCompanyProfile,
        companyName: 'Synthetic Supplier GmbH',
        vatId: invoiceFixture().issuer.vatId,
        country: 'DE',
      },
    },
  })
  assert.equal(companyResponse.status(), 200)
  const missingInvoice = invoiceFixture()
  missingInvoice.supplyDate = ''
  missingInvoice.issuer.country = ''
  await pool.query('UPDATE customer_auth.documents SET extracted_data=$2 WHERE id=$1', [
    doc,
    missingInvoice,
  ])
  const page = await context.newPage(),
    errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/en/portal/converter')
  await page.getByRole('heading', { name: 'Document converter', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Filter files', exact: true }).waitFor()
  await page.goto('/en/portal/files/' + doc)
  await page.getByRole('heading', { name: 'Review extracted information' }).waitFor()
  await page.getByText('Processing activity · Berlin time', { exact: true }).click()
  await page.getByText('Checking file safety', { exact: true }).waitFor()
  const detailRoute = '**/api/documents/' + doc + '/detail'
  await page.route(detailRoute, async (route) => {
    const response = await route.fetch(),
      body = await response.json()
    body.document = {
      ...body.document,
      status: 'queued',
      stage: 'queued',
      health: { online: false, scannerReady: false },
    }
    await route.fulfill({ response, json: body })
  })
  await page.reload()
  await page
    .getByText(
      'Processing is paused: the background processor is offline. Your original is saved. Processing resumes when the service is available.',
      { exact: true },
    )
    .waitFor()
  assert.equal(await page.locator('[aria-current="step"]').count(), 0)
  await page.unroute(detailRoute)
  await page.reload()
  await page.getByRole('heading', { name: 'Review extracted information' }).waitFor()

  assert.equal(await page.locator('[id="field-issuer.country"]').inputValue(), 'DE')
  assert.equal(
    await page.locator('[id="field-issuer.companyName"]').inputValue(),
    'Synthetic Supplier GmbH',
  )
  const invoiceSection = page
    .locator('details')
    .filter({ has: page.locator('[id="field-supplyDate"]') })
    .first()
  await invoiceSection.locator(':scope > summary').click()
  assert.equal(
    await invoiceSection.evaluate((element) => (element as HTMLDetailsElement).open),
    false,
  )
  const blockedExport = page.getByRole('button', {
    name: 'Validate and download ZUGFeRD',
    exact: true,
  })
  assert.equal(
    await blockedExport.evaluate((element) => getComputedStyle(element).cursor),
    'not-allowed',
  )
  await page.getByRole('button', { name: 'Approve reviewed data', exact: true }).click()
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'field-supplyDate')
  assert.equal(
    await invoiceSection.evaluate((element) => (element as HTMLDetailsElement).open),
    true,
  )
  assert.equal(
    await page
      .getByRole('button', { name: 'Validate and download ZUGFeRD', exact: true })
      .textContent(),
    'Validate and download ZUGFeRD',
  )
  await page.locator('[id="field-supplyDate"]').fill('2026-09-12')
  for (const name of [
    'I checked names, addresses and tax identifiers.',
    'I checked document numbers, dates and payment terms.',
    'I checked amounts, tax rates and line items.',
    'I compared all extracted information with the original and resolved missing or uncertain values.',
  ])
    await page.getByRole('checkbox', { name, exact: true }).check()
  await page.getByRole('button', { name: 'Approve reviewed data', exact: true }).click()
  await page
    .getByRole('status')
    .filter({ hasText: 'Review approved. You can now generate the selected export.' })
    .waitFor()
  const pdfDownloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Validate and download ZUGFeRD', exact: true }).click()
  assert.ok((await pdfDownloading).suggestedFilename().endsWith('.pdf'))
  await page.getByRole('button', { name: 'Export format ZUGFeRD · PDF + XML', exact: true }).click()
  await page.getByRole('option', { name: 'XRechnung · XML', exact: true }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Validate and download XRechnung', exact: true }).click()
  const download = await downloading
  assert.ok(download.suggestedFilename().endsWith('.xml'))
  await page.goto('/en/portal/files')
  await page.getByRole('link', { name: 'Download XML', exact: true }).waitFor()
  await page.getByRole('link', { name: 'Download original', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Preview document', exact: true }).click()
  const preview = page.getByRole('dialog')
  await preview.getByRole('img').waitFor()
  await preview.getByRole('button', { name: 'Exported XML', exact: true }).click()
  await preview.locator('pre').filter({ hasText: 'Invoice' }).waitFor()
  await preview.getByRole('button', { name: 'ZUGFeRD PDF', exact: true }).click()
  await preview.getByText(/^Page 1 of \d+$/).waitFor()
  await page.waitForFunction(() => !!document.querySelector('dialog canvas')?.getAttribute('width'))
  await page.screenshot({ path: '.private/document-zugferd-preview.png' })
  await preview.getByRole('button', { name: 'Close', exact: true }).click()
  await page
    .getByRole('searchbox', { name: 'Search by filename', exact: true })
    .fill('no-such-file')
  await page.getByRole('button', { name: 'Filter files', exact: true }).click()
  await page.getByRole('heading', { name: 'No files match these filters.', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await page.getByRole('link', { name: 'Download XML', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Status All statuses', exact: true }).click()
  await page.getByRole('option', { name: 'Export ready', exact: true }).click()
  await page.getByRole('button', { name: 'Filter files', exact: true }).click()
  await page.getByRole('link', { name: 'Download XML', exact: true }).waitFor()
  await page.screenshot({
    path: '.private/document-library-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: '.private/document-library-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  )
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.goto('/en/portal/files/' + doc)
  await page.getByRole('heading', { name: 'Review extracted information' }).waitFor()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: '.private/document-review-desktop.png', fullPage: false })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/de/portal/files/' + doc)
  await page.getByRole('heading', { name: 'Extrahierte Angaben prüfen' }).waitFor()
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  )
  await page.screenshot({ path: '.private/document-review-mobile.png', fullPage: false })
  const pdf = syntheticPdf()
  await writePrivate(pdfDoc, pdf)
  await pool.query(
    `INSERT INTO customer_auth.documents(id,organization_id,batch_id,uploaded_by,original_name,mime_type,size_bytes,source_sha256,status,scanned_at,source_text,processing_stage)
    VALUES($1,$2,$3,$4,'Synthetic preview.pdf','application/pdf',$5,$6,'needs_review',now(),'Synthetic invoice 119.00 EUR','complete')`,
    [pdfDoc, org, batch, user, pdf.length, sha256(pdf)],
  )
  await pool.query(
    "UPDATE customer_auth.documents SET status='unsupported',classification=$2 WHERE id=$1",
    [pdfDoc, { kind: 'wage_tax_certificate', confidence: 'high', reason: 'Synthetic fixture' }],
  )
  await page.goto('/en/portal/files/' + pdfDoc)
  await page
    .getByRole('heading', { name: 'This document needs a different workflow', exact: true })
    .waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Review extracted information' }).count(), 0)
  assert.equal(await page.locator('input').count(), 0)
  assert.equal(
    (
      await context.request.post('/api/documents/' + pdfDoc + '/zugferd', {
        headers: { origin: 'http://localhost:3100' },
      })
    ).status(),
    409,
  )

  await page.getByRole('button', { name: 'Preview document', exact: true }).click()
  await page.getByRole('dialog').getByText('Page 1 of 1', { exact: true }).waitFor()
  await page.waitForFunction(() => {
    const c = document.querySelector('dialog canvas') as HTMLCanvasElement | null
    if (!c || !c.width || !c.height) return false
    const values = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    return values.some((value, index) => index % 4 === 0 && value < 100 && values[index + 3] > 0)
  })
  await page.screenshot({ path: '.private/document-pdf-preview-mobile.png', fullPage: false })
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await page.goto('/en/portal/files/' + doc)
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.equal((await context.request.get('/api/documents/' + doc + '/source')).status(), 200)
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete permanently', exact: true })
    .click()
  await page.waitForURL('**/en/portal/files')
  assert.equal((await context.request.get('/api/documents/' + doc + '/source')).status(), 404)
  assert.equal((await context.request.get('/api/documents/' + doc + '/export')).status(), 404)
  assert.equal((await context.request.get('/api/documents/' + doc + '/zugferd')).status(), 404)
  assert.deepEqual(errors, [])
  await page.goto('/en/portal/profile#company')
  const companyForm = page.locator('#company')
  await companyForm.getByRole('button', { name: 'Save company details', exact: true }).waitFor()
  const city = companyForm.getByLabel('City (Optional)', { exact: true })
  await city.fill('Berlin')
  await companyForm.getByRole('button', { name: 'Save company details', exact: true }).click()
  await companyForm
    .getByText('Company details saved for this workspace.', { exact: true })
    .waitFor()
  assert.equal(
    (await (await context.request.get('/api/company-profile')).json()).profile.data.city,
    'Berlin',
  )
  console.log(
    'Browser checks passed: review, filters, image/PDF/XML previews, deletion confirmation, downloads and mobile layout.',
  )
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
  const exports = await pool.query(
    'SELECT e.id FROM customer_auth.document_exports e JOIN customer_auth.documents d ON d.id=e.document_id WHERE d.organization_id=$1',
    [org],
  )
  await pool.query('DELETE FROM customer_auth.organizations WHERE id=$1', [org])
  await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
  await removePrivate(doc)
  await removePrivate(doc, 'preview')
  await removePrivate(pdfDoc)
  for (const row of exports.rows) await removePrivate(row.id, 'export')
  await pool.end()
}
