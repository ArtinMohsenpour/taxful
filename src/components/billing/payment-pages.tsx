'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { loadStripe, type Appearance } from '@stripe/stripe-js'
import {
  CheckoutElementsProvider,
  PaymentElement as CheckoutPaymentElement,
  BillingAddressElement,
  useCheckoutElements,
} from '@stripe/react-stripe-js/checkout'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Link } from '@/i18n/navigation'
import type { PlanId } from '@/lib/billing/plans'
import type { ChangeQuote } from '@/lib/billing/management'
import {
  billingRequest,
  billingCard,
  billingButton,
  billingSecondary,
  billingInput,
} from './client'

function usePaymentStyle() {
  const { resolvedTheme } = useTheme()
  return useMemo<Appearance>(
    () => ({
      theme: resolvedTheme === 'dark' ? 'night' : 'stripe',
      variables: {
        colorPrimary: '#8B9A6E',
        colorBackground: resolvedTheme === 'dark' ? '#23271f' : '#fffdf9',
        colorText: resolvedTheme === 'dark' ? '#F7F2EB' : '#323a2e',
        colorDanger: '#b54136',
        borderRadius: '12px',
        fontFamily: 'Arial, sans-serif',
        spacingUnit: '4px',
      },
      rules: { '.Input': { boxShadow: 'none', padding: '14px' }, '.Label': { fontWeight: '500' } },
    }),
    [resolvedTheme],
  )
}
export function CheckoutPage({
  organizationId,
  plan,
  publishableKey,
}: {
  organizationId: string
  plan: PlanId
  publishableKey: string
}) {
  const locale = useLocale(),
    t = useTranslations('Billing'),
    appearance = usePaymentStyle()
  const stripe = useMemo(
    () => loadStripe(publishableKey, { locale: locale === 'de' ? 'de' : 'en' }),
    [publishableKey, locale],
  )
  const [secret, setSecret] = useState(''),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    void billingRequest<{ clientSecret: string }>(organizationId, locale, {
      action: 'checkout',
      plan,
    })
      .then((result) => {
        if (active) setSecret(result.clientSecret)
      })
      .catch((error) => {
        if (active) setError(t.has(error.message) ? error.message : 'genericError')
      })
    return () => {
      active = false
    }
  }, [organizationId, locale, plan, t, attempt])
  return (
    <div className="space-y-5">
      <Link href="/portal/billing" className="text-sm font-medium text-muted-foreground">
        ← {t('backBilling')}
      </Link>
      <div>
        <h1 className="text-3xl font-medium">{t('checkoutTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('checkoutIntro')}</p>
      </div>
      {error ? (
        <div role="alert" className={billingCard}>
          <p>{t(error as Parameters<typeof t>[0])}</p>
          <button
            className={`${billingSecondary} mt-4`}
            onClick={() => {
              setError('')
              setAttempt(attempt + 1)
            }}
          >
            {t('refresh')}
          </button>
        </div>
      ) : secret ? (
        <CheckoutElementsProvider
          stripe={stripe}
          options={{ clientSecret: secret, elementsOptions: { appearance } }}
        >
          <CheckoutForm plan={plan} />
        </CheckoutElementsProvider>
      ) : (
        <p role="status">{t('loadingBilling')}</p>
      )}
    </div>
  )
}
function CheckoutForm({ plan }: { plan: PlanId }) {
  const result = useCheckoutElements(),
    t = useTranslations('Billing'),
    locale = useLocale(),
    router = useRouter()
  const [email, setEmail] = useState(''),
    [taxId, setTaxId] = useState(''),
    [businessName, setBusinessName] = useState(''),
    [promotion, setPromotion] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState('')
  if (result.type === 'loading') return <p role="status">{t('loadingBilling')}</p>
  if (result.type === 'error') return <p role="alert">{t('genericError')}</p>
  const checkout = result.checkout
  return (
    <form
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)]"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        setError('')
        try {
          if (taxId.trim()) {
            const tax = await checkout.updateTaxIdInfo({
              businessName: businessName.trim(),
              taxId: { type: 'eu_vat', value: taxId.trim() },
            })
            if (tax.type === 'error') {
              setError(tax.error.message)
              return
            }
          }
          const response = await checkout.confirm({
            email: email || checkout.email || undefined,
            redirect: 'if_required',
          })
          if (response.type === 'error') setError(response.error.message)
          else router.replace(`/${locale}/portal/billing?checkout=returned`)
        } catch {
          setError(t('genericError'))
        } finally {
          setPending(false)
        }
      }}
    >
      <section className={`${billingCard} space-y-6`}>
        <h2 className="text-xl font-semibold">{t('paymentDetails')}</h2>
        <label className="block text-sm">
          {t('billingEmail')}
          <input
            className={billingInput}
            type="email"
            autoComplete="email"
            required
            value={email || checkout.email || ''}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <BillingAddressElement options={{ display: { name: 'organization' } }} />
        <details className="rounded-2xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium">{t('optionalVat')}</summary>
          <label className="mt-4 block text-sm">
            {t('legalBusinessName')}
            <input
              className={billingInput}
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              required={Boolean(taxId.trim())}
            />
          </label>
          <label className="mt-4 block text-sm">
            {t('euVatId')}
            <input
              className={billingInput}
              value={taxId}
              onChange={(event) => setTaxId(event.target.value)}
              placeholder="DE123456789"
              maxLength={32}
            />
          </label>
        </details>
        <CheckoutPaymentElement options={{ layout: 'tabs' }} />
        <p className="text-xs leading-relaxed text-muted-foreground">{t('securePayment')}</p>
      </section>
      <aside className={`${billingCard} space-y-5 lg:sticky lg:top-6`}>
        <div>
          <p className="text-sm text-muted-foreground">Taxful</p>
          <h2 className="mt-1 text-2xl font-semibold">{t(plan)}</h2>
        </div>
        <div className="border-y border-border py-5">
          <p className="text-sm text-muted-foreground">{t('dueToday')}</p>
          <p className="mt-2 text-3xl font-medium tabular-nums">{checkout.total.total.amount}</p>
          {checkout.recurring && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t('nextPayment', { amount: checkout.recurring.dueNext.total.amount })}
            </p>
          )}
        </div>
        <label className="block text-sm">
          {t('discountCode')}
          <input
            className={billingInput}
            value={promotion}
            onChange={(event) => setPromotion(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !promotion.trim()}
            className={billingSecondary}
            onClick={async () => {
              setPending(true)
              setError('')
              try {
                const response = await checkout.applyPromotionCode(promotion.trim())
                if (response.type === 'error') setError(response.error.message)
              } catch {
                setError(t('genericError'))
              } finally {
                setPending(false)
              }
            }}
          >
            {t('applyCode')}
          </button>
          {Boolean(checkout.discountAmounts?.length) && (
            <button
              type="button"
              className={billingSecondary}
              disabled={pending}
              onClick={async () => {
                setPending(true)
                try {
                  await checkout.removePromotionCode()
                } finally {
                  setPending(false)
                }
              }}
            >
              {t('removeCode')}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-error/10 p-3 text-sm text-error">
            {error}
          </p>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">{t('checkoutTerms')}</p>
        <button disabled={pending} className={`${billingButton} w-full`}>
          {t(pending ? 'working' : 'paySubscribe', { amount: checkout.total.total.amount })}
        </button>
      </aside>
    </form>
  )
}

export function PaymentMethodPage({
  organizationId,
  publishableKey,
  returnedIntent,
}: {
  organizationId: string
  publishableKey: string
  returnedIntent?: string
}) {
  const locale = useLocale(),
    t = useTranslations('Billing'),
    router = useRouter(),
    appearance = usePaymentStyle()
  const stripe = useMemo(
    () => loadStripe(publishableKey, { locale: locale === 'de' ? 'de' : 'en' }),
    [publishableKey, locale],
  )
  const [setup, setSetup] = useState<{ clientSecret: string; intentId: string } | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState('')
  const operationId = useRef<string | null>(null)
  useEffect(() => {
    if (!returnedIntent) return
    const id = crypto.randomUUID()
    // Remove Stripe redirect parameters (including client secrets) from the address bar.
    window.history.replaceState(null, '', window.location.pathname)
    void billingRequest(organizationId, locale, {
      action: 'saveMethod',
      setupIntentId: returnedIntent,
      operationId: id,
    })
      .then(() => router.replace(`/${locale}/portal/billing`))
      .catch(() => setError('genericError'))
  }, [returnedIntent, organizationId, locale, router])
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link className="text-sm text-muted-foreground" href="/portal/billing">
        ← {t('backBilling')}
      </Link>
      <section className={`${billingCard} space-y-5`}>
        <h1 className="text-2xl font-semibold">{t('paymentTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('cardConsent')}</p>
        {error && (
          <p role="alert" className="text-error">
            {t(error as Parameters<typeof t>[0])}
          </p>
        )}
        {setup ? (
          <Elements stripe={stripe} options={{ clientSecret: setup.clientSecret, appearance }}>
            <SaveCardForm organizationId={organizationId} />
          </Elements>
        ) : (
          <button
            disabled={pending || Boolean(returnedIntent)}
            className={billingButton}
            onClick={async () => {
              setPending(true)
              setError('')
              operationId.current ||= crypto.randomUUID()
              try {
                setSetup(
                  await billingRequest(organizationId, locale, {
                    action: 'setup',
                    operationId: operationId.current,
                  }),
                )
              } catch (error) {
                setError(
                  error instanceof Error && t.has(error.message as Parameters<typeof t.has>[0])
                    ? error.message
                    : 'genericError',
                )
              } finally {
                setPending(false)
              }
            }}
          >
            {t(pending ? 'working' : 'addCard')}
          </button>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">{t('securePayment')}</p>
      </section>
    </div>
  )
}
function SaveCardForm({ organizationId }: { organizationId: string }) {
  const stripe = useStripe(),
    elements = useElements(),
    t = useTranslations('Billing'),
    locale = useLocale(),
    router = useRouter()
  const [pending, setPending] = useState(false),
    [error, setError] = useState('')
  const operation = useRef<string | null>(null)
  const savedIntent = useRef<string | null>(null)
  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!stripe || !elements) return
        setPending(true)
        setError('')
        try {
          if (!savedIntent.current) {
            const result = await stripe.confirmSetup({
              elements,
              confirmParams: {
                return_url: `${window.location.origin}/${locale}/portal/billing/payment`,
              },
              redirect: 'if_required',
            })
            if (result.error) {
              setError(result.error.message || t('genericError'))
              return
            }
            savedIntent.current = result.setupIntent.id
          }
          operation.current ||= crypto.randomUUID()
          await billingRequest(organizationId, locale, {
            action: 'saveMethod',
            setupIntentId: savedIntent.current,
            operationId: operation.current,
          })
          router.replace(`/${locale}/portal/billing`)
        } catch {
          setError(t('genericError'))
        } finally {
          setPending(false)
        }
      }}
    >
      <PaymentElement />
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <button disabled={!stripe || pending} className={`${billingButton} w-full`}>
        {t(pending ? 'working' : 'saveCard')}
      </button>
    </form>
  )
}

export function PlanChangePage({ organizationId, plan }: { organizationId: string; plan: PlanId }) {
  const locale = useLocale(),
    t = useTranslations('Billing'),
    router = useRouter()
  const [quote, setQuote] = useState<ChangeQuote | null>(null),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [attempt, setAttempt] = useState(0)
  const operation = useRef<string | null>(null)
  useEffect(() => {
    let active = true
    void billingRequest<{ quote: ChangeQuote }>(organizationId, locale, { action: 'quote', plan })
      .then((result) => {
        if (active) setQuote(result.quote)
      })
      .catch((error) => {
        if (active) setError(t.has(error.message) ? error.message : 'genericError')
      })
    return () => {
      active = false
    }
  }, [organizationId, locale, plan, attempt, t])
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: quote?.currency || 'EUR' }).format(
      amount / 100,
    )
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link className="text-sm text-muted-foreground" href="/portal/billing">
        ← {t('backBilling')}
      </Link>
      <section className={`${billingCard} space-y-5`}>
        <h1 className="text-2xl font-semibold">{t('changeTitle')}</h1>
        <h2 className="text-lg">Taxful {t(plan)}</h2>
        {error && (
          <p role="alert" className="rounded-xl bg-error/10 p-4 text-sm text-error">
            {t(error as Parameters<typeof t>[0])}
          </p>
        )}
        {quote && (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {quote.kind === 'upgrade'
                ? t('upgradeHelp')
                : t('downgradeHelp', {
                    date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                      quote.effectiveAt * 1000,
                    ),
                  })}
            </p>
            <dl className="space-y-4 rounded-2xl bg-primary/10 p-5">
              <div className="flex justify-between gap-4">
                <dt>{t('monthlyPrice')}</dt>
                <dd className="font-semibold">{money(quote.monthlyAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-primary/20 pt-4">
                <dt>{t('dueToday')}</dt>
                <dd className="text-2xl font-semibold">{money(quote.amount)}</dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('quoteTerms')}</p>
            <button
              className={`${billingButton} w-full`}
              disabled={pending || Boolean(error)}
              onClick={async () => {
                setPending(true)
                setError('')
                operation.current ||= crypto.randomUUID()
                try {
                  await billingRequest(organizationId, locale, {
                    action: 'change',
                    quoteId: quote.id,
                    operationId: operation.current,
                  })
                  router.replace(`/${locale}/portal/billing?changed=true`)
                } catch (error) {
                  setError(
                    error instanceof Error && t.has(error.message as Parameters<typeof t.has>[0])
                      ? error.message
                      : 'genericError',
                  )
                } finally {
                  setPending(false)
                }
              }}
            >
              {t(
                pending
                  ? 'working'
                  : quote.kind === 'upgrade'
                    ? 'confirmUpgrade'
                    : 'confirmDowngrade',
                { amount: money(quote.amount) },
              )}
            </button>
          </>
        )}
        {error && (
          <button
            className={billingSecondary}
            disabled={pending}
            onClick={() => {
              setError('')
              setQuote(null)
              operation.current = null
              setAttempt(attempt + 1)
            }}
          >
            {t('newQuote')}
          </button>
        )}
        {!quote && !error && <p role="status">{t('loadingBilling')}</p>}
      </section>
    </div>
  )
}
