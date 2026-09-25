import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Plan } from '@/lib/billing/plans'
export async function PlanCards({
  plans,
  organizationId,
  ready = false,
  subscribedPlan,
  hasSubscription = false,
}: {
  plans: Plan[]
  organizationId?: string
  ready?: boolean
  subscribedPlan?: string
  hasSubscription?: boolean
}) {
  const t = await getTranslations('Billing'),
    locale = await getLocale()
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map((plan) => (
        <section
          key={plan.id}
          className={`flex flex-col rounded-3xl border bg-surface p-6 ${plan.id === 'professional' ? 'border-primary shadow-nav' : 'border-border'}`}
        >
          <h2 className="text-xl font-semibold">{t(plan.id)}</h2>
          <p className="mt-4 text-3xl font-medium">
            {plan.id === 'free'
              ? '€0'
              : plan.published
                ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(
                    plan.monthly_price_cents / 100,
                  )
                : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.id !== 'free' && plan.published ? t('month') : t('provisional')}
          </p>
          <dl className="my-6 space-y-3 text-sm">
            {(
              [
                ['documents', plan.monthly_documents],
                ['uploads', plan.daily_uploads],
                ['batch', plan.batch_uploads],
                ['seats', plan.team_members],
                ['storage', Number(plan.storage_bytes) / 1024 ** 3],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t(label)}</dt>
                <dd className="font-semibold tabular-nums">
                  {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto">
            {organizationId ? (
              plan.id !== 'free' &&
              (hasSubscription && subscribedPlan === plan.id ? (
                <span className="inline-flex rounded-xl bg-primary/15 px-4 py-3 text-sm font-medium text-brand-ink">
                  {t('currentPlanButton')}
                </span>
              ) : ready && plan.published ? (
                <Link
                  href={`/portal/billing/${hasSubscription ? 'change' : 'checkout'}?plan=${plan.id}`}
                  className="inline-flex min-h-12 items-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80"
                >
                  {t(hasSubscription ? 'changePlan' : 'choose')}
                </Link>
              ) : (
                <button disabled className="rounded-2xl bg-primary px-5 py-3 text-sm opacity-50">
                  {t('choose')}
                </button>
              ))
            ) : (
              <Link
                href="/portal/billing"
                className="inline-flex rounded-xl bg-primary/15 px-4 py-3 font-medium text-brand-ink"
              >
                {t('choose')}
              </Link>
            )}
            {plan.id !== 'free' && !plan.published && (
              <p className="mt-2 text-xs text-muted-foreground">{t('unpublished')}</p>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
