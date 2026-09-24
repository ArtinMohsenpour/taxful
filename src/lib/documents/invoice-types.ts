import { z } from 'zod'

export const invoiceKinds = [
  'standard',
  'credit_note',
  'correction',
  'partial',
  'prepayment',
  'final',
] as const
export const invoiceKindSchema = z.enum(invoiceKinds)
export const taxCategories = ['S', 'Z', 'E', 'AE'] as const
export const taxCategorySchema = z.enum(taxCategories)
export const invoiceTypeCodes = {
  standard: '380',
  credit_note: '381',
  correction: '384',
  partial: '326',
  prepayment: '386',
  final: '380',
} as const
export const adjustmentSchema = z
  .object({
    amount: z.string().max(30),
    reason: z.string().max(1000),
    baseAmount: z.string().max(30).optional(),
    percentage: z.string().max(30).optional(),
    taxCategory: taxCategorySchema.optional(),
    taxRate: z.string().max(30).optional(),
  })
  .strict()
export type InvoiceAdjustment = z.infer<typeof adjustmentSchema>
export const precedingInvoiceSchema = z
  .object({
    number: z.string().max(1000),
    date: z.string().max(30),
  })
  .strict()
export function kindFromCode(code: string): z.infer<typeof invoiceKindSchema> | null {
  return (
    (
      {
        '380': 'standard',
        '381': 'credit_note',
        '384': 'correction',
        '326': 'partial',
        '386': 'prepayment',
      } as const
    )[code as '380'] || null
  )
}
