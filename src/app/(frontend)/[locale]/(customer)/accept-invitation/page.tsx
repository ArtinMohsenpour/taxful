import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { AcceptInvitation } from '@/components/customer-auth/invitations'
import { Link } from '@/i18n/navigation'

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const locale = await getLocale()
  const t = await getTranslations('Auth')
  const session = await getCustomerSession()
  const next = encodeURIComponent(`/${locale}/accept-invitation?id=${encodeURIComponent(id || '')}`)
  return (
    <section className="mx-auto max-w-md rounded-[1.75rem] border border-border bg-surface p-8 shadow-nav">
      <h1 className="mb-5 text-3xl font-medium tracking-tight">{t('invitationTitle')}</h1>
      {!id ? (
        <p role="alert">{t('invitationInvalid')}</p>
      ) : session && session.user.emailVerified ? (
        <AcceptInvitation invitationId={id} />
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
