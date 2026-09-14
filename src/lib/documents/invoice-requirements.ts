import Decimal from 'decimal.js'
import { type DocumentRecord, validateRecord } from './schema'
import unitCodes from './unit-codes.json'
import { calculateInvoice } from './invoice-calculation'
const validUnits = new Set(unitCodes)

export function xrechnungRequirements(data: DocumentRecord) {
  return invoiceRequirements(data, 'xrechnung')
}
export function invoiceRequirements(
  data: DocumentRecord,
  format: 'xrechnung' | 'zugferd' = 'zugferd',
) {
  const missing = validateRecord(data).map((issue) => issue.field)
  if (data.documentType !== 'invoice') missing.push('documentType')
  for (const side of ['issuer', 'recipient'] as const) {
    for (const field of ['companyName', 'address', 'postalCode', 'city', 'country'] as const)
      if (!data[side][field].trim()) missing.push(side + '.' + field)
    if (!/^[A-Z]{2}$/.test(data[side].country)) missing.push(side + '.country')
    if (format === 'xrechnung' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[side].email))
      missing.push(side + '.email')
  }
  if (!data.issuer.vatId && !data.issuer.taxNumber) missing.push('issuer.vatId')
  if (format === 'xrechnung') {
    if (!data.issuer.name) missing.push('issuer.name')
    if (!data.issuer.phone) missing.push('issuer.phone')
    if (!data.buyerReference) missing.push('buyerReference')
  }
  if (!data.supplyDate) missing.push('supplyDate')
  if (!data.paymentTerms && !data.dueDate) missing.push('paymentTerms')
  if (!['10', '58'].includes(data.paymentMeansCode)) missing.push('paymentMeansCode')
  if (data.paymentMeansCode === '58' && !validIban(data.bankAccount)) missing.push('bankAccount')
  if (!data.lines.length) missing.push('lines')
  for (const [index, line] of data.lines.entries()) {
    if (!validUnits.has(line.unitCode)) missing.push('lines.' + index + '.unitCode')
    for (const field of ['quantity', 'unitPrice', 'netAmount', 'taxRate'] as const)
      if (!/^\d{1,15}(\.\d{1,6})?$/.test(line[field])) missing.push('lines.' + index + '.' + field)
    if (
      /^\d+(\.\d+)?$/.test(line.taxRate) &&
      (new Decimal(line.taxRate).lte(0) || new Decimal(line.taxRate).gt(100))
    )
      missing.push('lines.' + index + '.taxRate')
    if (/^\d+(\.\d+)?$/.test(line.quantity) && new Decimal(line.quantity).lte(0))
      missing.push('lines.' + index + '.quantity')
  }
  // Initial profile handles standard positive invoices, without allowances or prepayments.
  for (const field of ['netAmount', 'taxAmount', 'grossAmount'] as const)
    if (data[field].startsWith('-')) missing.push(field)
  const calculated = calculateInvoice(data)
  if (calculated) {
    for (const [field, expected] of [
      ['netAmount', calculated.net],
      ['taxAmount', calculated.tax],
      ['grossAmount', calculated.gross],
    ] as const)
      if (/^\d+(\.\d+)?$/.test(data[field]) && !new Decimal(data[field]).equals(expected))
        missing.push(field)
    for (const index of calculated.invalidLines) missing.push('lines.' + index + '.netAmount')
  }
  return [...new Set(missing)]
}
export function validIban(value: string) {
  const iban = value.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (char) =>
    String(char.charCodeAt(0) - 55),
  )
  return BigInt(digits) % 97n === 1n
}
