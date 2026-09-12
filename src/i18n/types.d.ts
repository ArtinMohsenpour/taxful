import type messages from '../../messages/de.json'
import type { customerMessages } from '../../messages/customer'
import type { routing } from './routing'

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof messages & { Auth: typeof customerMessages.en }
  }
}
