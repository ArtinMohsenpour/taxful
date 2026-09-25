import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerSession } from '@/lib/customer-auth/session'
import { AcceptInvitation, InvitationAccountSwitch } from '@/components/customer-auth/invitations'
import { Link } from '@/i18n/navigation'
import { invitationDetails, invitationPreview } from '@/lib/customer-auth/team'

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
  const preview = id ? await invitationPreview(id) : null
  const returnPath = `/${locale}/accept-invitation?id=${encodeURIComponent(id || '')}`
  const next = encodeURIComponent(returnPath)
  return (
    <section className="mx-auto max-w-md rounded-[1.75rem] border border-border bg-surface p-8 shadow-nav">
      <h1 className="mb-5 text-3xl font-medium tracking-tight">{t('invitationTitle')}</h1>
      {!id || !preview?.valid ? (
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
          <InvitationAccountSwitch
            next={returnPath}
            maskedEmail={preview.maskedEmail}
            accountExists={preview.accountExists}
          />
        )
      ) : (
        <>
          <p className="mb-5 text-muted-foreground">
            {team(preview.accountExists ? 'existingAccountIntro' : 'newAccountIntro', {
              email: preview.maskedEmail,
            })}
          </p>
          <Link
            href={`/${preview.accountExists ? 'login' : 'signup'}?next=${next}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            {team(preview.accountExists ? 'signInInvitedAccount' : 'createInvitedAccount')}
          </Link>
        </>
      )}
    </section>
  )
}
