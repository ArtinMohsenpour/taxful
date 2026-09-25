'use client'
export const billingButton =
  'inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50'
export const billingSecondary =
  'inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-50'
export const billingCard = 'rounded-3xl border border-border bg-surface p-5 sm:p-7'
export const billingInput =
  'mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
export async function billingRequest<T>(
  organizationId: string,
  locale: string,
  input: object,
): Promise<T> {
  const response = await fetch('/api/billing/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, organizationId, locale }),
    cache: 'no-store',
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'genericError')
  return data
}
