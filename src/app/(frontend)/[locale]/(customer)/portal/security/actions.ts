'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { auth } from '@/lib/customer-auth/auth'
import { requireCustomer } from '@/lib/customer-auth/session'

export async function revokeDevice(form: FormData) {
  const locale = await getLocale()
  const current = await requireCustomer(locale)
  const requestHeaders = await headers()
  const sessions = await auth.api.listSessions({ headers: requestHeaders })
  const target = sessions.find(
    (session) => session.id === form.get('sessionId') && session.id !== current.session.id,
  )
  if (target)
    await auth.api.revokeSession({ headers: requestHeaders, body: { token: target.token } })
  revalidatePath(`/${locale}/portal/security`)
}
