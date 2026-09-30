import { z } from 'zod'
import { visualEmailSchema } from './visual'

export const contentSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .regex(/^[^\r\n\x00-\x1f\x7f]+$/),
    body: z
      .string()
      .trim()
      .min(1)
      .max(20000)
      .refine((v) => !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)),
    html: z.string().max(60000),
    logoId: z.uuid().nullable(),
    design: visualEmailSchema.nullable().optional(),
  })
  .strict()
export type EmailContent = z.infer<typeof contentSchema>
export const templateSchema = z
  .object({
    organizationId: z.string().min(1),
    locale: z.enum(['de', 'en']),
    revision: z.number().int().nonnegative(),
    content: contentSchema,
  })
  .strict()

export const mailbox = z
  .string()
  .trim()
  .max(254)
  .email()
  .regex(/^[^\s<>;,\r\n]+@[^\s<>;,\r\n]+$/)
export const senderSchema = z
  .object({
    organizationId: z.string().min(1),
    sender: mailbox,
    senderName: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[^\r\n\x00-\x1f]+$/),
    revision: z.number().int().nonnegative(),
  })
  .strict()
export const deliverySchema = z
  .object({
    organizationId: z.string().min(1),
    documentId: z.uuid(),
    exportId: z.uuid(),
    requestKey: z.uuid(),
    recipient: mailbox,
    locale: z.enum(['de', 'en']),
    note: z
      .string()
      .trim()
      .max(2000)
      .refine((v) => !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)),
    senderRevision: z.number().int().positive(),
    acknowledgeRecipient: z.literal(true),
    previousDeliveryId: z.uuid().nullable(),
    acknowledgeResend: z.boolean().default(false),
    confirmedRecipientChange: z.string().max(254).default(''),
    content: contentSchema.optional(),
    previewHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict()

export function composeInvoiceEmail(
  locale: 'de' | 'en',
  number: string,
  company: string,
  note: string,
) {
  const label = number.replace(/[\r\n\x00-\x1f]/g, ' ').slice(0, 120)
  return {
    subject: `${locale === 'de' ? 'Rechnung' : 'Invoice'} ${label} · ${company}`,
    body:
      (locale === 'de'
        ? `Guten Tag,\n\nanbei erhalten Sie die Rechnung ${label} von ${company}.`
        : `Hello,\n\nPlease find attached invoice ${label} from ${company}.`) +
      (note ? `\n\n${note}` : '') +
      `\n\n${company}`,
  }
}
