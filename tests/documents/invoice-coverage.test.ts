import { test } from 'node:test'
import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { invoiceFixture } from './fixtures'
import { calculateInvoice } from '../../src/lib/documents/invoice-calculation'
import { invoiceRequirements } from '../../src/lib/documents/invoice-requirements'
import { generateXRechnung, validateXRechnung } from '../../src/lib/documents/xrechnung'
import { generateCII, generateZugferd } from '../../src/lib/documents/zugferd'
import { parseStructuredInvoice } from '../../src/lib/documents/structured-invoice'
import { validateImportedInvoice } from '../../src/lib/documents/import-validation'
import type { DocumentRecord } from '../../src/lib/documents/schema'

export function coverageFixtures(): [string, DocumentRecord][] {
  const result: [string, DocumentRecord][] = []
  for (const invoiceKind of [
    'standard',
    'credit_note',
    'correction',
    'partial',
    'prepayment',
    'final',
  ] as const) {
    const data = invoiceFixture()
    Object.assign(data, {
      invoiceKind,
      invoiceNote: 'Synthetic contract phase / correction agreed with customer.',
      precedingInvoices: [{ number: 'PREVIOUS-001', date: '2026-08-01' }],
    })
    if (invoiceKind === 'final') {
      data.prepaidAmount = '59.50'
      data.advancePayments = [
        {
          invoiceNumber: 'PREVIOUS-001',
          paymentDate: '2026-08-10',
          netAmount: '50.00',
          taxAmount: '9.50',
          grossAmount: '59.50',
        },
      ]
    }
    result.push([invoiceKind, data])
  }
  for (const taxCategory of ['Z', 'E', 'AE'] as const) {
    const data = invoiceFixture()
    data.lines[0].taxCategory = taxCategory
    data.lines[0].taxRate = '0'
    data.taxExemptionReason = 'Steuerfreie Heilbehandlung gemäß § 4 Nr. 14 UStG'
    data.reverseChargeReason = 'Steuerschuldnerschaft des Leistungsempfängers / Reverse charge'
    data.recipient.vatId = 'DE123456788'
    data.taxAmount = '0.00'
    data.grossAmount = '100.00'
    result.push([taxCategory, data])
  }
  const mixed = invoiceFixture()
  mixed.lines.push({ ...mixed.lines[0], description: 'Reduced rate service', taxRate: '7' })
  mixed.lines[0].allowances = [
    { amount: '10.00', reason: '10% discount', baseAmount: '100.00', percentage: '10' },
  ]
  mixed.lines[0].netAmount = '90.00'
  mixed.allowances = [
    { amount: '9.00', reason: 'Contract rebate', taxCategory: 'S', taxRate: '19' },
  ]
  mixed.charges = [{ amount: '5.00', reason: 'Service surcharge', taxCategory: 'S', taxRate: '7' }]
  const totals = calculateInvoice(mixed)!
  Object.assign(mixed, { netAmount: totals.net, taxAmount: totals.tax, grossAmount: totals.gross })
  result.push(['mixed-discounts', mixed])
  const period = invoiceFixture()
  period.supplyDate = ''
  period.periodStart = '2026-09-01'
  period.periodEnd = '2026-09-12'
  period.lines[0].quantity = '10'
  period.lines[0].priceBaseQuantity = '10'
  result.push(['period-base-quantity', period])
  return result
}
test('category-aware totals keep allowances, mixed VAT and prepaid balances separate', () => {
  const mixed = coverageFixtures().find(([name]) => name === 'mixed-discounts')![1]
  const totals = calculateInvoice(mixed)!
  assert.equal(totals.net, '186.00')
  assert.equal(totals.tax, '22.74')
  assert.equal(totals.gross, '208.74')
  assert.deepEqual(totals.invalidLines, [])
  for (const [, data] of coverageFixtures())
    assert.deepEqual(
      invoiceRequirements(data, data.invoiceKind === 'prepayment' ? 'zugferd' : 'xrechnung'),
      [],
    )
  const wrong = invoiceFixture()
  wrong.lines[0].taxCategory = 'AE'
  assert.ok(invoiceRequirements(wrong).includes('lines.0.taxRate'))
  assert.ok(invoiceRequirements(wrong).includes('recipient.vatId'))
  const credit = invoiceFixture()
  credit.invoiceKind = 'credit_note'
  assert.ok(invoiceRequirements(credit).includes('precedingInvoices'))
  assert.ok(invoiceRequirements(credit).includes('invoiceNote'))
  const partial = invoiceFixture()
  partial.invoiceKind = 'partial'
  partial.invoiceNote = ''
  assert.ok(!invoiceRequirements(partial).includes('invoiceNote'))
  const prepaid = invoiceFixture()
  prepaid.prepaidAmount = '120'
  assert.ok(invoiceRequirements(prepaid).includes('prepaidAmount'))
  const final = coverageFixtures().find(([name]) => name === 'final')![1]
  final.advancePayments![0].grossAmount = '60.00'
  assert.ok(invoiceRequirements(final).includes('advancePayments.0.grossAmount'))
  assert.ok(invoiceRequirements(final).includes('prepaidAmount'))
  final.advancePayments = []
  assert.ok(invoiceRequirements(final).includes('advancePayments'))
  const discount = structuredClone(mixed)
  discount.allowances![0].amount = '1000'
  assert.ok(invoiceRequirements(discount).includes('allowances'))
})
test(
  'all invoice scenarios pass independent XML and PDF validators',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    await mkdir('.private/invoice-coverage', { recursive: true })
    for (const [name, data] of coverageFixtures()) {
      const xml = data.invoiceKind === 'prepayment' ? null : generateXRechnung(data)
      if (xml) {
        const report = await validateXRechnung(xml)
        assert.equal(report.valid, true, `${name} UBL: ${JSON.stringify(report.issues)}`)
      }
      const cii = Buffer.from(generateCII(data))
      // Import round-trip assertions follow the same canonical fields, including credits.
      const response = await fetch(
        (process.env.ZUGFERD_SERVICE_URL || 'http://127.0.0.1:8087') + '/validate-import',
        { method: 'POST', headers: { 'Content-Type': 'application/xml' }, body: cii },
      )
      const validated = await response.json()
      assert.equal(validated.valid, true, `${name} CII: ${validated.report}`)
      const pdf = await generateZugferd(data)
      await writeFile(`.private/invoice-coverage/${name}.pdf`, pdf.bytes)
      if (process.env.CHECK_PDF_TEXT === 'true') {
        const { stdout } = await promisify(execFile)('pdftotext', [
          '-layout',
          `.private/invoice-coverage/${name}.pdf`,
          '-',
        ])
        assert.ok(!stdout.includes('NaN'), `${name}: invalid visible amount`)
        if (name === 'mixed-discounts') {
          for (const text of ['Contract rebate', 'Service surcharge', '17.10', '7.00', '208.74'])
            assert.ok(stdout.includes(text), `Missing visible ${text}`)
        }
        if (name === 'final') {
          for (const text of [
            'Schlussrechnung',
            'PREVIOUS-001',
            'payments.csv',
            '59.50',
            'Bereits bezahlt',
          ])
            assert.ok(stdout.includes(text), `Missing visible ${text}`)
        }
        if (name === 'credit_note') assert.ok(stdout.includes('Kaufmännische'))
        if (name === 'AE') assert.ok(stdout.includes('Reverse charge'))
        if (name === 'E') assert.ok(stdout.includes('Steuerfreie Heilbehandlung'))
        if (name === 'period-base-quantity') assert.ok(stdout.includes('Leistungszeitraum'))
      }
      if (process.env.CHECK_IMPORT_ROUNDTRIP === 'true') {
        for (const source of [...(xml ? [Buffer.from(xml)] : []), cii]) {
          const imported = parseStructuredInvoice(source)
          assert.equal(
            imported.data.invoiceKind,
            data.invoiceKind === 'final' ? 'standard' : data.invoiceKind || 'standard',
          )
          assert.equal(imported.data.netAmount, data.netAmount)
          // JSON persistence omits optional undefined properties from parser projections.
          assert.deepEqual(
            JSON.parse(JSON.stringify(imported.data.allowances || [])),
            data.allowances || [],
          )
          assert.deepEqual(
            JSON.parse(JSON.stringify(imported.data.charges || [])),
            data.charges || [],
          )
          assert.equal(imported.data.lines[0].taxCategory || 'S', data.lines[0].taxCategory || 'S')
          assert.deepEqual(
            JSON.parse(JSON.stringify(imported.data.lines[0].allowances || [])),
            data.lines[0].allowances || [],
          )
          assert.equal(
            (await validateImportedInvoice(imported, source, 'application/xml')).valid,
            true,
          )
        }
      }
    }
  },
)
