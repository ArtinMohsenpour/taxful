import Decimal from 'decimal.js'
import type { DocumentRecord } from './schema'

// Final invoices disclose the net/VAT amounts already received, not just BT-113.
// These are user-reviewed payment records, never inferred from earlier invoice totals.
export function invoiceNote(data: DocumentRecord) {
  const headings = {
    standard: '',
    credit_note: 'Kaufmännische Gutschrift / Credit note',
    correction: 'Berichtigte Rechnung / Corrected invoice',
    partial: 'Teilrechnung / Partial invoice',
    prepayment: 'Vorauszahlungsrechnung / Advance-payment invoice',
    final: 'Schlussrechnung / Final invoice',
  }
  const notes = [headings[data.invoiceKind || 'standard'], data.invoiceNote || ''].filter(Boolean)
  if (data.invoiceKind === 'final' && data.advancePayments?.length) {
    notes.push(
      'Absetzung vereinnahmter Teilentgelte / Deduction of advance payments: Anlage / attachment payments.csv.',
    )
    for (const payment of data.advancePayments)
      notes.push(
        `${payment.invoiceNumber} (${payment.paymentDate}): Netto / net ${new Decimal(payment.netAmount).toFixed(2)}, USt. / VAT ${new Decimal(payment.taxAmount).toFixed(2)}, Brutto / gross ${new Decimal(payment.grossAmount).toFixed(2)} ${data.currency}.`,
      )
    const net = data.advancePayments.reduce((sum, p) => sum.plus(p.netAmount), new Decimal(0))
    const tax = data.advancePayments.reduce((sum, p) => sum.plus(p.taxAmount), new Decimal(0))
    notes.push(
      `Rest / balance: Netto / net ${new Decimal(data.netAmount).minus(net).toFixed(2)}, USt. / VAT ${new Decimal(data.taxAmount).minus(tax).toFixed(2)}, Brutto / gross ${new Decimal(data.grossAmount).minus(data.prepaidAmount || '0').toFixed(2)} ${data.currency}.`,
    )
  }
  return notes.join('\n')
}
export function paymentAttachment(data: DocumentRecord) {
  if (data.invoiceKind !== 'final' || !data.advancePayments?.length) return null
  const cell = (value: string) =>
    `"${(/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`
  return Buffer.from(
    [
      ['Invoice', 'Payment date', 'Net', 'VAT', 'Gross', 'Currency'],
      ...data.advancePayments.map((p) => [
        p.invoiceNumber,
        p.paymentDate,
        p.netAmount,
        p.taxAmount,
        p.grossAmount,
        data.currency,
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n'),
    'utf8',
  ).toString('base64')
}
