'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Link } from '@/i18n/navigation'
import type { ManagementOverview } from '@/lib/billing/management'
import {
  billingRequest,
  billingButton,
  billingSecondary,
  billingCard,
  billingInput,
} from './client'

export function ManagementPanel({
  organizationId,
  publishableKey,
}: {
  organizationId: string
  publishableKey: string
}) {
  const t = useTranslations('Billing'),
    locale = useLocale(),
    router = useRouter()
  const [data, setData] = useState<ManagementOverview | undefined>(),
    [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [pending, setPending] = useState(false),
    [editing, setEditing] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    action: string
    paymentMethodId?: string
  } | null>(null)
  const operation = useRef<{ key: string; id: string } | null>(null)
  const load = useCallback(async () => {
    const result = await billingRequest<{
      overview: ManagementOverview
      clientSecret: string | null
    }>(organizationId, locale, { action: 'view' })
    setData(result.overview)
    setClientSecret(result.clientSecret)
  }, [organizationId, locale])
  useEffect(() => {
    let active = true
    void billingRequest<{ overview: ManagementOverview; clientSecret: string | null }>(
      organizationId,
      locale,
      { action: 'view' },
    )
      .then((result) => {
        if (active) {
          setData(result.overview)
          setClientSecret(result.clientSecret)
        }
      })
      .catch(() => {
        if (active) setError('genericError')
      })
    return () => {
      active = false
    }
  }, [organizationId, locale])
  useEffect(() => {
    let active = true
    const refresh = () => {
      if (active && !editing && !pending && document.visibilityState === 'visible')
        void load().catch(() => {
          if (active) setError('genericError')
        })
    }
    const timer = window.setInterval(() => {
      if (!editing && !pending) refresh()
    }, 30000)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [load, editing, pending])
  async function act(input: object) {
    setPending(true)
    setError('')
    setMessage('')
    const key = JSON.stringify(input)
    if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() }
    try {
      const outcome = await billingRequest<{ paymentPending?: boolean }>(organizationId, locale, {
        ...input,
        operationId: operation.current.id,
      })
      operation.current = null
      setConfirmation(null)
      setEditing(false)
      setMessage(outcome.paymentPending ? 'paymentPending' : 'saved')
      await load()
      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error && t.has(error.message as Parameters<typeof t.has>[0])
          ? error.message
          : 'genericError',
      )
    } finally {
      setPending(false)
    }
  }
  const money = (value: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value / 100)
  const date = (value: number) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value * 1000)
  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-2xl bg-error/10 p-4 text-sm text-error">
          {t(error as Parameters<typeof t>[0])}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-2xl bg-primary/15 p-4 text-sm">
          {t(message as Parameters<typeof t>[0])}
        </p>
      )}
      {data === undefined ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t('loadingBilling')}
        </p>
      ) : data === null ? (
        <p className="text-sm text-muted-foreground">{t('noBillingCustomer')}</p>
      ) : (
        <>
          {data.subscription && (
            <section className={billingCard}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{t('monthlyPrice')}</h2>
                  <p className="mt-2 text-2xl font-medium tabular-nums">
                    {money(data.subscription.monthlyAmount || 0, data.subscription.currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('month')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.subscription.hasSchedule ? (
                    <button
                      className={billingSecondary}
                      disabled={pending}
                      onClick={() => setConfirmation({ action: 'undoChange' })}
                    >
                      {t('undoChange')}
                    </button>
                  ) : (
                    <button
                      className={billingSecondary}
                      disabled={pending}
                      onClick={() =>
                        setConfirmation({
                          action: data.subscription!.canceling ? 'resume' : 'cancel',
                        })
                      }
                    >
                      {t(data.subscription.canceling ? 'resumeSubscription' : 'cancelSubscription')}
                    </button>
                  )}
                </div>
              </div>
              {data.subscription.scheduledPlan && data.subscription.scheduledAt && (
                <p className="mt-4 rounded-xl bg-primary/10 p-3 text-sm">
                  {t('scheduledChange', {
                    plan: t(data.subscription.scheduledPlan),
                    date: date(data.subscription.scheduledAt),
                  })}
                </p>
              )}
              {data.subscription.pending && <p className="mt-4 text-sm">{t('paymentPending')}</p>}
              {data.subscription.invoiceDue && (
                <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                  <p className="font-medium">
                    {t('pendingInvoice', {
                      amount: money(
                        data.subscription.invoiceDue.amount,
                        data.subscription.invoiceDue.currency,
                      ),
                    })}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className={billingSecondary}
                      disabled={pending}
                      onClick={() => void act({ action: 'retryPayment' })}
                    >
                      {t(pending ? 'working' : 'retryPayment')}
                    </button>
                    {clientSecret && (
                      <button
                        className={billingSecondary}
                        disabled={pending}
                        onClick={async () => {
                          setPending(true)
                          setError('')
                          try {
                            const stripe = await loadStripe(publishableKey)
                            const result = await stripe?.handleNextAction({ clientSecret })
                            if (result?.error) throw new Error('genericError')
                            await load()
                            router.refresh()
                          } catch {
                            setError('genericError')
                          } finally {
                            setPending(false)
                          }
                        }}
                      >
                        {t('authenticate')}
                      </button>
                    )}
                    {data.subscription.invoiceDue.url?.startsWith(
                      'https://invoice.stripe.com/',
                    ) && (
                      <a
                        className={billingSecondary}
                        href={data.subscription.invoiceDue.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {t('payInvoice')}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
          {confirmation && (
            <section
              role="alertdialog"
              aria-label={t('confirmAction')}
              aria-describedby="billing-confirmation"
              className={`${billingCard} ring-2 ring-primary/30`}
            >
              <p id="billing-confirmation">
                {t(
                  confirmation.action === 'cancel'
                    ? 'cancelConfirm'
                    : confirmation.action === 'resume'
                      ? 'resumeConfirm'
                      : confirmation.action === 'removeMethod'
                        ? 'removeConfirm'
                        : 'undoConfirm',
                )}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  autoFocus
                  disabled={pending}
                  className={billingButton}
                  onClick={() => void act(confirmation)}
                >
                  {t(pending ? 'working' : 'confirmAction')}
                </button>
                <button
                  disabled={pending}
                  className={billingSecondary}
                  onClick={() => setConfirmation(null)}
                >
                  {t('neverMind')}
                </button>
              </div>
            </section>
          )}
          <div className="grid gap-5 xl:grid-cols-2">
            <section className={billingCard}>
              <h2 className="text-lg font-semibold">{t('paymentMethods')}</h2>
              <ul className="mt-4 divide-y divide-border">
                {data.methods.map((method) => (
                  <li key={method.id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium capitalize">{method.brand}</span>
                      <span className="font-mono text-sm">•••• {method.last4}</span>
                      {method.isDefault && (
                        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs">
                          {t('defaultCard')}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('expires', {
                        date: `${String(method.expMonth).padStart(2, '0')}/${method.expYear}`,
                      })}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!method.isDefault && (
                        <button
                          disabled={pending}
                          className={billingSecondary}
                          onClick={() =>
                            void act({ action: 'defaultMethod', paymentMethodId: method.id })
                          }
                        >
                          {t('makeDefault')}
                        </button>
                      )}
                      <button
                        disabled={pending}
                        className={billingSecondary}
                        onClick={() =>
                          setConfirmation({ action: 'removeMethod', paymentMethodId: method.id })
                        }
                      >
                        {t('removeCard')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {!data.methods.length && (
                <p className="my-5 text-sm text-muted-foreground">{t('noCards')}</p>
              )}
              <Link className={`${billingSecondary} mt-4`} href="/portal/billing/payment">
                + {t('addCard')}
              </Link>
            </section>
            <section className={billingCard}>
              <h2 className="text-lg font-semibold">{t('billingDetails')}</h2>
              {editing ? (
                <form
                  className="mt-4 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const values = new FormData(event.currentTarget)
                    void act({
                      action: 'details',
                      name: values.get('name'),
                      email: values.get('email'),
                      address: {
                        line1: values.get('line1'),
                        line2: values.get('line2'),
                        city: values.get('city'),
                        postal_code: values.get('postal_code'),
                        country: String(values.get('country')).toUpperCase(),
                      },
                    })
                  }}
                >
                  {(
                    ['name', 'email', 'line1', 'line2', 'city', 'postal_code', 'country'] as const
                  ).map((key, index) => (
                    <label className="block text-sm" key={key}>
                      {t(
                        (
                          [
                            'billingName',
                            'billingEmail',
                            'addressLine1',
                            'addressLine2',
                            'city',
                            'postalCode',
                            'country',
                          ] as const
                        )[index],
                      )}
                      <input
                        className={billingInput}
                        name={key}
                        type={key === 'email' ? 'email' : 'text'}
                        required={key !== 'line2'}
                        maxLength={key === 'country' ? 2 : 200}
                        minLength={key === 'country' ? 2 : undefined}
                        defaultValue={
                          key === 'name' || key === 'email'
                            ? data[key]
                            : data.address?.[key] || (key === 'country' ? 'DE' : '')
                        }
                      />
                    </label>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button className={billingButton} disabled={pending}>
                      {t(pending ? 'working' : 'saveDetails')}
                    </button>
                    <button
                      className={billingSecondary}
                      type="button"
                      disabled={pending}
                      onClick={() => setEditing(false)}
                    >
                      {t('close')}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <address className="mt-4 space-y-1 text-sm leading-relaxed not-italic">
                    <p className="font-medium">{data.name || '—'}</p>
                    <p className="break-all text-muted-foreground">{data.email}</p>
                    <p>{data.address?.line1}</p>
                    <p>{data.address?.line2}</p>
                    <p>
                      {data.address?.postal_code} {data.address?.city}
                    </p>
                    <p>{data.address?.country}</p>
                  </address>
                  <button className={`${billingSecondary} mt-5`} onClick={() => setEditing(true)}>
                    {t('editDetails')}
                  </button>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
