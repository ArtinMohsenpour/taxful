import { z } from 'zod'
import type { EmailContent } from './schema'

export const emailBlocks = [
  'message',
  'person',
  'logo',
  'divider',
  'company',
  'contact',
  'custom',
] as const
export type EmailBlock = (typeof emailBlocks)[number]
const field = z
  .string()
  .max(200)
  .refine((v) => !/[\x00-\x1f\x7f]/.test(v))
export const visualEmailSchema = z
  .object({
    message: z.string().min(1).max(6000),
    name: field,
    position: field,
    pronouns: field,
    company: field,
    address: z.string().max(1000),
    phone: field,
    mobile: field,
    custom: z.string().max(1000),
    divider: z.boolean(),
    logoWidth: z.union([z.literal(120), z.literal(180), z.literal(240)]),
    order: z
      .array(z.enum(emailBlocks))
      .length(emailBlocks.length)
      .refine((v) => new Set(v).size === emailBlocks.length),
  })
  .strict()
export type VisualEmail = z.infer<typeof visualEmailSchema>
export const escapeEmailHtml = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
export function visualDefaults(locale: 'de' | 'en'): VisualEmail {
  return {
    message:
      locale === 'de'
        ? 'Guten Tag,\n\nanbei erhalten Sie die Rechnung {{invoiceNumber}} von {{companyName}}.\n\nMit freundlichen Grüßen'
        : 'Hello,\n\nPlease find attached invoice {{invoiceNumber}} from {{companyName}}.\n\nKind regards',
    name: '',
    position: '',
    pronouns: '',
    company: '{{companyName}}',
    address: '',
    phone: '',
    mobile: '',
    custom: '',
    divider: true,
    logoWidth: 180,
    order: [...emailBlocks],
  }
}
export function renderVisualEmail(design: VisualEmail, logoId: string | null) {
  const lines = (s: string) => escapeEmailHtml(s).replaceAll('\n', '<br />')
  const paragraph = (s: string) => (s ? `<p style="margin:0px;line-height:1.5">${s}</p>` : '')
  const contact = [
    design.address,
    design.phone ? `T ${design.phone}` : '',
    design.mobile ? `M ${design.mobile}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const text: Record<EmailBlock, string> = {
    message: design.message,
    person: [design.name, design.position, design.pronouns].filter(Boolean).join('\n'),
    logo: '',
    divider: design.divider ? '________________________________' : '',
    company: design.company,
    contact,
    custom: design.custom,
  }
  const html: Record<EmailBlock, string> = {
    message: design.message
      .split('\n\n')
      .map((v) => paragraph(lines(v)))
      .join('<br />'),
    person: paragraph(
      [
        design.name ? `<strong>${lines(design.name)}</strong>` : '',
        lines(design.position),
        design.pronouns ? `<em>${lines(design.pronouns)}</em>` : '',
      ]
        .filter(Boolean)
        .join('<br />'),
    ),
    logo: logoId
      ? `<img src="cid:company-logo" alt="${escapeEmailHtml(design.company || 'Logo')}" width="${design.logoWidth}" />`
      : '',
    divider: design.divider ? '<hr />' : '',
    company: design.company ? paragraph(`<strong>${lines(design.company)}</strong>`) : '',
    contact: paragraph(lines(contact)),
    custom: paragraph(lines(design.custom)),
  }
  return {
    body: design.order
      .map((key) => text[key])
      .filter(Boolean)
      .join('\n\n'),
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;max-width:600px;padding:16px">${design.order.map((key) => (html[key] ? `<div style="margin:0px 0px 16px">${html[key]}</div>` : '')).join('')}</div>`,
  }
}
export function withVisualDesign(content: EmailContent, design: VisualEmail): EmailContent {
  return { ...content, ...renderVisualEmail(design, content.logoId), design }
}
export function emailDefaults(locale: 'de' | 'en'): EmailContent {
  const design = visualDefaults(locale)
  return {
    subject: `${locale === 'de' ? 'Rechnung' : 'Invoice'} {{invoiceNumber}} · {{companyName}}`,
    ...renderVisualEmail(design, null),
    logoId: null,
    design,
  }
}
export function resolveEmailContent(
  content: EmailContent,
  number: string,
  company: string,
): EmailContent {
  const values: Record<string, string> = { invoiceNumber: number, companyName: company }
  const resolve = (s: string, html = false) =>
    s.replace(/\{\{(invoiceNumber|companyName)\}\}/g, (_match, key: string) =>
      html ? escapeEmailHtml(values[key]) : values[key],
    )
  const rendered = content.design ? renderVisualEmail(content.design, content.logoId) : content
  // Send the resolved render, not editable template metadata.
  return {
    subject: resolve(content.subject),
    body: resolve(rendered.body),
    html: resolve(rendered.html, true),
    logoId: content.logoId,
  }
}
