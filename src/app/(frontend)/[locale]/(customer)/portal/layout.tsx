import type { ReactNode } from 'react'
import { getLocale } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { PortalSidebar } from '@/components/customer-auth/portal-sidebar'

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { session, organizations, organization } = await getCustomerWorkspace(await getLocale())
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
      <PortalSidebar
        organizations={organizations.map(({ id, name }) => ({ id, name }))}
        activeId={organization?.id}
        name={session.user.name}
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
