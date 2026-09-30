import { z } from 'zod'

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
