import * as rootParams from 'next/root-params'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import { customerMessages } from '../../messages/customer'

const messages = {
  de: () => import('../../messages/de.json').then((module) => module.default),
  en: () => import('../../messages/en.json').then((module) => module.default),
}

export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await rootParams.locale())
  if (!hasLocale(routing.locales, requestedLocale)) notFound()

  return {
    locale: requestedLocale,
    messages: { ...(await messages[requestedLocale]()), Auth: customerMessages[requestedLocale] },
    timeZone: 'Europe/Berlin',
  }
})
