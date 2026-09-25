import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { AcceptInvitation } from '@/components/customer-auth/invitations'
import { Link } from '@/i18n/navigation'
import { invitationDetails } from '@/lib/customer-auth/team'

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const locale = await getLocale()
  const t = await getTranslations('Auth')
  const session = await getCustomerSession()
  const team = await getTranslations('Team')
  const invitation =
    session?.user.emailVerified && id ? await invitationDetails(session.user.id, id) : null
  const next = encodeURIComponent(`/${locale}/accept-invitation?id=${encodeURIComponent(id || '')}`)
  return (
    <section className="mx-auto max-w-md rounded-[1.75rem] border border-border bg-surface p-8 shadow-nav">
      <h1 className="mb-5 text-3xl font-medium tracking-tight">{t('invitationTitle')}</h1>
      {!id ? (
        <p role="alert">{t('invitationInvalid')}</p>
      ) : session && session.user.emailVerified ? (
        invitation ? (
          <>
            <p className="mb-2 text-xl font-semibold">{invitation.name}</p>
            <p className="mb-6 text-sm text-muted-foreground">
              {team(invitation.role)} ·{' '}
              {team('expires', {
                date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                  invitation.expiresAt,
                ),
              })}
            </p>
            <AcceptInvitation invitationId={id} />
          </>
        ) : (
          <p role="alert">{team('invitationInvalid')}</p>
        )
      ) : (
        <>
          <p className="mb-5 text-muted-foreground">{t('inviteLogin')}</p>
          <Link href={`/login?next=${next}`} className="font-semibold text-brand-ink underline">
            {t('login')}
          </Link>
          <span className="mx-3">·</span>
          <Link href={`/signup?next=${next}`} className="font-semibold text-brand-ink underline">
            {t('signup')}
          </Link>
        </>
      )}
    </section>
  )
}
