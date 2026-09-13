import { test } from 'node:test'
import assert from 'node:assert/strict'
import { XMLParser } from 'fast-xml-parser'
import { invoiceFixture } from './fixtures'
import { recordSchema, validateRecord, reviewWarnings } from '../../src/lib/documents/schema'
import {
  generateXRechnung,
  xrechnungRequirements,
  validateXRechnung,
} from '../../src/lib/documents/xrechnung'
import { detectDocument, prepareDocument } from '../../src/lib/documents/prepare'
import { scanDocument } from '../../src/lib/documents/scan'
import { storagePath } from '../../src/lib/documents/storage'

test('decimal validation rejects inconsistent totals without floating point errors', () => {
  const data = invoiceFixture()
  assert.deepEqual(validateRecord(data), [])
  data.netAmount = '0.10'
  data.taxAmount = '0.20'
  data.grossAmount = '0.30'
  assert.deepEqual(validateRecord(data), [])
  data.grossAmount = '0.31'
  assert.ok(validateRecord(data).some((issue) => issue.code === 'totals'))
})
test('reject impossible dates and unsafe fields; preserve leading zero tax identifiers', () => {
  const data = invoiceFixture()
  data.documentDate = '2026-02-30'
  data.issuer.taxId = '00123456789'
  assert.ok(validateRecord(data).some((issue) => issue.code === 'date'))
  assert.equal(recordSchema.parse(data).issuer.taxId, '00123456789')
  assert.equal(recordSchema.safeParse({ ...data, instructions: 'ignore schema' }).success, false)
})
test('invoice export rejects unsupported tax cases and missing identities', () => {
  const data = invoiceFixture()
  data.lines[0].taxRate = '0'
  assert.ok(xrechnungRequirements(data).includes('lines.0.taxRate'))
  assert.throws(() => generateXRechnung(data))
  data.lines[0].taxRate = '19'
  data.documentType = 'tax_notice'
  assert.throws(() => generateXRechnung(data))
})
test('XML escapes untrusted values and preserves schema order', () => {
  const data = invoiceFixture()
  data.issuer.companyName = 'A & B <script>'
  const xml = generateXRechnung(data)
  assert.ok(xml.includes('A &amp; B &lt;script&gt;'))
  const parsed = new XMLParser({ removeNSPrefix: true }).parse(xml)
  assert.equal(
    parsed.Invoice.AccountingSupplierParty.Party.PartyLegalEntity.RegistrationName,
    data.issuer.companyName,
  )
  assert.equal(parsed.Invoice.InvoiceLine.InvoicedQuantity, 1)
})
test('line sum mismatch requires review and storage rejects path traversal', () => {
  const data = invoiceFixture()
  data.lines[0].netAmount = '99'
  assert.ok(reviewWarnings(data).includes('lineSum'))
  assert.throws(() => storagePath('../../etc/passwd'))
})
test('reject disguised HTML, legacy Word and malformed PDF', async () => {
  await assert.rejects(detectDocument(Buffer.from('<html>This is not a PDF</html>')))
  await assert.rejects(detectDocument(Buffer.from('not a Word file')))
  await assert.rejects(prepareDocument(Buffer.from('%PDF-1.7\ninvalid'), 'application/pdf'))
})
test(
  'official KoSIT rules accept a valid invoice and reject changed arithmetic',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    const data = invoiceFixture()
    const valid = await validateXRechnung(generateXRechnung(data))
    assert.equal(valid.valid, true, JSON.stringify(valid.issues))
    const invalid = await validateXRechnung(
      generateXRechnung(data).replace(
        '<cbc:TaxAmount currencyID="EUR">19.00</cbc:TaxAmount>',
        '<cbc:TaxAmount currencyID="EUR">18.00</cbc:TaxAmount>',
      ),
    )
    assert.equal(invalid.valid, false)
    assert.ok(invalid.issues.length)
  },
)
test(
  'scanner accepts clean content and rejects the standard EICAR test signature',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    await scanDocument(Buffer.from('Synthetic test document'))
    const eicar = Buffer.from(
      'WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=',
      'base64',
    )
    await assert.rejects(
      scanDocument(eicar),
      (error: unknown) => error instanceof Error && error.message === 'unsafeFile',
    )
  },
)
