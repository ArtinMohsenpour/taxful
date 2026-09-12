import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { WorkspaceForm } from '@/components/customer-auth/workspace-form'
import { InviteForm, CancelInvitation } from '@/components/customer-auth/invitations'

export default async function TeamPage() {
  const t = await getTranslations('Auth')
  const { session, organization } = await getCustomerWorkspace(await getLocale())
  const membership = organization?.members.find((member) => member.userId === session.user.id)
  const canInvite = membership?.role === 'owner' || membership?.role === 'admin'
  const roleLabel = (role: string) =>
    t(
      (['owner', 'admin', 'member', 'reviewer'].includes(role) ? role : 'member') as
        'owner' | 'admin' | 'member' | 'reviewer',
    )
  const card = 'rounded-3xl border border-border bg-surface p-6 sm:p-8'
  return (
    <div>
      <h1 className="mb-3 text-3xl font-medium tracking-tight">{t('team')}</h1>
      <p className="mb-8 text-muted-foreground">{t('teamIntro')}</p>
      {!organization && (
        <section className={card}>
          <p className="mb-6 text-muted-foreground">{t('workspaceIntro')}</p>
          <WorkspaceForm />
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
              <InviteForm organizationId={organization.id} owner={membership?.role === 'owner'} />
              {organization.invitations.some((invitation) => invitation.status === 'pending') && (
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
  )
}
