import type messages from '../../messages/de.json'
import type { customerMessages } from '../../messages/customer'
import type { documentMessages } from '../../messages/documents'
import type { invoiceMessages } from '../../messages/invoices'
import type { billingMessages } from '../../messages/billing'
import type { teamMessages } from '../../messages/team'
import type { routing } from './routing'

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof messages & {
      Auth: typeof customerMessages.en
      Documents: typeof documentMessages.en
      Invoices: typeof invoiceMessages.en
      Billing: typeof billingMessages.en
      Team: typeof teamMessages.en
    }
  }
}
