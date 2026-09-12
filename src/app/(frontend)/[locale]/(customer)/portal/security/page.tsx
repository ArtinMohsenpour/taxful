import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { auth } from '@/lib/customer-auth/auth'
import { requireCustomer } from '@/lib/customer-auth/session'
import { ChangePasswordForm } from '@/components/customer-auth/profile-form'
import { Link } from '@/i18n/navigation'
import { revokeDevice } from './actions'

export default async function SecurityPage() {
  const locale = await getLocale()
  const t = await getTranslations('Auth')
  const current = await requireCustomer(locale)
  const sessions = await auth.api.listSessions({ headers: await headers() })
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/portal" className="text-sm text-brand-ink underline">
        {t('portal')}
      </Link>
      <h1 className="mt-5 mb-8 text-4xl font-medium tracking-tight">{t('security')}</h1>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="mb-6 text-xl font-semibold">{t('changePassword')}</h2>
          <ChangePasswordForm />
        </section>
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold">{t('sessions')}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{t('sessionsHint')}</p>
          <ul className="mt-5 divide-y divide-border">
            {sessions.map((session) => (
              <li key={session.id} className="py-4">
                <p className="text-xs break-words text-muted-foreground">
                  {session.userAgent || t('unknownDevice')}
                </p>
                {session.id === current.session.id ? (
                  <p className="mt-2 text-sm font-semibold text-brand-ink">{t('currentSession')}</p>
                ) : (
                  <form action={revokeDevice}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <button className="mt-3 text-sm text-brand-ink underline">{t('revoke')}</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
