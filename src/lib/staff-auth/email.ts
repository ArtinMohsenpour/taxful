import type { EmailAdapter } from 'payload'
import { securityMailTransport } from '../customer-auth/email'
import { reserveCustomerEmail } from '../customer-auth/email-limits'

// Never let Payload's console adapter expose reset URLs in application logs.
export const staffEmailAdapter: EmailAdapter = () => ({
  name: 'taxful-security-smtp',
  defaultFromAddress: process.env.CUSTOMER_EMAIL_FROM || 'unconfigured@invalid.test',
  defaultFromName: 'Taxful',
  async sendEmail(message) {
    const from = process.env.CUSTOMER_EMAIL_FROM
    if (!from) throw new Error('Staff email delivery is not configured')
    const recipients = Array.isArray(message.to) ? message.to : [message.to]
    for (const recipient of recipients) {
      const email =
        typeof recipient === 'string'
          ? recipient
          : recipient && 'address' in recipient
            ? recipient.address
            : undefined
      if (!email || !(await reserveCustomerEmail(email, 'reset'))) return
    }
    return securityMailTransport().sendMail({ ...message, from })
  },
})
