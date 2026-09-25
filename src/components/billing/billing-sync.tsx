'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Webhooks update the database; refresh mounted screens without a full reload.
// Reconcile once on entry as recovery for a delayed local webhook/portal return.
export function BillingSync({
  organizationId,
  locale,
  ready,
}: {
  organizationId: string
  locale: string
  ready: boolean
}) {
  const router = useRouter()
  useEffect(() => {
    const controller = new AbortController()
    if (ready)
      void fetch('/api/billing/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, locale }),
        signal: controller.signal,
      })
        .then((response) => {
          if (response.ok && !controller.signal.aborted) router.refresh()
        })
        .catch(() => {
          /* The manual refresh action remains available for recovery. */
        })
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const timer = window.setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [organizationId, locale, ready, router])
  return null
}
