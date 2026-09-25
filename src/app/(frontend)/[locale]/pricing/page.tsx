import { getTranslations } from 'next-intl/server'
import { customerPool } from '@/lib/customer-auth/database'
import type { Plan } from '@/lib/billing/plans'
import { PlanCards } from '@/components/billing/plan-cards'
import { Navbar } from '@/components/navbar'
export const dynamic = 'force-dynamic'
export default async function PricingPage() {
  const t = await getTranslations('Billing')
  const { rows } = await customerPool.query<Plan>(
    'SELECT * FROM customer_auth.billing_plans ORDER BY monthly_documents',
  )
  return (
    <div className="min-h-dvh pt-3 sm:pt-6">
      <Navbar />
      <main className="mx-auto max-w-6xl px-3 py-12 sm:px-6 sm:py-16">
        <h1 className="text-4xl font-medium">{t('pricing')}</h1>
        <p className="mt-3 text-muted-foreground">{t('intro')}</p>
        <p className="my-6 rounded-2xl bg-primary/10 p-4 text-sm text-brand-ink">
          {t('provisional')}
        </p>
        <PlanCards plans={rows} />
      </main>
    </div>
  )
}
