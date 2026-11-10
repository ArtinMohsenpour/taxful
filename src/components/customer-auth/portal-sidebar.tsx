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
  type NavItem = { href: string; label: string; icon: IconName }
  const groups: { key: string; heading?: string; items: NavItem[] }[] = [
    {
      key: 'main',
      items: [{ href: '/portal', label: t('overview'), icon: 'overview' }],
    },
    {
      key: 'invoices',
      heading: t('navInvoices'),
      items: [
        { href: '/portal/invoices/new', label: invoices('new'), icon: 'converter' },
        {
          href: '/portal/invoices/outgoing',
          label: invoices('outgoing'),
          icon: 'outgoing-invoices',
        },
        {
          href: '/portal/invoices/incoming',
          label: invoices('incoming'),
          icon: 'incoming-invoices',
        },
        { href: '/portal/files', label: t('files'), icon: 'files' },
      ],
    },
    {
      key: 'directory',
      heading: t('navDirectory'),
      items: [
        { href: '/portal/invoices/customers', label: invoices('customers'), icon: 'team' },
        { href: '/portal/invoices/products', label: invoices('products'), icon: 'converter' },
      ],
    },
    {
      key: 'workspace',
      heading: t('navWorkspace'),
      items: [
        { href: '/portal/team', label: t('team'), icon: 'team' },
        ...(billingOwner
          ? [{ href: '/portal/billing', label: billing('title'), icon: 'billing' as IconName }]
          : []),
      ],
    },
    {
      key: 'account',
      heading: t('navAccount'),
      items: [
        { href: '/portal/profile', label: t('profile'), icon: 'profile' },
        { href: '/portal/security', label: t('security'), icon: 'security' },
      ],
    },
  ]
  const isActive = (href: string) =>
    pathname === href || (href !== '/portal' && pathname.startsWith(href + '/'))
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
            {groups.map(({ key, heading, items }) => {
              const headingId = `portal-nav-${key}`
              return (
                <div
                  key={key}
                  role={heading ? 'group' : undefined}
                  aria-labelledby={heading ? headingId : undefined}
                  className={heading ? 'mt-1.5 border-t border-border/60 pt-1.5' : undefined}
                >
                  {heading && (
                    <p
                      id={headingId}
                      className="mb-0.5 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                    >
                      {heading}
                    </p>
                  )}
                  <div className="grid gap-0.5">
                    {items.map(({ href, label, icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        aria-current={isActive(href) ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${isActive(href) ? 'bg-primary/20 text-brand-ink' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                      >
                        <Icon name={icon} />
                        {label}
                        {pathname === href && (
                          <span className="ml-auto size-1.5 rounded-full bg-brand-ink" />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
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
