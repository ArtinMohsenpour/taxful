import { z } from 'zod'
import { companyProfileSchema } from '../documents/company-profile-schema'
import unitCodes from '../documents/unit-codes.json'
import { invoiceKindSchema, taxCategorySchema } from '../documents/invoice-types'

export const customerSchema = companyProfileSchema
export const productSchema = z
  .object({
    description: z.string().trim().min(1).max(1000),
    unitCode: z.string().refine((value) => unitCodes.includes(value)),
    unitPrice: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
    taxRate: z.enum(['19', '7', '0']),
    taxCategory: taxCategorySchema.optional(),
    currency: z.literal('EUR'),
  })
  .strict()
  .refine(
    (value) => ((value.taxCategory || 'S') === 'S' ? value.taxRate !== '0' : value.taxRate === '0'),
    { path: ['taxRate'] },
  )
export type InvoiceCustomer = z.infer<typeof customerSchema>
export type InvoiceProduct = z.infer<typeof productSchema>
export type DirectoryEntry<T> = { id: string; data: T; revision: number; archived: boolean }
export const draftSchema = z
  .object({
    requestKey: z.uuid(),
    organizationId: z.string().min(1),
    customerId: z.uuid().optional(),
    invoiceKind: invoiceKindSchema.optional(),
    sourceInvoiceId: z.uuid().optional(),
    productIds: z.array(z.uuid()).max(50).default([]),
  })
  .strict()
