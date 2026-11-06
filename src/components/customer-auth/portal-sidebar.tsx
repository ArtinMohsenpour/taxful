'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { WorkspaceSwitcher } from './workspace-form'
import { LogoutButton } from './profile-form'
import { Icon, type IconName } from './icon'
import { useSidebarPosition } from './use-sidebar-position'
import styles from './portal-sidebar.module.css'

export function PortalSidebar({
  organizations,
  activeId,
  name,
  billingOwner = false,
}: {
  organizations: { id: string; name: string }[]
  activeId?: string
  name: string
  billingOwner?: boolean
}) {
  const t = useTranslations('Auth')
  const invoices = useTranslations('Invoices')
  const billing = useTranslations('Billing')
  const pathname = usePathname()
  const sidebar = useSidebarPosition()
  const [open, setOpen] = useState(false)
  const links: {
    href: string
    label: 'overview' | 'converter' | 'files' | 'team' | 'profile' | 'security'
    icon: IconName
    invoiceLabel?: 'new' | 'incoming' | 'outgoing' | 'customers' | 'products'
  }[] = [
    { href: '/portal', label: 'overview', icon: 'overview' },
    { href: '/portal/invoices/new', label: 'converter', icon: 'converter', invoiceLabel: 'new' },
    {
      href: '/portal/invoices/outgoing',
      label: 'files',
      icon: 'outgoing-invoices',
      invoiceLabel: 'outgoing',
    },
    {
      href: '/portal/invoices/incoming',
      label: 'files',
      icon: 'incoming-invoices',
      invoiceLabel: 'incoming',
    },
    { href: '/portal/invoices/customers', label: 'team', icon: 'team', invoiceLabel: 'customers' },
    {
      href: '/portal/invoices/products',
      label: 'converter',
      icon: 'converter',
      invoiceLabel: 'products',
    },
    { href: '/portal/files', label: 'files', icon: 'files' },
    { href: '/portal/team', label: 'team', icon: 'team' },
    { href: '/portal/profile', label: 'profile', icon: 'profile' },
    { href: '/portal/security', label: 'security', icon: 'security' },
  ]
  return (
    <aside
      ref={sidebar}
      className={`${styles.sidebar} self-start rounded-3xl border border-border bg-surface px-4 py-6 shadow-nav`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-4">
        <h2 className="text-base font-semibold tracking-tight">{t('workspaceHeading')}</h2>
        <button
          type="button"
          aria-label={t('workspaceMenu')}
          aria-expanded={open}
          aria-controls="workspace-navigation"
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 hover:bg-accent lg:hidden"
        >
          <Icon name="menu" />
        </button>
      </div>
      {activeId && (
        <WorkspaceSwitcher organizations={organizations} activeId={activeId} hideLabel />
      )}
      <div
        id="workspace-navigation"
        className={`grid transition-[grid-template-rows] duration-250 motion-reduce:transition-none lg:grid-rows-[1fr] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <nav
            aria-label={t('workspaceMenu')}
            className={`${styles.links} mt-2 transition-[visibility,opacity] duration-250 motion-reduce:transition-none lg:visible lg:opacity-100 ${open ? 'visible opacity-100' : 'invisible opacity-0'}`}
          >
            {links.map(({ href, label, icon, invoiceLabel }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={
                  pathname === href || (href !== '/portal' && pathname.startsWith(href + '/'))
                    ? 'page'
                    : undefined
                }
                className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${pathname === href || (href !== '/portal' && pathname.startsWith(href + '/')) ? 'bg-primary/20 text-brand-ink' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
              >
                <Icon name={icon} />
                {invoiceLabel ? invoices(invoiceLabel) : t(label)}
                {pathname === href && (
                  <span className="ml-auto size-1.5 rounded-full bg-brand-ink" />
                )}
              </Link>
            ))}
            {billingOwner && (
              <Link
                href="/portal/billing"
                onClick={() => setOpen(false)}
                aria-current={pathname.startsWith('/portal/billing') ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-medium ${pathname.startsWith('/portal/billing') ? 'bg-primary/20 text-brand-ink' : 'text-muted-foreground hover:bg-accent'}`}
              >
                <Icon name="billing" />
                {billing('title')}
              </Link>
            )}
          </nav>
          <div
            className={`mt-4 border-t border-border pt-3 transition-[visibility,opacity] duration-250 motion-reduce:transition-none lg:visible lg:opacity-100 ${open ? 'visible opacity-100' : 'invisible opacity-0'}`}
          >
            <p className="mb-2 truncate px-4 text-xs text-muted-foreground">{name}</p>
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  )
}
