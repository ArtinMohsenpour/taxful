import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { WorkspaceForm } from '@/components/customer-auth/workspace-form'
import { InviteForm, CancelInvitation } from '@/components/customer-auth/invitations'

const card = 'rounded-3xl border border-border bg-surface p-6 sm:p-8'
const badge = 'rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-ink'

function initials(name: string, email: string, locale: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : [words[0] || email]
  return picked
    .map((word) => Array.from(word)[0])
    .join('')
    .toLocaleUpperCase(locale)
}

export default async function TeamPage() {
  const locale = await getLocale()
  const t = await getTranslations('Auth')
  const { session, organization } = await getCustomerWorkspace(locale)
  const membership = organization?.members.find((member) => member.userId === session.user.id)
  const canInvite = membership?.role === 'owner' || membership?.role === 'admin'
  const pending =
    organization?.invitations.filter((invitation) => invitation.status === 'pending') ?? []
  const roleLabel = (role: string | null) =>
    t(
      (['owner', 'admin', 'member', 'reviewer'].includes(role || '') ? role : 'member') as
        'owner' | 'admin' | 'member' | 'reviewer',
    )
  return (
    <div>
      <h1 className="mb-3 text-3xl font-medium tracking-tight">{t('team')}</h1>
      <p className="mb-8 text-muted-foreground">{t('teamIntro')}</p>
      {!organization ? (
        <section className={card}>
          <p className="mb-6 max-w-lg leading-relaxed text-muted-foreground">
            {t('workspaceIntro')}
          </p>
          <WorkspaceForm />
        </section>
      ) : (
        <div className="space-y-6">
          <section className={card} aria-labelledby="team-members">
            <h2 id="team-members" className="flex items-center gap-3 text-xl font-semibold">
              {t('members')}
              <span className={badge}>{organization.members.length}</span>
            </h2>
            <ul className="mt-6 divide-y divide-border">
              {organization.members.map((member) => (
                <li
                  key={member.id}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
                >
                  <span
                    aria-hidden="true"
                    className="row-span-2 flex size-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-brand-ink sm:row-span-1"
                  >
                    {initials(member.user.name, member.user.email, locale)}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium wrap-anywhere">{member.user.name}</span>
                      {member.userId === session.user.id && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          {t('you')}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm wrap-anywhere text-muted-foreground">
                      {member.user.email}
                    </span>
                  </span>
                  <span className={`justify-self-start sm:justify-self-end ${badge}`}>
                    {roleLabel(member.role)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {canInvite && (
            <section className={card} aria-labelledby="team-invite">
              <h2 id="team-invite" className="mb-6 text-xl font-semibold">
                {t('invite')}
              </h2>
              <InviteForm organizationId={organization.id} owner={membership?.role === 'owner'} />
              {pending.length > 0 && (
                <div className="mt-8 border-t border-border pt-6">
                  <h3 className="flex items-center gap-3 font-semibold">
                    {t('pendingInvitations')}
                    <span className={badge}>{pending.length}</span>
                  </h3>
                  <ul className="mt-4 divide-y divide-border">
                    {pending.map((invitation) => (
                      <li
                        key={invitation.id}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium wrap-anywhere">
                            {invitation.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {roleLabel(invitation.role)}
                          </span>
                        </span>
                        <CancelInvitation invitationId={invitation.id} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
