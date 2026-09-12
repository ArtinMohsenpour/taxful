import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { Link } from '@/i18n/navigation'
import { WorkspaceForm, WorkspaceSwitcher } from '@/components/customer-auth/workspace-form'
import { ProfileForm, LogoutButton } from '@/components/customer-auth/profile-form'
import { InviteForm, CancelInvitation } from '@/components/customer-auth/invitations'

export default async function PortalPage() {
  const locale = await getLocale()
  const t = await getTranslations('Auth')
  const { session, organizations, organization } = await getCustomerWorkspace(locale)
  const membership = organization?.members.find((member) => member.userId === session.user.id)
  const canInvite = membership?.role === 'owner' || membership?.role === 'admin'
  const roleLabel = (role: string) =>
    t(
      (['owner', 'admin', 'member', 'reviewer'].includes(role) ? role : 'member') as
        'owner' | 'admin' | 'member' | 'reviewer',
    )
  const card = 'rounded-[1.75rem] border border-border bg-surface p-6 shadow-nav sm:p-8'
  return (
    <div>
      <div className="mb-10 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-3 text-sm font-medium text-brand-ink">{t('portal')}</p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            {t('dashboardTitle', { name: session.user.name })}
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">{t('dashboardIntro')}</p>
        </div>
        <LogoutButton />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className={card}>
            <h2 className="mb-5 text-xl font-semibold">{organization?.name || t('workspace')}</h2>
            {organization ? (
              <>
                <WorkspaceSwitcher organizations={organizations} activeId={organization.id} />
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('role')}: {roleLabel(membership?.role || 'member')}
                </p>
              </>
            ) : (
              <>
                <p className="mb-6 leading-relaxed text-muted-foreground">{t('workspaceIntro')}</p>
                <WorkspaceForm />
              </>
            )}
          </section>
          {organization && (
            <section className="rounded-[1.75rem] border border-primary/20 bg-primary/10 p-8">
              <h2 className="text-xl font-semibold">{t('comingTitle')}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{t('comingText')}</p>
            </section>
          )}
          {organization && (
            <section className={card}>
              <h2 className="mb-5 text-xl font-semibold">{t('team')}</h2>
              <ul className="divide-y divide-border">
                {organization.members.map((member) => (
                  <li key={member.id} className="flex flex-wrap justify-between gap-2 py-3">
                    <span className="min-w-0">
                      <span className="block font-medium">{member.user.name}</span>
                      <span className="text-sm break-all text-muted-foreground">
                        {member.user.email}
                      </span>
                    </span>
                    <span className="text-sm text-brand-ink">{roleLabel(member.role)}</span>
                  </li>
                ))}
              </ul>
              {canInvite && (
                <div className="mt-6 border-t border-border pt-6">
                  <h3 className="mb-4 font-semibold">{t('invite')}</h3>
                  <InviteForm
                    organizationId={organization.id}
                    owner={membership?.role === 'owner'}
                  />
                  {organization.invitations.some(
                    (invitation) => invitation.status === 'pending',
                  ) && (
                    <div className="mt-6">
                      <h3 className="font-semibold">{t('pendingInvitations')}</h3>
                      <ul>
                        {organization.invitations
                          .filter((invitation) => invitation.status === 'pending')
                          .map((invitation) => (
                            <li
                              className="mt-3 flex flex-wrap justify-between gap-2 text-sm"
                              key={invitation.id}
                            >
                              <span className="break-all">{invitation.email}</span>
                              <CancelInvitation invitationId={invitation.id} />
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
        <section className={card}>
          <h2 className="mb-5 text-xl font-semibold">{t('profile')}</h2>
          <ProfileForm name={session.user.name} email={session.user.email} />
          <Link
            href="/portal/security"
            className="mt-6 inline-block text-sm font-medium text-brand-ink underline underline-offset-4"
          >
            {t('security')}
          </Link>
        </section>
      </div>
    </div>
  )
}
