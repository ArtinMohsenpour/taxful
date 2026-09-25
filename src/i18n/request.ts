import * as rootParams from 'next/root-params'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import { customerMessages } from '../../messages/customer'
import { documentMessages } from '../../messages/documents'
import { invoiceMessages } from '../../messages/invoices'
import { billingMessages } from '../../messages/billing'
import { teamMessages } from '../../messages/team'

const messages = {
  de: () => import('../../messages/de.json').then((module) => module.default),
  en: () => import('../../messages/en.json').then((module) => module.default),
}

export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await rootParams.locale())
  if (!hasLocale(routing.locales, requestedLocale)) notFound()

  return {
    locale: requestedLocale,
    messages: {
      ...(await messages[requestedLocale]()),
      Auth: customerMessages[requestedLocale],
      Documents: documentMessages[requestedLocale],
      Invoices: invoiceMessages[requestedLocale],
      Billing: billingMessages[requestedLocale],
      Team: teamMessages[requestedLocale],
    },
    timeZone: 'Europe/Berlin',
  }
})
