import { createHash, randomUUID } from 'node:crypto'
import type Stripe from 'stripe'
import type { PoolClient } from 'pg'
import { z } from 'zod'
import type { DocumentContext } from '../documents/access'
import { DocumentError } from '../documents/config'
import { ownerTransaction, billingAudit } from './service'
import { stripeClient, syncCustomer } from './stripe'
import { planIds, type Plan, type PlanId } from './plans'

const ref = (value: string | { id: string } | null | undefined) =>
  typeof value === 'string' ? value : value?.id
const common = { organizationId: z.string().max(200), locale: z.enum(['de', 'en']) }
const mutation = { ...common, operationId: z.string().uuid() }
export const managementSchema = z.discriminatedUnion('action', [
  z.object({ ...common, action: z.literal('view') }).strict(),
  z.object({ ...common, action: z.literal('checkout'), plan: z.enum(planIds) }).strict(),
  z.object({ ...common, action: z.literal('quote'), plan: z.enum(planIds) }).strict(),
  z.object({ ...mutation, action: z.literal('change'), quoteId: z.string().uuid() }).strict(),
  z
    .object({
      ...mutation,
      action: z.enum(['cancel', 'resume', 'undoChange', 'setup', 'retryPayment']),
    })
    .strict(),
  z
    .object({ ...mutation, action: z.literal('saveMethod'), setupIntentId: z.string().max(200) })
    .strict(),
  z
    .object({
      ...mutation,
      action: z.enum(['defaultMethod', 'removeMethod']),
      paymentMethodId: z.string().max(200),
    })
    .strict(),
  z
    .object({
      ...mutation,
      action: z.literal('details'),
      name: z.string().trim().min(1).max(200),
      email: z.string().email().max(254),
      address: z
        .object({
          line1: z.string().trim().min(1).max(200),
          line2: z.string().trim().max(200),
          city: z.string().trim().min(1).max(100),
          postal_code: z.string().trim().min(1).max(20),
          country: z.string().regex(/^[A-Z]{2}$/),
        })
        .strict(),
    })
    .strict(),
])
export type ManagementInput = z.infer<typeof managementSchema>

export async function billingRequestLimit(context: DocumentContext) {
  return ownerTransaction(context, async (client) => {
    const result = await client.query(
      `INSERT INTO customer_auth.billing_request_limits(organization_id) VALUES($1)
      ON CONFLICT(organization_id) DO UPDATE SET
      requests=CASE WHEN billing_request_limits.window_started<now()-interval '1 minute' THEN 1 ELSE billing_request_limits.requests+1 END,
      window_started=CASE WHEN billing_request_limits.window_started<now()-interval '1 minute' THEN now() ELSE billing_request_limits.window_started END
      WHERE billing_request_limits.requests<40 OR billing_request_limits.window_started<now()-interval '1 minute' RETURNING requests`,
      [context.organizationId],
    )
    if (!result.rowCount) throw new DocumentError('tooManyRequests', 429)
  })
}

async function state(client: PoolClient, org: string, stripe: Stripe) {
  const row = await client.query(
    'SELECT provider_customer_id FROM customer_auth.billing_customers WHERE organization_id=$1',
    [org],
  )
  const customerId: string | undefined = row.rows[0]?.provider_customer_id
  if (!customerId) return null
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted || customer.livemode) throw new DocumentError('billingConflict', 409)
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  })
  const live = subscriptions.data.filter(
    (sub) => !['canceled', 'incomplete_expired'].includes(sub.status),
  )
  if (subscriptions.has_more || live.length > 1) throw new DocumentError('billingConflict', 409)
  const subscription = live[0] || null
  if (
    subscription &&
    (subscription.items.data.length !== 1 || subscription.items.data[0].quantity !== 1)
  )
    throw new DocumentError('billingConflict', 409)
  return { customer, subscription }
}

export async function managementOverview(context: DocumentContext) {
  return ownerTransaction(context, async (client) => {
    const stripe = stripeClient(),
      current = await state(client, context.organizationId, stripe)
    if (!current) return null
    const { customer, subscription: sub } = current
    const methods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
      limit: 100,
    })
    const defaultId =
      ref(sub?.default_payment_method) || ref(customer.invoice_settings.default_payment_method)
    const schedule = sub?.schedule
      ? await stripe.subscriptionSchedules.retrieve(ref(sub.schedule)!)
      : null
    const next = schedule?.phases.find(
      (phase) => phase.start_date >= (sub?.items.data[0].current_period_end || Infinity),
    )
    const nextPrice = ref(next?.items[0]?.price)
    const nextPlan = nextPrice
      ? (
          await client.query(
            'SELECT plan_id FROM customer_auth.billing_price_history WHERE stripe_price_id=$1',
            [nextPrice],
          )
        ).rows[0]?.plan_id
      : null
    const invoice = sub?.latest_invoice
      ? await stripe.invoices.retrieve(ref(sub.latest_invoice)!)
      : null
    return {
      name: customer.name || '',
      email: customer.email || '',
      address: customer.address,
      methods: methods.data.map((method) => ({
        id: method.id,
        brand: method.card?.brand || 'card',
        last4: method.card?.last4 || '',
        expMonth: method.card?.exp_month,
        expYear: method.card?.exp_year,
        isDefault: method.id === defaultId,
      })),
      subscription: sub
        ? {
            status: sub.status,
            canceling: sub.cancel_at_period_end,
            periodEnd: sub.items.data[0].current_period_end,
            monthlyAmount: sub.items.data[0].price.unit_amount,
            currency: sub.currency,
            pending: Boolean(sub.pending_update),
            scheduledPlan: nextPlan as PlanId | null,
            scheduledAt: next?.start_date || null,
            hasSchedule: Boolean(schedule),
            invoiceDue:
              invoice?.status === 'open'
                ? {
                    amount: invoice.amount_remaining,
                    currency: invoice.currency,
                    url: invoice.hosted_invoice_url,
                  }
                : null,
          }
        : null,
    }
  })
}
export type ManagementOverview = Awaited<ReturnType<typeof managementOverview>>

async function publishedPrice(client: PoolClient, stripe: Stripe, planId: PlanId) {
  const {
    rows: [plan],
  } = await client.query<Plan>(
    'SELECT * FROM customer_auth.billing_plans WHERE id=$1 AND published',
    [planId],
  )
  if (!plan?.stripe_price_id || planId === 'free')
    throw new DocumentError('billingUnavailable', 409)
  const price = await stripe.prices.retrieve(plan.stripe_price_id)
  if (
    !price.active ||
    price.currency !== 'eur' ||
    price.recurring?.interval !== 'month' ||
    price.recurring.interval_count !== 1 ||
    price.unit_amount !== plan.monthly_price_cents
  )
    throw new DocumentError('billingConflict', 409)
  return { plan, price }
}
function fingerprint(sub: Stripe.Subscription, customer: Stripe.Customer) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        id: sub.id,
        item: sub.items.data[0],
        status: sub.status,
        cancel: sub.cancel_at_period_end,
        schedule: ref(sub.schedule),
        pending: sub.pending_update,
        discounts: sub.discounts,
        tax: sub.default_tax_rates,
        autoTax: sub.automatic_tax,
        invoice: ref(sub.latest_invoice),
        balance: customer.balance,
        address: customer.address,
      }),
    )
    .digest('hex')
}
function canChange(sub: Stripe.Subscription | null) {
  if (
    !sub ||
    sub.status !== 'active' ||
    sub.collection_method !== 'charge_automatically' ||
    sub.pending_update ||
    sub.schedule ||
    sub.cancel_at_period_end
  )
    throw new DocumentError('resolveSubscription', 409)
  const price = sub.items.data[0].price
  if (
    price.currency !== 'eur' ||
    price.recurring?.interval !== 'month' ||
    price.recurring.interval_count !== 1
  )
    throw new DocumentError('billingConflict', 409)
}
type Quote = {
  subscriptionId: string
  source: string
  targetPrice: string
  plan: PlanId
  amount: number
  monthlyAmount: number
  currency: string
  kind: 'upgrade' | 'downgrade'
  prorationDate: number
  periodEnd: number
  itemId: string
}
async function preview(stripe: Stripe, customerId: string, quote: Quote) {
  return stripe.invoices.createPreview({
    customer: customerId,
    subscription: quote.subscriptionId,
    subscription_details: {
      items: [{ id: quote.itemId, price: quote.targetPrice }],
      proration_date: quote.prorationDate,
      proration_behavior: 'always_invoice',
    },
  })
}
export async function quoteChange(context: DocumentContext, planId: PlanId) {
  return ownerTransaction(context, async (client) => {
    const stripe = stripeClient(),
      current = await state(client, context.organizationId, stripe)
    if (!current) throw new DocumentError('resolveSubscription', 409)
    canChange(current.subscription)
    await syncCustomer(client, context.organizationId, current.customer.id, stripe)
    const sub = current.subscription!,
      { price, plan } = await publishedPrice(client, stripe, planId)
    const item = sub.items.data[0]
    if (item.price.id === price.id) throw new DocumentError('samePlan', 409)
    const latest = sub.latest_invoice
      ? await stripe.invoices.retrieve(ref(sub.latest_invoice)!)
      : null
    if (latest?.status !== 'paid') throw new DocumentError('resolveSubscription', 409)
    const quote: Quote = {
      subscriptionId: sub.id,
      source: fingerprint(sub, current.customer),
      targetPrice: price.id,
      plan: planId,
      amount: 0,
      monthlyAmount: plan.monthly_price_cents,
      currency: price.currency,
      kind: price.unit_amount! > (item.price.unit_amount || 0) ? 'upgrade' : 'downgrade',
      prorationDate: Math.floor(Date.now() / 1000),
      periodEnd: item.current_period_end,
      itemId: item.id,
    }
    if (quote.kind === 'upgrade')
      quote.amount = (await preview(stripe, current.customer.id, quote)).amount_due
    const id = randomUUID(),
      expiresAt = new Date(Date.now() + 10 * 60000)
    await client.query(
      'INSERT INTO customer_auth.billing_change_quotes(id,organization_id,actor_id,data,expires_at) VALUES($1,$2,$3,$4,$5)',
      [id, context.organizationId, context.userId, quote, expiresAt],
    )
    return {
      id,
      plan: quote.plan,
      kind: quote.kind,
      amount: quote.amount,
      monthlyAmount: quote.monthlyAmount,
      currency: quote.currency,
      effectiveAt: quote.kind === 'upgrade' ? quote.prorationDate : quote.periodEnd,
      expiresAt,
    }
  })
}
export type ChangeQuote = Awaited<ReturnType<typeof quoteChange>>

// Commit intent before provider writes. Retrying the same operation uses identical
// provider idempotency keys even if the response or final local commit was lost.
export async function manageMutation(
  context: DocumentContext,
  input: ManagementInput & { operationId: string },
) {
  await ownerTransaction(context, async (client) => {
    await client.query(
      'INSERT INTO customer_auth.billing_operations(id,organization_id,actor_id,kind,input) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [input.operationId, context.organizationId, context.userId, input.action, input],
    )
    const {
      rows: [operation],
    } = await client.query(
      'SELECT *,input=$2::jsonb AS matches FROM customer_auth.billing_operations WHERE id=$1',
      [input.operationId, input],
    )
    if (
      operation.organization_id !== context.organizationId ||
      operation.actor_id !== context.userId ||
      !operation.matches
    )
      throw new DocumentError('conflict', 409)
    if (Date.now() - new Date(operation.created_at).getTime() > 23 * 3600000)
      throw new DocumentError('quoteExpired', 409)
  })
  return ownerTransaction(context, async (client) => {
    const stripe = stripeClient(),
      current = await state(client, context.organizationId, stripe)
    if (!current) throw new DocumentError('billingUnavailable', 409)
    const { customer, subscription: sub } = current
    const {
      rows: [operation],
    } = await client.query(
      'SELECT * FROM customer_auth.billing_operations WHERE id=$1 FOR UPDATE',
      [input.operationId],
    )
    const key = (suffix: string) => ({ idempotencyKey: `taxful-${input.operationId}-${suffix}` })
    if (operation.result)
      return operation.result as { ok: boolean; setupIntentId?: string; paymentPending?: boolean }
    let result: { ok: boolean; setupIntentId?: string; paymentPending?: boolean } = { ok: true }
    if (input.action === 'details') {
      await stripe.customers.update(
        customer.id,
        { name: input.name, email: input.email, address: input.address },
        key('details'),
      )
    } else if (input.action === 'setup') {
      const intent = await stripe.setupIntents.create(
        {
          customer: customer.id,
          payment_method_types: ['card'],
          usage: 'off_session',
          metadata: { taxfulOperation: input.operationId },
        },
        key('setup'),
      )
      result = { ok: true, setupIntentId: intent.id }
    } else if (input.action === 'saveMethod') {
      const intent = await stripe.setupIntents.retrieve(input.setupIntentId)
      const owned = await client.query(
        "SELECT 1 FROM customer_auth.billing_operations WHERE organization_id=$1 AND kind='setup' AND result->>'setupIntentId'=$2",
        [context.organizationId, intent.id],
      )
      if (
        !owned.rowCount ||
        ref(intent.customer) !== customer.id ||
        intent.status !== 'succeeded' ||
        !ref(intent.payment_method)
      )
        throw new DocumentError('invalidRequest', 400)
      const method = await stripe.paymentMethods.retrieve(ref(intent.payment_method)!)
      if (ref(method.customer) !== customer.id) throw new DocumentError('forbidden', 403)
      if (sub?.schedule)
        await updateSchedulePayment(stripe, ref(sub.schedule)!, method.id, key('schedule-default'))
      await stripe.customers.update(
        customer.id,
        { invoice_settings: { default_payment_method: method.id } },
        key('customer-default'),
      )
      if (sub)
        await stripe.subscriptions.update(
          sub.id,
          { default_payment_method: method.id },
          key('sub-default'),
        )
    } else if (input.action === 'defaultMethod' || input.action === 'removeMethod') {
      const method = await stripe.paymentMethods.retrieve(input.paymentMethodId)
      if (ref(method.customer) !== customer.id) throw new DocumentError('forbidden', 403)
      if (input.action === 'removeMethod') {
        const isDefault = [
          ref(sub?.default_payment_method),
          ref(customer.invoice_settings.default_payment_method),
        ].includes(method.id)
        if (isDefault && sub) {
          const methods = await stripe.paymentMethods.list({
            customer: customer.id,
            type: 'card',
            limit: 100,
          })
          const replacements = methods.data.filter((candidate) => candidate.id !== method.id)
          if (replacements.length !== 1) throw new DocumentError('defaultMethodProtected', 409)
          const replacement = replacements[0]
          if (sub.schedule)
            await updateSchedulePayment(
              stripe,
              ref(sub.schedule)!,
              replacement.id,
              key('schedule-replacement'),
            )
          await stripe.customers.update(
            customer.id,
            { invoice_settings: { default_payment_method: replacement.id } },
            key('customer-replacement'),
          )
          await stripe.subscriptions.update(
            sub.id,
            { default_payment_method: replacement.id },
            key('sub-replacement'),
          )
        } else if (isDefault) {
          await stripe.customers.update(
            customer.id,
            { invoice_settings: { default_payment_method: '' } },
            key('clear-customer-default'),
          )
        }
        await stripe.paymentMethods.detach(method.id, {}, key('detach'))
      } else {
        if (sub?.schedule)
          await updateSchedulePayment(
            stripe,
            ref(sub.schedule)!,
            method.id,
            key('schedule-default'),
          )
        await stripe.customers.update(
          customer.id,
          { invoice_settings: { default_payment_method: method.id } },
          key('customer-default'),
        )
        if (sub)
          await stripe.subscriptions.update(
            sub.id,
            { default_payment_method: method.id },
            key('sub-default'),
          )
      }
    } else if (input.action === 'cancel' || input.action === 'resume') {
      if (!sub || sub.schedule) throw new DocumentError('resolveSubscription', 409)
      await stripe.subscriptions.update(
        sub.id,
        { cancel_at_period_end: input.action === 'cancel' },
        key('cancel'),
      )
    } else if (input.action === 'undoChange') {
      if (!sub) throw new DocumentError('resolveSubscription', 409)
      if (sub.schedule)
        await stripe.subscriptionSchedules.release(ref(sub.schedule)!, {}, key('release'))
    } else if (input.action === 'retryPayment') {
      if (!sub?.latest_invoice) throw new DocumentError('resolveSubscription', 409)
      const invoice = await stripe.invoices.retrieve(ref(sub.latest_invoice)!)
      if (ref(invoice.customer) !== customer.id) throw new DocumentError('forbidden', 403)
      if (invoice.status === 'open') {
        try {
          await stripe.invoices.pay(invoice.id, {}, key('pay'))
        } catch (error) {
          if (!(error instanceof Error && 'type' in error && error.type === 'StripeCardError'))
            throw error
          result.paymentPending = true
        }
      }
    } else if (input.action === 'change') {
      const {
        rows: [record],
      } = await client.query(
        'SELECT * FROM customer_auth.billing_change_quotes WHERE id=$1 AND organization_id=$2 AND actor_id=$3',
        [input.quoteId, context.organizationId, context.userId],
      )
      if (!record || !sub) throw new DocumentError('quoteExpired', 409)
      const quote = record.data as Quote
      if (sub.id !== quote.subscriptionId) throw new DocumentError('quoteExpired', 409)
      // Provider success may precede a lost local response. Never charge again.
      const alreadyApplied = sub.items.data[0].price.id === quote.targetPrice
      const alreadyPending = sub.pending_update?.subscription_items?.some(
        (item) => ref(item.price) === quote.targetPrice,
      )
      const schedule = sub.schedule
        ? await stripe.subscriptionSchedules.retrieve(ref(sub.schedule)!)
        : null
      let ownSchedule = schedule?.metadata?.taxfulQuote === input.quoteId
      if (schedule && !ownSchedule && quote.kind === 'downgrade') {
        // Recover the exact schedule created by this operation before a crash.
        // A different existing schedule makes Stripe reject this creation call.
        const recovered = await stripe.subscriptionSchedules.create(
          { from_subscription: sub.id },
          key('schedule'),
        )
        ownSchedule = recovered.id === schedule.id
      }
      if (!alreadyApplied && !alreadyPending && !ownSchedule) {
        if (
          new Date(record.expires_at) <= new Date() ||
          fingerprint(sub, customer) !== quote.source
        )
          throw new DocumentError('quoteExpired', 409)
        canChange(sub)
        const selected = await publishedPrice(client, stripe, quote.plan)
        if (selected.price.id !== quote.targetPrice) throw new DocumentError('quoteExpired', 409)
        if (quote.kind === 'upgrade') {
          if ((await preview(stripe, customer.id, quote)).amount_due !== quote.amount)
            throw new DocumentError('quoteExpired', 409)
          await stripe.subscriptions.update(
            sub.id,
            {
              items: [{ id: quote.itemId, price: quote.targetPrice }],
              proration_date: quote.prorationDate,
              proration_behavior: 'always_invoice',
              payment_behavior: 'pending_if_incomplete',
            },
            key('upgrade'),
          )
        } else {
          const created = await stripe.subscriptionSchedules.create(
            { from_subscription: sub.id },
            key('schedule'),
          )
          await configureDowngrade(stripe, created, sub, quote, input.quoteId, key('phases'))
        }
      } else if (ownSchedule && schedule && schedule.phases.length < 2) {
        await configureDowngrade(stripe, schedule, sub, quote, input.quoteId, key('phases'))
      }
    }
    await syncCustomer(client, context.organizationId, customer.id, stripe)
    await client.query('UPDATE customer_auth.billing_operations SET result=$2 WHERE id=$1', [
      input.operationId,
      result,
    ])
    await billingAudit(client, context, 'billing_' + input.action, {
      operationId: input.operationId,
    })
    return result
  })
}

async function updateSchedulePayment(
  stripe: Stripe,
  scheduleId: string,
  method: string,
  options: Stripe.RequestOptions,
) {
  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId)
  // Our schedules inherit this default. Do not silently overwrite bespoke phases
  // created elsewhere; those can be edited through the fallback billing portal.
  if (
    schedule.phases.some(
      (phase) => phase.end_date > Math.floor(Date.now() / 1000) && phase.default_payment_method,
    )
  )
    throw new DocumentError('resolveSubscription', 409)
  await stripe.subscriptionSchedules.update(
    scheduleId,
    { default_settings: { default_payment_method: method } },
    options,
  )
}

async function configureDowngrade(
  stripe: Stripe,
  schedule: Stripe.SubscriptionSchedule,
  sub: Stripe.Subscription,
  quote: Quote,
  quoteId: string,
  options: Stripe.RequestOptions,
) {
  const discounts = sub.discounts.map((discount) => ({ discount: ref(discount)! }))
  const defaults = {
    discounts,
    default_tax_rates: (sub.default_tax_rates || []).map((rate) => rate.id),
    automatic_tax: { enabled: sub.automatic_tax.enabled },
    collection_method: sub.collection_method,
  }
  const itemDefaults = {
    quantity: 1,
    discounts: sub.items.data[0].discounts.map((discount) => ({ discount: ref(discount)! })),
    tax_rates: sub.items.data[0].tax_rates?.map((rate) => rate.id),
  }
  await stripe.subscriptionSchedules.update(
    schedule.id,
    {
      end_behavior: 'release',
      metadata: { taxfulQuote: quoteId },
      proration_behavior: 'none',
      phases: [
        {
          ...defaults,
          start_date: schedule.current_phase!.start_date,
          end_date: quote.periodEnd,
          items: [{ ...itemDefaults, price: sub.items.data[0].price.id }],
          proration_behavior: 'none',
        },
        {
          ...defaults,
          start_date: quote.periodEnd,
          duration: { interval: 'month', interval_count: 1 },
          items: [{ ...itemDefaults, price: quote.targetPrice }],
          proration_behavior: 'none',
        },
      ],
    },
    options,
  )
}

export async function paymentSecret(context: DocumentContext, setupIntentId?: string) {
  return ownerTransaction(context, async (client) => {
    const stripe = stripeClient(),
      current = await state(client, context.organizationId, stripe)
    if (!current) throw new DocumentError('billingUnavailable', 409)
    if (setupIntentId) {
      const owned = await client.query(
        "SELECT 1 FROM customer_auth.billing_operations WHERE organization_id=$1 AND kind='setup' AND result->>'setupIntentId'=$2",
        [context.organizationId, setupIntentId],
      )
      if (!owned.rowCount) throw new DocumentError('forbidden', 403)
      const intent = await stripe.setupIntents.retrieve(setupIntentId)
      if (ref(intent.customer) !== current.customer.id) throw new DocumentError('forbidden', 403)
      return {
        clientSecret: intent.status === 'succeeded' ? null : intent.client_secret,
        intentId: intent.id,
      }
    }
    const invoiceId = ref(current.subscription?.latest_invoice)
    if (!invoiceId) return { clientSecret: null }
    const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['confirmation_secret'] })
    const secret = invoice.status === 'open' ? invoice.confirmation_secret?.client_secret : null
    if (!secret) return { clientSecret: null }
    const intent = await stripe.paymentIntents.retrieve(secret.split('_secret_')[0])
    if (ref(intent.customer) !== current.customer.id) throw new DocumentError('forbidden', 403)
    return { clientSecret: intent.status === 'requires_action' ? secret : null }
  })
}
