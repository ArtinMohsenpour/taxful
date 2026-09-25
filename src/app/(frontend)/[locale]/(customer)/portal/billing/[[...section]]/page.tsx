import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { documentContext } from '@/lib/documents/access'
import { billingOverview } from '@/lib/billing/service'
import { billingReady } from '@/lib/billing/stripe'
import { customerPool } from '@/lib/customer-auth/database'
import { hasPermission } from '@/lib/customer-auth/permissions'
import { planIds, type Plan, type PlanId } from '@/lib/billing/plans'
import { Link } from '@/i18n/navigation'
import { PlanCards } from '@/components/billing/plan-cards'
import { BillingAction } from '@/components/billing/billing-action'
import { BillingSync } from '@/components/billing/billing-sync'
import { ManagementPanel } from '@/components/billing/management-panel'
import { CheckoutPage, PaymentMethodPage, PlanChangePage } from '@/components/billing/payment-pages'
const card = 'rounded-3xl border border-border bg-surface p-6'
export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>
  searchParams: Promise<{
    checkout?: string
    changed?: string
    plan?: string
    setup_intent?: string
  }>
}) {
  const locale = await getLocale(),
    t = await getTranslations('Billing')
  const { organization } = await getCustomerWorkspace(locale)
  const section = (await params).section?.join('/') || 'subscription'
  if (!['subscription', 'history', 'usage', 'checkout', 'payment', 'change'].includes(section))
    notFound()
  if (!organization)
    return (
      <section className={card}>
        <Link href="/portal">{t('ownerOnly')}</Link>
      </section>
    )
  const context = await documentContext(await headers())
  if (!hasPermission(context.role, 'billing'))
    return (
      <section className={card}>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-4">{t('ownerOnly')}</p>
      </section>
    )
  const data = await billingOverview(context)
  const query = await searchParams
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')
    ? process.env.STRIPE_PUBLISHABLE_KEY
    : ''
  if (['checkout', 'payment', 'change'].includes(section)) {
    if (!billingReady() || !publishableKey)
      return (
        <section className={card}>
          <p>{t('billingUnavailable')}</p>
          <Link href="/portal/billing">{t('backBilling')}</Link>
        </section>
      )
    if (section === 'payment')
      return (
        <PaymentMethodPage
          organizationId={context.organizationId}
          publishableKey={publishableKey}
          returnedIntent={query.setup_intent?.startsWith('seti_') ? query.setup_intent : undefined}
        />
      )
    if (!query.plan || !planIds.includes(query.plan as PlanId) || query.plan === 'free') notFound()
    return section === 'checkout' ? (
      <CheckoutPage
        organizationId={context.organizationId}
        publishableKey={publishableKey}
        plan={query.plan as PlanId}
      />
    ) : (
      <PlanChangePage organizationId={context.organizationId} plan={query.plan as PlanId} />
    )
  }
  const date = (value: Date | string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Europe/Berlin' }).format(
      new Date(value),
    )
  const plans = await customerPool.query<Plan>(
    'SELECT * FROM customer_auth.billing_plans ORDER BY monthly_documents',
  )
  const meters = [
    ['documents', data.used.documents, data.plan.monthly_documents],
    ['uploads', data.used.uploads, data.plan.daily_uploads],
    ['exports', data.used.exports, data.plan.monthly_documents],
    ['seats', data.used.seats, data.plan.team_members],
    ['storage', Number(data.used.storage) / 1024 ** 3, Number(data.plan.storage_bytes) / 1024 ** 3],
  ] as const
  return (
    <div className="space-y-6">
      <BillingSync organizationId={context.organizationId} locale={locale} ready={billingReady()} />
      <h1 className="text-3xl font-medium">
        {t(section === 'subscription' ? 'title' : section === 'history' ? 'history' : 'usage')}
      </h1>
      <nav className="flex flex-wrap gap-2" aria-label={t('title')}>
        {(['subscription', 'usage', 'history'] as const).map((tab) => (
          <Link
            key={tab}
            href={`/portal/billing${tab === 'subscription' ? '' : '/' + tab}`}
            aria-current={section === tab ? 'page' : undefined}
            className={`rounded-xl px-4 py-3 text-sm font-medium ${section === tab ? 'bg-primary/20 text-brand-ink' : 'bg-surface hover:bg-accent'}`}
          >
            {t(tab === 'subscription' ? 'title' : tab)}
          </Link>
        ))}
      </nav>
      {section === 'subscription' && (
        <>
          <section className={card}>
            <p className="text-sm text-muted-foreground">{t('current')}</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {t(data.subscription?.plan_id || 'free')}
            </h2>
            <p className="mt-2 text-sm">
              {t('effectiveAccess')}: {t(data.plan.id)}
            </p>
            {data.grant && (
              <p className="mt-3 rounded-xl bg-primary/10 p-3 text-sm">
                {t('complimentary', {
                  plan: t(data.grant.plan_id),
                  date: date(data.grant.expires_at),
                })}
              </p>
            )}
            <p className="mt-3">
              {t('status')}:{' '}
              {t(
                data.subscription?.status === 'free'
                  ? 'freeStatus'
                  : data.subscription?.status || 'freeStatus',
              )}
            </p>
            {data.subscription?.current_period_end && (
              <p className="mt-2 text-sm">
                {t('periodEnd')}: {date(data.subscription.current_period_end)}
              </p>
            )}
            {data.subscription?.cancel_at_period_end && (
              <p className="mt-3 rounded-xl bg-accent p-3">{t('canceling')}</p>
            )}
            {data.subscription?.grace_until && (
              <p className="mt-3 rounded-xl bg-error/10 p-3 text-error">
                {t('grace')}: {date(data.subscription.grace_until)}
              </p>
            )}
            {(await searchParams).checkout && (
              <p role="status" className="mt-4 rounded-xl bg-primary/10 p-4">
                {t('returned')}
              </p>
            )}
            {query.changed && (
              <p role="status" className="mt-4 rounded-xl bg-primary/10 p-4">
                {t('changeSaved')}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <BillingAction
                action="portal"
                organizationId={context.organizationId}
                disabled={!billingReady()}
              />
              <BillingAction
                action="refresh"
                organizationId={context.organizationId}
                disabled={!billingReady()}
              />
            </div>
          </section>
          {billingReady() && (
            <ManagementPanel
              organizationId={context.organizationId}
              publishableKey={publishableKey}
            />
          )}
          <p className="rounded-2xl bg-primary/10 p-4 text-sm">{t('provisional')}</p>
          <PlanCards
            plans={plans.rows}
            organizationId={context.organizationId}
            ready={billingReady()}
            subscribedPlan={data.subscription?.plan_id}
            hasSubscription={Boolean(
              data.subscription &&
              !['free', 'canceled', 'incomplete_expired'].includes(data.subscription.status),
            )}
          />
        </>
      )}
      {section === 'usage' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {meters.map(([label, value, limit]) => (
              <section key={label} className={card}>
                <h2 className="text-sm text-muted-foreground">{t(label)}</h2>
                <p className="my-3 text-2xl font-semibold tabular-nums">
                  {t('allowance', {
                    used: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value),
                    limit: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
                      limit,
                    ),
                  })}
                </p>
                <div
                  role="progressbar"
                  aria-label={t(label)}
                  aria-valuemin={0}
                  aria-valuemax={limit}
                  aria-valuenow={Math.min(value, limit)}
                  className="h-2 w-full overflow-hidden rounded-full bg-accent"
                >
                  <div
                    className={`h-full rounded-full ${value >= limit ? 'bg-brand-ink' : 'bg-primary'}`}
                    style={{ width: `${Math.min((value / limit) * 100, 100)}%` }}
                  />
                </div>
              </section>
            ))}
          </div>
          <section className={card}>
            <p>
              {t('reset')}: {date(data.used.resets)}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t('quotaHelp')}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('seatsHelp')}</p>
          </section>
        </>
      )}
      {section === 'history' && (
        <>
          <section className={card}>
            {!data.invoices.length ? (
              <p className="text-muted-foreground">{t('noInvoices')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      {(['invoice', 'date', 'status', 'amount'] as const).map((key) => (
                        <th key={key} className="px-3 py-3">
                          {t(key)}
                        </th>
                      ))}
                      <th>
                        <span className="sr-only">{t('view')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((invoice) => (
                      <tr key={invoice.provider_invoice_id} className="border-t border-border">
                        <td className="px-3 py-4">{invoice.number || '—'}</td>
                        <td className="px-3 py-4">{date(invoice.issued_at)}</td>
                        <td className="px-3 py-4">
                          {t.has(invoice.status) ? t(invoice.status) : '—'}
                        </td>
                        <td className="px-3 py-4 tabular-nums">
                          {new Intl.NumberFormat(locale, {
                            style: 'currency',
                            currency: invoice.currency,
                          }).format(Number(invoice.total) / 100)}
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-3">
                            {invoice.hosted_url?.startsWith('https://invoice.stripe.com/') && (
                              <a
                                href={invoice.hosted_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-brand-ink underline"
                              >
                                {t('view')}
                              </a>
                            )}
                            {invoice.pdf_url?.startsWith('https://pay.stripe.com/') && (
                              <a
                                href={invoice.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-brand-ink underline"
                              >
                                {t('download')}
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className={card}>
            <h2 className="mb-4 text-lg font-semibold">{t('audit')}</h2>
            {!data.audit.length ? (
              <p>{t('noActivity')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.audit.map((event, index) => (
                  <li key={index} className="flex justify-between gap-4 py-3 text-sm">
                    <span>{t.has(event.event) ? t(event.event) : t('billing_refreshed')}</span>
                    <time>{date(event.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
