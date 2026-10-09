import type { ReactNode } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { PortalSidebar } from '@/components/customer-auth/portal-sidebar'
import { SessionTimeout } from '@/components/customer-auth/session-timeout'
import { Link } from '@/i18n/navigation'
import { hasPermission } from '@/lib/customer-auth/permissions'

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { session, organizations, organization } = await getCustomerWorkspace(await getLocale())
  const t = await getTranslations('Security')
  const role = organization?.members.find((member) => member.userId === session.user.id)?.role || ''
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
      <PortalSidebar
        organizations={organizations.map(({ id, name }) => ({ id, name }))}
        activeId={organization?.id}
        name={session.user.name}
        billingOwner={hasPermission(
          organization?.members.find((member) => member.userId === session.user.id)?.role || '',
          'billing',
        )}
      />
      <div className="min-w-0">
        {hasPermission(role, 'approve') && !session.user.twoFactorEnabled && (
          <div className="mb-6 rounded-2xl border border-border bg-surface p-4 text-sm">
            <p>{t('requiredForDocuments')}</p>
            <Link
              href="/portal/security"
              className="mt-2 inline-block font-semibold text-brand-ink underline"
            >
              {t('setupRequiredMfa')}
            </Link>
          </div>
        )}
        {children}
      </div>
      <SessionTimeout />
    </div>
  )
}
