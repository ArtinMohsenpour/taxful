import test from 'node:test'
import assert from 'node:assert/strict'
import { compareInvoiceText } from '../../src/lib/documents/visual-comparison'
import { invoiceFixture } from './fixtures'

test('hybrid invoice comparison flags absent financial identifiers and totals without modifying XML data', () => {
  const data = invoiceFixture()
  data.grossAmount = '1234.56'
  data.bankAccount = 'DE89370400440532013000'
  data.issuer.vatId = 'DE123456789'
  data.recipient.vatId = 'DE987654321'
  const identity = `${data.documentNumber} ${data.bankAccount} ${data.issuer.vatId} ${data.recipient.vatId}`
  for (const amount of ['1234.56', '1234,56', '1,234.56', '1.234,56']) {
    assert.deepEqual(compareInvoiceText(data, `${identity}\nTotal EUR ${amount}`), [])
  }
  const before = JSON.stringify(data)
  const codes = compareInvoiceText(
    data,
    'A different supplier, invoice and bank account. EUR 11234.56',
  ).map((issue) => issue.code)
  assert.ok(codes.includes('pdfNumberMismatch'))
  assert.ok(codes.includes('pdfBankMismatch'))
  assert.ok(codes.includes('pdfVatMismatch'))
  assert.ok(codes.includes('pdfBuyerVatMismatch'))
  assert.ok(codes.includes('pdfTotalMismatch'))
  assert.equal(JSON.stringify(data), before)
  assert.deepEqual(compareInvoiceText(data, ' \n '), [
    { code: 'pdfTextUnavailable', message: 'pdfTextUnavailable' },
  ])
  data.bankAccount = ''
  assert.ok(!compareInvoiceText(data, 'Invoice').some((issue) => issue.code === 'pdfBankMismatch'))
})
