import { test } from 'node:test'
import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { parseStructuredInvoice } from '../../src/lib/documents/structured-invoice'
import { prepareDocument, detectDocument, invoiceAttachment } from '../../src/lib/documents/prepare'
import { generateXRechnung } from '../../src/lib/documents/xrechnung'
import { generateCII, generateZugferd } from '../../src/lib/documents/zugferd'
import { validateImportedInvoice } from '../../src/lib/documents/import-validation'
import { invoiceFixture } from './fixtures'
import { sha256 } from '../../src/lib/documents/storage'

test('UBL and CII map source values without numeric coercion or AI', async () => {
  const data = invoiceFixture()
  data.documentNumber = '0000123'
  data.issuer.companyName = 'Smith & Sons <Consulting>'
  data.recipient.postalCode = '01234'
  for (const xml of [generateXRechnung(data), generateCII(data)]) {
    const result = parseStructuredInvoice(Buffer.from(xml))
    assert.equal(result.data.documentNumber, '0000123')
    assert.equal(result.data.recipient.postalCode, '01234')
    assert.equal(result.data.issuer.companyName, data.issuer.companyName)
    assert.equal(result.data.netAmount, data.netAmount)
    assert.equal(result.data.taxAmount, data.taxAmount)
    assert.equal(result.data.lines[0].quantity, '1')
    assert.equal(result.data.lines[0].unitCode, 'C62')
    assert.equal(result.data.issuer.vatId, data.issuer.vatId)
    assert.equal(result.data.paymentTerms, data.paymentTerms)
    const prepared = await prepareDocument(Buffer.from(xml), 'application/xml')
    assert.equal(prepared.method, 'structured_xml')
    assert.equal(prepared.parts.length, 0)
    assert.ok(prepared.structured)
    assert.equal(await detectDocument(Buffer.from(xml)), 'application/xml')
  }
})
test('untrusted XML rejects external entities, wrong namespaces, duplicates, unknown profiles and resource excess', () => {
  const xml = generateXRechnung(invoiceFixture())
  for (const bad of [
    '<?xml version="1.0"?><!DOCTYPE Invoice [<!ENTITY x SYSTEM "file:///etc/passwd">]><Invoice>&x;</Invoice>',
    xml.replace(
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'https://fake.example.test/invoice',
    ),
    xml.replace(
      '<cbc:ID>TEST-2026-001</cbc:ID>',
      '<cbc:ID>TEST-2026-001</cbc:ID><cbc:ID>other</cbc:ID>',
    ),
    xml.replace('xrechnung_3.0', 'other-profile'),
    '<Invoice><broken></Invoice>',
    '<x>'.repeat(70) + 'a' + '</x>'.repeat(70),
    '<?xml-stylesheet href="https://example.test/x"?>' + xml,
    '<!--' + 'x'.repeat(1_000_000) + '-->',
  ])
    assert.throws(() => parseStructuredInvoice(Buffer.from(bad)))
  assert.throws(() => parseStructuredInvoice(Buffer.from([0xff, 0xfe, 0, 60])))
})
test('PDF attachment policy accepts one known invoice XML only', () => {
  const content = Buffer.from(generateCII(invoiceFixture()))
  assert.equal(
    invoiceAttachment([{ filename: 'factur-x.xml', content }]).structured.format,
    'zugferd-cii',
  )
  for (const entries of [
    [],
    [{ filename: 'run.exe', content }],
    [
      { filename: 'factur-x.xml', content },
      { filename: 'xrechnung.xml', content },
    ],
    [{ filename: 'factur-x.xml', content: Buffer.from('<evil/>') }],
  ])
    assert.throws(() => invoiceAttachment(entries))
})
test(
  'direct imports validate against local services and preserve source bytes',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    const data = invoiceFixture(),
      xml = Buffer.from(generateXRechnung(data)),
      hash = sha256(xml)
    const parsed = parseStructuredInvoice(xml)
    assert.equal((await validateImportedInvoice(parsed, xml, 'application/xml')).valid, true)
    const invalid = Buffer.from(
      xml
        .toString()
        .replace(
          '<cbc:TaxInclusiveAmount currencyID="EUR">119.00',
          '<cbc:TaxInclusiveAmount currencyID="EUR">120.00',
        ),
    )
    assert.equal(
      (await validateImportedInvoice(parseStructuredInvoice(invalid), invalid, 'application/xml'))
        .valid,
      false,
    )
    assert.equal(sha256(xml), hash)
    const cii = Buffer.from(generateCII(data))
    assert.equal(
      (await validateImportedInvoice(parseStructuredInvoice(cii), cii, 'application/xml')).valid,
      true,
    )
    const ciiWithBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), cii])
    assert.equal(
      (
        await validateImportedInvoice(
          parseStructuredInvoice(ciiWithBom),
          ciiWithBom,
          'application/xml',
        )
      ).valid,
      true,
    )
    const pdf = (await generateZugferd(data)).bytes,
      pdfHash = sha256(pdf)
    const prepared = await prepareDocument(pdf, 'application/pdf')
    assert.equal(prepared.method, 'embedded_xml')
    assert.equal(prepared.parts.length, 0)
    assert.equal(prepared.structured?.data.grossAmount, '119.00')
    assert.equal(
      (await validateImportedInvoice(prepared.structured!, pdf, 'application/pdf')).valid,
      true,
    )
    assert.equal(sha256(pdf), pdfHash)
  },
)
