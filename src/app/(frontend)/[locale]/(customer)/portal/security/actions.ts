'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { hasLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { auth } from '@/lib/customer-auth/auth'
import { requireCustomer } from '@/lib/customer-auth/session'
import { isSessionNotFresh } from './freshness'

export async function revokeDevice(form: FormData) {
  // Server actions can't read the route's locale, so the form sends it.
  const requested = form.get('locale')
  const locale =
    typeof requested === 'string' && hasLocale(routing.locales, requested)
      ? requested
      : routing.defaultLocale
  const current = await requireCustomer(locale)
  const requestHeaders = await headers()
  let sessions: Awaited<ReturnType<typeof auth.api.listSessions>> = []
  try {
    sessions = await auth.api.listSessions({ headers: requestHeaders })
  } catch (error) {
    // After revalidation the page asks the user to confirm their password.
    if (!isSessionNotFresh(error)) throw error
  }
  const target = sessions.find(
    (session) => session.id === form.get('sessionId') && session.id !== current.session.id,
  )
  if (target)
    await auth.api.revokeSession({ headers: requestHeaders, body: { token: target.token } })
  revalidatePath(`/${locale}/portal/security`)
}
