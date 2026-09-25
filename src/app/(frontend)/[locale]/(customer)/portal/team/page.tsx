import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { WorkspaceForm } from '@/components/customer-auth/workspace-form'
import { TeamPanel } from '@/components/customer-auth/team-panel'
import { teamSnapshot } from '@/lib/customer-auth/team'

export default async function TeamPage() {
  const locale = await getLocale()
  const t = await getTranslations('Auth')
  const { session, organization } = await getCustomerWorkspace(locale)
  const membership = organization?.members.find((member) => member.userId === session.user.id)
  if (!organization || !membership)
    return (
      <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <p className="mb-6 text-muted-foreground">{t('workspaceIntro')}</p>
        <WorkspaceForm />
      </section>
    )
  const data = await teamSnapshot({
    userId: session.user.id,
    organizationId: organization.id,
    role: membership.role,
  })
  return (
    <TeamPanel
      key={organization.id}
      initial={data}
      organizationId={organization.id}
      userId={session.user.id}
    />
  )
}
