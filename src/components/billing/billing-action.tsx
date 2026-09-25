'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import type { PlanId } from '@/lib/billing/plans'
export function BillingAction({
  action,
  organizationId,
  plan,
  disabled = false,
}: {
  action: 'checkout' | 'portal' | 'refresh'
  organizationId: string
  plan?: PlanId
  disabled?: boolean
}) {
  const t = useTranslations('Billing'),
    locale = useLocale(),
    router = useRouter()
  const [pending, setPending] = useState(false),
    [error, setError] = useState('')
  return (
    <div>
      <button
        disabled={disabled || pending}
        className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${action === 'checkout' ? 'bg-primary text-primary-foreground hover:bg-primary/80' : 'border border-border bg-surface text-muted-foreground hover:bg-accent'}`}
        onClick={async () => {
          setPending(true)
          setError('')
          try {
            const result = await fetch(`/api/billing/${action}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ organizationId, locale, plan }),
            })
            const data = await result.json()
            if (!result.ok) {
              setError(t.has(data.error) ? data.error : 'genericError')
              return
            }
            if (data.url) {
              const url = new URL(data.url)
              if (
                url.protocol !== 'https:' ||
                !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)
              )
                throw new Error()
              window.location.assign(url.href)
            } else router.refresh()
          } catch {
            setError('genericError')
          } finally {
            setPending(false)
          }
        }}
      >
        {t(
          pending
            ? 'working'
            : action === 'checkout'
              ? 'choose'
              : action === 'portal'
                ? 'fallbackPortal'
                : 'refresh',
        )}
      </button>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-error/10 p-3 text-sm text-error">
          {t(error as Parameters<typeof t>[0])}
        </p>
      )}
    </div>
  )
}
