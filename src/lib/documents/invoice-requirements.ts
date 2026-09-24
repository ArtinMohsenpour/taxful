import Decimal from 'decimal.js'
import { type DocumentRecord, validateRecord } from './schema'
import unitCodes from './unit-codes.json'
import { calculateInvoice } from './invoice-calculation'
import { numericAmount } from './invoice-calculation'
import type { InvoiceAdjustment } from './invoice-types'
import { z } from 'zod'
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
  if (!data.supplyDate && !(data.periodStart && data.periodEnd)) missing.push('supplyDate')
  for (const key of ['periodStart', 'periodEnd'] as const)
    if (data[key] && !z.iso.date().safeParse(data[key]).success) missing.push(key)
  if (data.periodStart && data.periodEnd && data.periodStart > data.periodEnd)
    missing.push('periodEnd')
  const kind = data.invoiceKind || 'standard'
  if (format === 'xrechnung' && kind === 'prepayment') missing.push('invoiceKind')
  if (['credit_note', 'correction', 'final'].includes(kind) && !data.precedingInvoices?.length)
    missing.push('precedingInvoices')
  if (['credit_note', 'correction'].includes(kind) && !data.invoiceNote?.trim())
    missing.push('invoiceNote')
  for (const [index, ref] of (data.precedingInvoices || []).entries()) {
    if (!ref.number.trim() || ref.number === data.documentNumber)
      missing.push(`precedingInvoices.${index}.number`)
    if (!z.iso.date().safeParse(ref.date).success || ref.date > data.documentDate)
      missing.push(`precedingInvoices.${index}.date`)
  }
  if (
    new Set(data.precedingInvoices?.map((ref) => ref.number)).size !==
    (data.precedingInvoices?.length || 0)
  )
    missing.push('precedingInvoices')
  if (data.advancePayments?.length && kind !== 'final') missing.push('advancePayments')
  if (kind === 'final') {
    if (
      numericAmount(data.prepaidAmount) &&
      new Decimal(data.prepaidAmount).gt(0) &&
      !data.advancePayments?.length
    )
      missing.push('advancePayments')
    let paid = new Decimal(0),
      paidNet = new Decimal(0),
      paidTax = new Decimal(0)
    for (const [index, payment] of (data.advancePayments || []).entries()) {
      const path = `advancePayments.${index}`
      if (
        !payment.invoiceNumber ||
        !data.precedingInvoices?.some((ref) => ref.number === payment.invoiceNumber)
      )
        missing.push(path + '.invoiceNumber')
      if (
        !z.iso.date().safeParse(payment.paymentDate).success ||
        payment.paymentDate > data.documentDate
      )
        missing.push(path + '.paymentDate')
      for (const field of ['netAmount', 'taxAmount', 'grossAmount'] as const)
        if (!numericAmount(payment[field]) || new Decimal(payment[field]).decimalPlaces() > 2)
          missing.push(path + '.' + field)
      if ([payment.netAmount, payment.taxAmount, payment.grossAmount].every(numericAmount)) {
        if (!new Decimal(payment.netAmount).plus(payment.taxAmount).eq(payment.grossAmount))
          missing.push(path + '.grossAmount')
        paid = paid.plus(payment.grossAmount)
        paidNet = paidNet.plus(payment.netAmount)
        paidTax = paidTax.plus(payment.taxAmount)
      }
    }
    if (
      data.advancePayments?.length &&
      (!numericAmount(data.prepaidAmount) || !paid.eq(data.prepaidAmount))
    )
      missing.push('prepaidAmount')
    if (numericAmount(data.netAmount) && paidNet.gt(data.netAmount)) missing.push('advancePayments')
    if (numericAmount(data.taxAmount) && paidTax.gt(data.taxAmount)) missing.push('advancePayments')
  }
  const checkTax = (category: string, rate: string, path: string) => {
    if (
      !numericAmount(rate) ||
      new Decimal(rate).gt(100) ||
      (category === 'S' ? new Decimal(rate).lte(0) : !new Decimal(rate).isZero())
    )
      missing.push(path + '.taxRate')
    if (category === 'E' && !data.taxExemptionReason?.trim()) missing.push('taxExemptionReason')
    if (category === 'AE') {
      if (!data.reverseChargeReason?.trim()) missing.push('reverseChargeReason')
      if (!data.recipient.vatId) missing.push('recipient.vatId')
    }
  }
  const checkAdjustments = (
    items: InvoiceAdjustment[] | undefined,
    path: string,
    document: boolean,
  ) => {
    for (const [i, item] of (items || []).entries()) {
      const prefix = `${path}.${i}`
      if (!item.reason.trim()) missing.push(prefix + '.reason')
      if (!numericAmount(item.amount) || new Decimal(item.amount).decimalPlaces() > 2)
        missing.push(prefix + '.amount')
      if (item.percentage || item.baseAmount) {
        if (!numericAmount(item.percentage) || new Decimal(item.percentage).gt(100))
          missing.push(prefix + '.percentage')
        if (!numericAmount(item.baseAmount) || new Decimal(item.baseAmount).decimalPlaces() > 2)
          missing.push(prefix + '.baseAmount')
        if (
          numericAmount(item.amount) &&
          numericAmount(item.percentage) &&
          numericAmount(item.baseAmount) &&
          !new Decimal(item.baseAmount)
            .times(item.percentage)
            .div(100)
            .toDecimalPlaces(2)
            .eq(item.amount)
        )
          missing.push(prefix + '.amount')
      }
      if (document) checkTax(item.taxCategory || 'S', item.taxRate || '', prefix)
    }
  }
  checkAdjustments(data.allowances, 'allowances', true)
  checkAdjustments(data.charges, 'charges', true)
  if (!data.paymentTerms && !data.dueDate) missing.push('paymentTerms')
  if (!['10', '58'].includes(data.paymentMeansCode)) missing.push('paymentMeansCode')
  if (data.paymentMeansCode === '58' && !validIban(data.bankAccount)) missing.push('bankAccount')
  if (!data.lines.length) missing.push('lines')
  for (const [index, line] of data.lines.entries()) {
    if (!validUnits.has(line.unitCode)) missing.push('lines.' + index + '.unitCode')
    for (const field of ['quantity', 'unitPrice', 'netAmount', 'taxRate'] as const)
      if (!/^\d{1,15}(\.\d{1,6})?$/.test(line[field])) missing.push('lines.' + index + '.' + field)
    checkTax(line.taxCategory || 'S', line.taxRate, 'lines.' + index)
    checkAdjustments(line.allowances, `lines.${index}.allowances`, false)
    checkAdjustments(line.charges, `lines.${index}.charges`, false)
    if (
      line.priceBaseQuantity &&
      (!numericAmount(line.priceBaseQuantity) || new Decimal(line.priceBaseQuantity).lte(0))
    )
      missing.push(`lines.${index}.priceBaseQuantity`)
    if (/^\d+(\.\d+)?$/.test(line.quantity) && new Decimal(line.quantity).lte(0))
      missing.push('lines.' + index + '.quantity')
  }
  // Credit notes use positive amounts and an explicit credit-note document type.
  for (const field of ['netAmount', 'taxAmount', 'grossAmount'] as const)
    if (data[field].startsWith('-')) missing.push(field)
  const calculated = calculateInvoice(data)
  if (calculated) {
    if (calculated.breakdown.some((group) => new Decimal(group.net).lt(0)))
      missing.push('allowances')
    if (new Decimal(calculated.payable).lt(0)) missing.push('prepaidAmount')
    for (const [field, expected] of [
      ['netAmount', calculated.net],
      ['taxAmount', calculated.tax],
      ['grossAmount', calculated.gross],
    ] as const)
      if (/^\d+(\.\d+)?$/.test(data[field]) && !new Decimal(data[field]).equals(expected))
        missing.push(field)
    for (const index of calculated.invalidLines) missing.push('lines.' + index + '.netAmount')
  }
  if (
    data.prepaidAmount &&
    (!numericAmount(data.prepaidAmount) ||
      new Decimal(data.prepaidAmount).decimalPlaces() > 2 ||
      (kind === 'credit_note' && !new Decimal(data.prepaidAmount).isZero()))
  )
    missing.push('prepaidAmount')
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
