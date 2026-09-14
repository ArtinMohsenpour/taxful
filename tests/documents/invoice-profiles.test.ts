import { test } from 'node:test'
import assert from 'node:assert/strict'
import { invoiceFixture } from './fixtures'
import { classifyKnownText } from '../../src/lib/documents/classify'
import { extractClassifiedDocument } from '../../src/lib/documents/pipeline'
import { invoiceRequirements } from '../../src/lib/documents/invoice-requirements'
import { generateCII, generateZugferd } from '../../src/lib/documents/zugferd'

test('payroll and uncertain documents never enter invoice extraction', async () => {
  const classification = classifyKnownText(
    'Ausdruck der elektronischen Lohnsteuerbescheinigung für 2025',
  )!
  assert.equal(classification.kind, 'wage_tax_certificate')
  assert.equal(classifyKnownText('Invoice 001 consulting services'), null)
  for (const item of [
    classification,
    { kind: 'invoice' as const, confidence: 'low' as const, reason: 'uncertain' },
  ]) {
    const result = await extractClassifiedDocument(
      { text: 'Synthetic', pages: 1, parts: [], method: 'text' },
      item,
      async () => {
        throw new Error('Invoice extractor must not run')
      },
    )
    assert.deepEqual(result.data.lines, [])
    assert.equal(result.model, 'classification-only')
  }
})
test('minimum fields depend on invoice profile and payment method', () => {
  const data = invoiceFixture()
  data.issuer.email = ''
  data.recipient.email = ''
  data.issuer.name = ''
  data.issuer.phone = ''
  data.buyerReference = ''
  assert.deepEqual(invoiceRequirements(data, 'zugferd'), [])
  assert.ok(invoiceRequirements(data, 'xrechnung').includes('buyerReference'))
  data.supplyDate = ''
  assert.ok(invoiceRequirements(data).includes('supplyDate'))
  data.supplyDate = '2026-02-30'
  assert.ok(invoiceRequirements(data).includes('supplyDate'))
  data.supplyDate = '2026-09-12'
  data.paymentTerms = ''
  data.dueDate = '2026-10-01'
  assert.deepEqual(invoiceRequirements(data), [])
  data.paymentMeansCode = '58'
  assert.ok(invoiceRequirements(data).includes('bankAccount'))
  data.documentType = 'wage_tax_certificate'
  assert.throws(() => generateCII(data))
})
test('CII escapes content and does not contain unrelated personal tax data', () => {
  const data = invoiceFixture()
  data.issuer.companyName = 'A & B <script>'
  data.issuer.taxId = '00123456789'
  const xml = generateCII(data)
  assert.ok(xml.includes('A &amp; B &lt;script&gt;'))
  assert.ok(!xml.includes('00123456789'))
  assert.ok(xml.includes('urn:cen.eu:en16931:2017'))
})
test(
  'ZUGFeRD validates PDF/A, embedded XML and rejects incorrect monetary data',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    const data = invoiceFixture()
    data.issuer.email = ''
    data.recipient.email = ''
    data.issuer.name = ''
    data.buyerReference = ''
    const result = await generateZugferd(data)
    assert.equal(result.bytes.subarray(0, 5).toString(), '%PDF-')
    assert.equal(result.report.pdfValid, true)
    assert.equal(result.report.xmlValid, true)
    const response = await fetch('http://127.0.0.1:8087/generate', {
      method: 'POST',
      body: generateCII(data).replace(
        '<ram:TaxTotalAmount currencyID="EUR">19.00',
        '<ram:TaxTotalAmount currencyID="EUR">18.00',
      ),
    })
    assert.equal(response.status, 422)
    const invalid = await response.json()
    assert.equal(invalid.valid, false)
    assert.equal(invalid.pdf, undefined)
  },
)
