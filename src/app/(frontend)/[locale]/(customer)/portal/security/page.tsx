import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { auth } from '@/lib/customer-auth/auth'
import { requireCustomer } from '@/lib/customer-auth/session'
import { ChangePasswordForm } from '@/components/customer-auth/profile-form'
import { FreshSessionGuard } from '@/components/customer-auth/fresh-session-guard'
import { revokeDevice, revokeOtherDevices } from './actions'
import { isSessionNotFresh, sessionFreshness } from './freshness'

export default async function SecurityPage() {
  const locale = await getLocale()
  const t = await getTranslations('Auth')
  const current = await requireCustomer(locale)
  const freshness = await sessionFreshness(current.session.createdAt)
  let remainingMs = freshness.remainingMs
  let sessions: Awaited<ReturnType<typeof auth.api.listSessions>> = []
  if (remainingMs !== 0) {
    try {
      sessions = await auth.api.listSessions({ headers: await headers() })
    } catch (error) {
      if (!isSessionNotFresh(error)) throw error
      remainingMs = 0
    }
  }
  const date = (value: Date | string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    )
  const device = (userAgent?: string | null) => {
    if (!userAgent) return t('unknownDevice')
    const browser = /Edg\//.test(userAgent)
      ? 'Edge'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : t('unknownBrowser')
    const system = /iPhone|iPad/.test(userAgent)
      ? 'iOS / iPadOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Windows/.test(userAgent)
            ? 'Windows'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : t('unknownSystem')
    return `${browser} · ${system}`
  }
  const maskedIp = (ip?: string | null) => {
    if (!ip) return t('unknownLocation')
    if (ip === '::1' || ip === '127.0.0.1') return t('localDevice')
    if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + ':…'
    const parts = ip.split('.')
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.…` : ip
  }
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-8 text-3xl font-medium tracking-tight">{t('security')}</h1>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="mb-6 text-xl font-semibold">{t('changePassword')}</h2>
          <ChangePasswordForm />
        </section>
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold">{t('sessions')}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{t('sessionsHint')}</p>
          <FreshSessionGuard
            key={current.session.id}
            email={current.user.email}
            sessionId={current.session.id}
            activeOrganizationId={current.session.activeOrganizationId ?? null}
            remainingMs={remainingMs}
            minutes={freshness.minutes}
            rememberMe={freshness.rememberMe}
            revokeSession={revokeDevice}
          >
            {sessions.some((session) => session.id !== current.session.id) && (
              <form action={revokeOtherDevices} className="mt-5">
                <input type="hidden" name="locale" value={locale} />
                <button className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-accent">
                  {t('revokeOthers')}
                </button>
              </form>
            )}
            <ul className="mt-5 divide-y divide-border">
              {sessions.map((session) => (
                <li key={session.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold">{device(session.userAgent)}</p>
                    {session.id === current.session.id && (
                      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-brand-ink">
                        {t('currentSession')}
                      </span>
                    )}
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-foreground">{t('lastActive')}</dt>
                      <dd>{date(session.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">{t('signedInAt')}</dt>
                      <dd>{date(session.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">{t('network')}</dt>
                      <dd>{maskedIp(session.ipAddress)}</dd>
                    </div>
                  </dl>
                  {session.id === current.session.id ? (
                    <p className="mt-3 text-xs text-muted-foreground">{t('currentSessionHint')}</p>
                  ) : (
                    <form action={revokeDevice}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="sessionId" value={session.id} />
                      <button className="mt-3 text-sm text-brand-ink underline">
                        {t('revoke')}
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </FreshSessionGuard>
        </section>
      </div>
    </div>
  )
}
