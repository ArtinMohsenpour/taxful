import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { documentContext } from '@/lib/documents/access'
import { workspaceOverview } from '@/lib/documents/overview'
import { Link } from '@/i18n/navigation'
import { WorkspaceForm } from '@/components/customer-auth/workspace-form'
import { Icon } from '@/components/customer-auth/icon'

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
  return (
    <div className="space-y-7">
      <header>
        <p className="mb-3 text-xs font-semibold tracking-widest text-brand-ink uppercase">
          {t('overview')}
        </p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {t('dashboardTitle', { name: session.user.firstName || session.user.name })}
        </h1>
        <p className="mt-3 text-muted-foreground">{t('dashboardIntro')}</p>
      </header>
      {overview && (
        <section aria-labelledby="workspace-summary">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="workspace-summary" className="text-xl font-semibold">
                {t('workspaceSummary')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('workspaceSummaryHint')}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <Link
                key={metric.key}
                href={metric.href}
                className={`group rounded-3xl border p-5 transition-colors hover:border-primary ${metric.attention ? 'border-error/25 bg-error/5' : 'border-border bg-surface'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t(metric.key)}</p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums">{metric.value}</p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-brand-ink">
                    <Icon name={metric.icon} />
                  </span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{metric.note}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="rounded-3xl border border-primary/20 bg-primary/10 p-6 sm:p-8">
        {organization ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-brand-ink">
              <Icon name="company" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-medium">{organization.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('workspaceReady')}</p>
            </div>
            <Link
              href="/portal/team"
              className="inline-flex items-center gap-3 text-sm font-semibold text-brand-ink"
            >
              {t('manageTeam')}
              <Icon name="arrow" />
            </Link>
          </div>
        ) : (
          <>
            <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-surface text-brand-ink">
              <Icon name="company" className="size-6" />
            </span>
            <h2 className="text-2xl font-medium">{t('workspace')}</h2>
            <p className="mt-3 mb-6 max-w-lg leading-relaxed text-muted-foreground">
              {t('workspaceIntro')}
            </p>
            <WorkspaceForm />
          </>
        )}
      </section>
      {overview && (
        <section
          className="rounded-3xl border border-border bg-surface p-6 sm:p-8"
          aria-labelledby="recent-documents"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="recent-documents" className="text-xl font-semibold">
                {t('recentDocuments')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('recentDocumentsHint')}</p>
            </div>
            <Link
              href="/portal/files"
              className="text-sm font-semibold text-brand-ink hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>
          {overview.recent.length ? (
            <ul className="mt-6 divide-y divide-border">
              {overview.recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={'/portal/files/' + item.id}
                    className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-brand-ink">
                      <Icon name="files" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium group-hover:text-brand-ink">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.workflow === 'outgoing'
                          ? invoices(item.invoiceState)
                          : item.workflow === 'incoming'
                            ? invoices('incoming')
                            : invoices('unclassified')}{' '}
                        · {documents(item.status)} ·{' '}
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: 'medium',
                          timeZone: 'Europe/Berlin',
                        }).format(new Date(item.createdAt))}
                      </p>
                    </div>
                    <Icon
                      name="arrow"
                      className="text-muted-foreground transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-2xl bg-background/60 p-5 text-sm text-muted-foreground">
              {t('noRecentDocuments')}
            </p>
          )}
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {(['new', 'incoming'] as const).map((item) => (
          <Link
            key={item}
            href={`/portal/invoices/${item}`}
            className="group rounded-3xl border border-border bg-surface p-6 transition-colors hover:border-primary"
          >
            <div className="mb-6 flex items-center justify-between">
              <Icon
                name={item === 'new' ? 'converter' : 'files'}
                className="size-7 text-brand-ink"
              />
              <Icon
                name="arrow"
                className="text-muted-foreground transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </div>
            <h2 className="text-lg font-semibold">{invoices(item)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {invoices(item === 'new' ? 'newIntro' : 'incomingIntro')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
