import nodemailer from 'nodemailer'
import { DocumentError } from '../documents/config'

export function localEmailEnabled() {
  try {
    const url = new URL(process.env.BETTER_AUTH_URL || '')
    return (
      process.env.INVOICE_EMAIL_MODE === 'mailpit' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
  } catch {
    return false
  }
}
export function requireLocalEmail() {
  if (!localEmailEnabled()) throw new DocumentError('emailUnavailable', 503)
}
export type InvoiceMessage = {
  id: string
  sender: string
  senderName: string
  recipient: string
  subject: string
  body: string
  bytes: Buffer
  pdf: boolean
}
export interface InvoiceEmailProvider {
  send(message: InvoiceMessage): Promise<{ id: string }>
}
// Intentionally fixed to the repository's loopback-only Mailpit. No SMTP host,
// credentials, URLs or attachment paths can be supplied by a customer.
export const mailpitProvider: InvoiceEmailProvider = {
  async send(message) {
    requireLocalEmail()
    const transport = nodemailer.createTransport({
      host: '127.0.0.1',
      port: 1026,
      secure: false,
      ignoreTLS: true,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
    })
    try {
      const result = await transport.sendMail({
        messageId: `<${message.id}@invoice.taxful.test>`,
        from: { name: message.senderName, address: message.sender },
        replyTo: message.sender,
        to: message.recipient,
        envelope: { from: message.sender, to: [message.recipient] },
        subject: message.subject,
        text: message.body,
        attachments: [
          {
            filename: message.pdf ? 'invoice.pdf' : 'invoice.xml',
            content: message.bytes,
            contentType: message.pdf ? 'application/pdf' : 'application/xml',
          },
        ],
      })
      if (result.accepted.length !== 1) throw new Error('Not accepted')
      return { id: result.messageId }
    } finally {
      transport.close()
    }
  },
}
