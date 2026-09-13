import { z } from 'zod'
import Decimal from 'decimal.js'

const text = z.string().max(1000)
const amount = z.string().max(30) // Keep uncertain OCR values editable until approval.
export const partySchema = z
  .object({
    name: text,
    companyName: text,
    taxId: text,
    taxNumber: text,
    vatId: text,
    address: text,
    postalCode: text,
    city: text,
    country: z.string().max(100),
    email: text,
    phone: text,
  })
  .strict()
export const recordSchema = z
  .object({
    documentType: z.enum(['invoice', 'receipt', 'tax_notice', 'other']),
    documentNumber: text,
    documentDate: z.string().max(30),
    currency: z.string().max(10),
    buyerReference: text,
    paymentTerms: text,
    paymentMeansCode: z.string().max(3),
    bankAccount: z.string().max(40),
    issuer: partySchema,
    recipient: partySchema,
    netAmount: amount,
    taxAmount: amount,
    grossAmount: amount,
    lines: z
      .array(
        z
          .object({
            description: text,
            quantity: amount,
            unitCode: z.string().max(10),
            unitPrice: amount,
            netAmount: amount,
            taxRate: amount,
          })
          .strict(),
      )
      .max(200),
    additionalFields: z
      .array(z.object({ label: z.string().max(150), value: text }).strict())
      .max(100),
  })
  .strict()
export const extractionSchema = z
  .object({
    data: recordSchema,
    evidence: z
      .array(
        z
          .object({
            field: z.string().max(180),
            page: z.number().int().min(1).max(50).nullable(),
            quote: z.string().max(500),
            confidence: z.enum(['low', 'medium', 'high']),
          })
          .strict(),
      )
      .max(1000),
    warnings: z.array(z.string().max(500)).max(30),
  })
  .strict()
export type DocumentRecord = z.infer<typeof recordSchema>
export type Evidence = z.infer<typeof extractionSchema>['evidence']
export const reviewSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    data: recordSchema,
    approve: z.boolean(),
    confirmations: z
      .object({
        identity: z.boolean(),
        dates: z.boolean(),
        amounts: z.boolean(),
        completeness: z.boolean(),
      })
      .strict(),
  })
  .strict()

export type ValidationIssue = {
  field: string
  code: 'required' | 'date' | 'amount' | 'currency' | 'taxId' | 'vatId' | 'totals' | 'lineTotal'
}
const decimalPattern = /^-?\d{1,15}(\.\d{1,6})?$/
export function validateRecord(data: DocumentRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const add = (field: string, code: ValidationIssue['code']) => issues.push({ field, code })
  if (!data.issuer.name.trim() && !data.issuer.companyName.trim())
    add('issuer.companyName', 'required')
  if (!data.documentDate) add('documentDate', 'required')
  else if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data.documentDate) ||
    Number.isNaN(Date.parse(data.documentDate)) ||
    new Date(data.documentDate).toISOString().slice(0, 10) !== data.documentDate
  )
    add('documentDate', 'date')
  for (const key of ['issuer', 'recipient'] as const) {
    if (data[key].taxId && !/^\d{11}$/.test(data[key].taxId)) add(key + '.taxId', 'taxId')
    if (data[key].vatId && !/^[A-Z]{2}[A-Z0-9]{2,14}$/.test(data[key].vatId.replace(/\s/g, '')))
      add(key + '.vatId', 'vatId')
  }
  const amounts = ['netAmount', 'taxAmount', 'grossAmount'] as const
  for (const field of amounts)
    if (data[field] && !decimalPattern.test(data[field])) add(field, 'amount')
  if (data.documentType === 'invoice' || data.documentType === 'receipt') {
    if (!data.documentNumber.trim()) add('documentNumber', 'required')
    for (const field of amounts) if (!data[field]) add(field, 'required')
    if (
      !data.recipient.name.trim() &&
      !data.recipient.companyName.trim() &&
      data.documentType === 'invoice'
    )
      add('recipient.companyName', 'required')
  }
  if (amounts.some((field) => data[field]) && !/^[A-Z]{3}$/.test(data.currency))
    add('currency', 'currency')
  if (
    amounts.every((field) => decimalPattern.test(data[field])) &&
    !new Decimal(data.netAmount)
      .plus(data.taxAmount)
      .toDecimalPlaces(2)
      .equals(new Decimal(data.grossAmount).toDecimalPlaces(2))
  )
    add('grossAmount', 'totals')
  data.lines.forEach((line, index) => {
    if (!line.description.trim()) add('lines.' + index + '.description', 'required')
    for (const field of ['quantity', 'unitPrice', 'netAmount', 'taxRate'] as const)
      if (line[field] && !decimalPattern.test(line[field]))
        add('lines.' + index + '.' + field, 'amount')
  })
  // Discounts and allowances may make line sums differ: show this as a review warning separately.
  return issues
}
export function reviewWarnings(data: DocumentRecord): string[] {
  const warnings: string[] = []
  if (
    data.lines.length &&
    data.lines.every((line) => decimalPattern.test(line.netAmount)) &&
    decimalPattern.test(data.netAmount)
  ) {
    const sum = data.lines.reduce((sum, line) => sum.plus(line.netAmount), new Decimal(0))
    if (!sum.toDecimalPlaces(2).equals(new Decimal(data.netAmount).toDecimalPlaces(2)))
      warnings.push('lineSum')
  }
  if (!data.issuer.taxId && !data.issuer.taxNumber && !data.issuer.vatId)
    warnings.push('noTaxIdentifier')
  return warnings
}
