import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { documentContext } from '@/lib/documents/access'
import { workspaceOverview, type WorkspaceOverview } from '@/lib/documents/overview'
import { Link } from '@/i18n/navigation'
import { WorkspaceForm } from '@/components/customer-auth/workspace-form'
import { Icon } from '@/components/customer-auth/icon'

type RecentStatus = WorkspaceOverview['recent'][number]['status']

const statusTone: Record<RecentStatus, string> = {
  approved: 'bg-success/10 text-success',
  needs_review: 'bg-warning/10 text-warning',
  failed: 'bg-error/10 text-error',
  rejected: 'bg-error/10 text-error',
  unsupported: 'bg-error/10 text-error',
  queued: 'bg-accent text-muted-foreground',
  processing: 'bg-accent text-muted-foreground',
}

const workflowIcon = {
  incoming: 'incoming-invoices',
  outgoing: 'outgoing-invoices',
  unclassified: 'files',
} as const

export default async function PortalPage() {
  const locale = await getLocale()
  const t = await getTranslations('Auth')
  const invoices = await getTranslations('Invoices')
  const documents = await getTranslations('Documents')
  const { session, organization } = await getCustomerWorkspace(locale)
  const overview = organization
    ? await workspaceOverview(await documentContext(await headers()))
    : null
  const metrics = overview
    ? [
        {
          key: 'documentsMetric' as const,
          value: overview.stats.documents,
          note: t('thisMonth', { count: overview.stats.thisMonth }),
          icon: 'files' as const,
          href: '/portal/files' as const,
        },
        {
          key: 'outgoingMetric' as const,
          value: overview.stats.outgoing,
          note: t('draftCount', { count: overview.stats.drafts }),
          icon: 'converter' as const,
          href: '/portal/invoices/outgoing' as const,
        },
        {
          key: 'incomingMetric' as const,
          value: overview.stats.incoming,
          note: t('incomingMetricHint'),
          icon: 'download' as const,
          href: '/portal/invoices/incoming' as const,
        },
        {
          key: 'customersMetric' as const,
          value: overview.stats.customers,
          note: t('customersMetricHint'),
          icon: 'team' as const,
          href: '/portal/invoices/customers' as const,
        },
        {
          key: 'exportsMetric' as const,
          value: overview.stats.exportFiles,
          note: t('exportedInvoiceCount', { count: overview.stats.exportedInvoices }),
          icon: 'check' as const,
          href: '/portal/invoices/outgoing' as const,
        },
        {
          key: 'attentionMetric' as const,
          value: overview.stats.needsAttention,
          note: t(overview.stats.needsAttention ? 'attentionHint' : 'attentionClear'),
          icon: 'overview' as const,
          href: '/portal/files' as const,
          attention: overview.stats.needsAttention > 0,
        },
      ]
    : []
  const dateFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'Europe/Berlin',
  })
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-xs font-semibold tracking-widest text-brand-ink uppercase">
          {t('overview')}
        </p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {t('dashboardTitle', { name: session.user.firstName || session.user.name })}
        </h1>
        <p className="mt-2 text-muted-foreground">{t('dashboardIntro')}</p>
      </header>
      {overview && (
        <section aria-labelledby="workspace-summary">
          <div className="mb-3">
            <h2 id="workspace-summary" className="text-lg font-semibold">
              {t('workspaceSummary')}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('workspaceSummaryHint')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <Link
                key={metric.key}
                href={metric.href}
                className={`group flex flex-col rounded-2xl border p-4 transition-colors hover:border-primary ${metric.attention ? 'border-error/25 bg-error/5' : 'border-border bg-surface'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{t(metric.key)}</p>
                  <span
                    className={`flex size-8 items-center justify-center rounded-lg ${metric.attention ? 'bg-error/10 text-error' : 'bg-primary/10 text-brand-ink'}`}
                  >
                    <Icon name={metric.icon} className="size-4" />
                  </span>
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{metric.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="rounded-2xl border border-primary/20 bg-primary/10 p-5 sm:p-6">
        {organization ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-ink">
              <Icon name="company" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-medium">{organization.name}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{t('workspaceReady')}</p>
            </div>
            <Link
              href="/portal/team"
              className="group inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-brand-ink transition-colors hover:bg-surface/70"
            >
              {t('manageTeam')}
              <Icon
                name="arrow"
                className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          </div>
        ) : (
          <>
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-surface text-brand-ink">
              <Icon name="company" className="size-5" />
            </span>
            <h2 className="text-xl font-medium">{t('workspace')}</h2>
            <p className="mt-2 mb-5 max-w-lg leading-relaxed text-muted-foreground">
              {t('workspaceIntro')}
            </p>
            <WorkspaceForm />
          </>
        )}
      </section>
      {overview && (
        <section
          className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
          aria-labelledby="recent-documents"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="recent-documents" className="text-lg font-semibold">
                {t('recentDocuments')}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{t('recentDocumentsHint')}</p>
            </div>
            <Link
              href="/portal/files"
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-accent"
            >
              {t('viewAll')}
            </Link>
          </div>
          {overview.recent.length ? (
            <ul className="-mx-2 mt-4 space-y-1">
              {overview.recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={'/portal/files/' + item.id}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/60 sm:gap-4 sm:px-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-ink">
                      <Icon name={workflowIcon[item.workflow]} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium group-hover:text-brand-ink">
                        {item.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.workflow === 'outgoing'
                          ? invoices(item.invoiceState)
                          : item.workflow === 'incoming'
                            ? invoices('incoming')
                            : invoices('unclassified')}
                        <span aria-hidden="true"> · </span>
                        <time dateTime={item.createdAt}>
                          {dateFormat.format(new Date(item.createdAt))}
                        </time>
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone[item.status]}`}
                    >
                      {documents(item.status)}
                    </span>
                    <Icon
                      name="arrow"
                      className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none sm:block"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl bg-background/60 p-4 text-sm text-muted-foreground">
              {t('noRecentDocuments')}
            </p>
          )}
        </section>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(['new', 'incoming'] as const).map((item) => (
          <Link
            key={item}
            href={`/portal/invoices/${item}`}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-brand-ink">
              <Icon name={item === 'new' ? 'converter' : 'incoming-invoices'} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{invoices(item)}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {invoices(item === 'new' ? 'newIntro' : 'incomingIntro')}
              </p>
            </div>
            <Icon
              name="arrow"
              className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
