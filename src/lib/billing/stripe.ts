import Stripe from 'stripe'
import { createHash } from 'node:crypto'
import type { PoolClient } from 'pg'
import { customerPool } from '../customer-auth/database'
import type { DocumentContext } from '../documents/access'
import { DocumentError } from '../documents/config'
import { billingAudit, ownerTransaction } from './service'
import { billingLock } from './usage'
import type { Plan, PlanId } from './plans'

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  // Live billing must be explicitly implemented and reviewed before activation.
  if (!key?.startsWith('sk_test_')) throw new DocumentError('billingUnavailable', 503)
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 15000 })
}
export const billingReady = () => Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))
function returnURL(locale: string) {
  return new URL(`/${locale}/portal/billing`, process.env.BETTER_AUTH_URL).href
}
export async function checkout(
  context: DocumentContext,
  planId: PlanId,
  locale: string,
  embedded = false,
) {
  return ownerTransaction(context, async (client) => {
    const stripe = stripeClient()
    if (!billingReady() || planId === 'free') throw new DocumentError('billingUnavailable', 503)
    await client.query(
      'INSERT INTO customer_auth.billing_customers(organization_id) VALUES($1) ON CONFLICT DO NOTHING',
      [context.organizationId],
    )
    const {
      rows: [customer],
    } = await client.query(
      'SELECT * FROM customer_auth.billing_customers WHERE organization_id=$1 FOR UPDATE',
      [context.organizationId],
    )
    const {
      rows: [plan],
    } = await client.query<Plan>(
      'SELECT * FROM customer_auth.billing_plans WHERE id=$1 AND published',
      [planId],
    )
    if (!plan?.stripe_price_id) throw new DocumentError('billingUnavailable', 503)
    if (!customer.provider_customer_id) {
      const created = await stripe.customers.create(
        { metadata: { organizationId: context.organizationId } },
        { idempotencyKey: `taxful-customer-${context.organizationId}` },
      )
      customer.provider_customer_id = created.id
      await client.query(
        'UPDATE customer_auth.billing_customers SET provider_customer_id=$2 WHERE organization_id=$1',
        [context.organizationId, created.id],
      )
    }
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.provider_customer_id,
      status: 'all',
      limit: 100,
    })
    if (
      subscriptions.has_more ||
      subscriptions.data.some((sub) => !['canceled', 'incomplete_expired'].includes(sub.status))
    )
      throw new DocumentError('useBillingPortal', 409)
    // Recover an open session even if Stripe succeeded but the local commit was lost.
    const open = await stripe.checkout.sessions.list({
      customer: customer.provider_customer_id,
      status: 'open',
      limit: 100,
    })
    if (open.has_more) throw new DocumentError('billingConflict', 409)
    let reusable: string | undefined
    for (const item of open.data) {
      const previous = await stripe.checkout.sessions.retrieve(item.id, { expand: ['line_items'] })
      if (previous.status === 'open') {
        if (
          !reusable &&
          previous.line_items?.data[0]?.price?.id === plan.stripe_price_id &&
          (embedded ? previous.ui_mode === 'elements' && previous.client_secret : previous.url)
        )
          reusable = (embedded ? previous.client_secret : previous.url)!
        else await stripe.checkout.sessions.expire(previous.id)
      }
    }
    if (reusable) return reusable
    // Only a server-selected, published recurring EUR price can reach Checkout.
    const price = await stripe.prices.retrieve(plan.stripe_price_id)
    if (
      !price.active ||
      price.currency !== 'eur' ||
      price.recurring?.interval !== 'month' ||
      price.recurring.interval_count !== 1 ||
      price.unit_amount !== plan.monthly_price_cents
    )
      throw new DocumentError('billingUnavailable', 503)
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customer.provider_customer_id,
        line_items: [{ price: price.id, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: context.organizationId,
        subscription_data: { metadata: { organizationId: context.organizationId } },
        ...(embedded
          ? { ui_mode: 'elements' as const, return_url: returnURL(locale) + '?checkout=returned' }
          : {
              success_url: returnURL(locale) + '?checkout=returned',
              cancel_url: returnURL(locale),
            }),
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        tax_id_collection: { enabled: true },
        customer_update: { name: 'auto', address: 'auto' },
      },
      {
        idempotencyKey: `checkout-${embedded ? 'elements' : 'hosted'}-${context.organizationId}-${plan.stripe_price_id}-${customer.checkout_id || 'first'}`,
      },
    )
    if (!(embedded ? session.client_secret : session.url))
      throw new DocumentError('billingUnavailable', 503)
    await client.query(
      'UPDATE customer_auth.billing_customers SET checkout_id=$2,checkout_plan=$3,checkout_url=$4,checkout_expires_at=to_timestamp($5) WHERE organization_id=$1',
      [context.organizationId, session.id, planId, session.url, session.expires_at],
    )
    await billingAudit(client, context, 'checkout_created', { plan: planId })
    return (embedded ? session.client_secret : session.url)!
  })
}
export async function customerPortal(context: DocumentContext, locale: string) {
  return ownerTransaction(context, async (client) => {
    const {
      rows: [customer],
    } = await client.query(
      'SELECT provider_customer_id,operation_at FROM customer_auth.billing_customers WHERE organization_id=$1',
      [context.organizationId],
    )
    if (!customer?.provider_customer_id) throw new DocumentError('billingUnavailable', 503)
    if (customer.operation_at && Date.now() - new Date(customer.operation_at).getTime() < 5000)
      throw new DocumentError('tooManyRequests', 429)
    const stripe = stripeClient()
    const catalog = await client.query<Plan>(
      "SELECT * FROM customer_auth.billing_plans WHERE published AND id<>'free' AND stripe_price_id IS NOT NULL ORDER BY id",
    )
    const products = catalog.rows.map((plan) => ({
      product: plan.stripe_product_id!,
      prices: [plan.stripe_price_id!],
    }))
    const hash = createHash('sha256').update(JSON.stringify(products)).digest('hex').slice(0, 24)
    const configuration = await stripe.billingPortal.configurations.create(
      {
        business_profile: { headline: 'Taxful subscription management' },
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          customer_update: { enabled: true, allowed_updates: ['address', 'name', 'tax_id'] },
          subscription_cancel: { enabled: true, mode: 'at_period_end', proration_behavior: 'none' },
          subscription_update: {
            enabled: products.length > 0,
            default_allowed_updates: ['price'],
            products,
            proration_behavior: 'always_invoice',
            schedule_at_period_end: { conditions: [{ type: 'decreasing_item_amount' }] },
          },
        },
      },
      { idempotencyKey: `portal-config-v1-${hash}` },
    )
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.provider_customer_id,
      configuration: configuration.id,
      return_url: returnURL(locale),
    })
    await client.query(
      'UPDATE customer_auth.billing_customers SET operation_at=now() WHERE organization_id=$1',
      [context.organizationId],
    )
    await billingAudit(client, context, 'portal_opened')
    return session.url
  })
}
function providerId(value: string | { id: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id
}
export async function syncCustomer(
  client: PoolClient,
  organizationId: string,
  customerId: string,
  stripe = stripeClient(),
) {
  // Retrieve current provider state under a per-company lock: delayed events cannot restore old plans.
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  })
  const live = subscriptions.data.filter(
    (sub) => !['canceled', 'incomplete_expired'].includes(sub.status),
  )
  if (subscriptions.has_more || live.length > 1) throw new DocumentError('billingConflict', 409)
  const sub = live[0] || subscriptions.data.sort((a, b) => b.created - a.created)[0]
  let planId: PlanId = 'free'
  if (sub) {
    const item = sub.items.data[0]
    if (sub.items.data.length !== 1 || item.quantity !== 1)
      throw new DocumentError('billingConflict', 409)
    const {
      rows: [plan],
    } = await client.query<{ plan_id: PlanId }>(
      'SELECT plan_id FROM customer_auth.billing_price_history WHERE stripe_price_id=$1',
      [item.price.id],
    )
    if (!plan) throw new DocumentError('billingConflict', 409)
    planId = plan.plan_id
  }
  // Do not grant an unpaid upgrade just because Stripe still calls the subscription active.
  const prior = await client.query(
    'SELECT plan_id,current_period_end FROM customer_auth.billing_subscriptions WHERE organization_id=$1',
    [organizationId],
  )
  let periodEnd = sub?.items.data[0]?.current_period_end || null
  let paymentConfirmed = false
  let graceEnd = Math.floor(Date.now() / 1000) + 7 * 86400
  if (sub && sub.status !== 'trialing' && sub.latest_invoice) {
    const invoice = await stripe.invoices.retrieve(providerId(sub.latest_invoice)!)
    paymentConfirmed = invoice.status === 'paid'
    graceEnd = (invoice.due_date || invoice.created || Math.floor(Date.now() / 1000)) + 7 * 86400
    if (invoice.status !== 'paid') {
      planId = prior.rows[0]?.plan_id || 'free'
      if (sub.status === 'active')
        periodEnd = prior.rows[0]?.current_period_end
          ? Math.floor(new Date(prior.rows[0].current_period_end).getTime() / 1000)
          : null
    }
  }
  await client.query(
    `INSERT INTO customer_auth.billing_subscriptions(organization_id,provider_subscription_id,plan_id,status,current_period_end,cancel_at_period_end,grace_until,synced_at)
    VALUES($1,$2,$3,$4,to_timestamp($5),$6,CASE WHEN $4='past_due' THEN to_timestamp($7) ELSE NULL END,now())
    ON CONFLICT(organization_id) DO UPDATE SET provider_subscription_id=EXCLUDED.provider_subscription_id,plan_id=EXCLUDED.plan_id,status=EXCLUDED.status,
    current_period_end=EXCLUDED.current_period_end,cancel_at_period_end=EXCLUDED.cancel_at_period_end,
    grace_until=CASE WHEN EXCLUDED.status='past_due' THEN COALESCE(billing_subscriptions.grace_until,EXCLUDED.grace_until) ELSE NULL END,synced_at=now(),updated_at=now()`,
    [
      organizationId,
      sub?.id || null,
      planId,
      sub?.status || 'free',
      periodEnd,
      sub?.cancel_at_period_end || false,
      graceEnd,
    ],
  )
  if (sub?.status === 'active' && paymentConfirmed && planId !== 'free') {
    // End only grants issued before this subscription began. A deliberate later
    // staff benefit remains valid, and unpaid checkout never removes trial access.
    const ended = await client.query(
      `UPDATE customer_auth.billing_plan_grants SET expires_at=now()
       WHERE organization_id=$1 AND expires_at>now() AND created_at<=to_timestamp($2)
       RETURNING plan_id`,
      [organizationId, sub.start_date || sub.created],
    )
    if (ended.rowCount)
      await client.query(
        `INSERT INTO customer_auth.billing_audit_events(organization_id,event,details)
         VALUES($1,'complimentary_ended',$2)`,
        [
          organizationId,
          { previousPlan: ended.rows[0].plan_id, paidPlan: planId, subscriptionId: sub.id },
        ],
      )
  }
  // The provider owns the billing invoices; keep a tenant-scoped display mirror.
  const invoices = await stripe.invoices.list({ customer: customerId, limit: 100 })
  for (const invoice of invoices.data) await storeInvoice(client, organizationId, invoice)
}
async function storeInvoice(client: PoolClient, organizationId: string, invoice: Stripe.Invoice) {
  await client.query(
    `INSERT INTO customer_auth.billing_invoices(provider_invoice_id,organization_id,number,status,currency,total,amount_paid,hosted_url,pdf_url,issued_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,to_timestamp($10)) ON CONFLICT(provider_invoice_id) DO UPDATE SET
    status=EXCLUDED.status,total=EXCLUDED.total,amount_paid=EXCLUDED.amount_paid,hosted_url=EXCLUDED.hosted_url,pdf_url=EXCLUDED.pdf_url`,
    [
      invoice.id,
      organizationId,
      invoice.number,
      invoice.status || 'draft',
      invoice.currency,
      invoice.total,
      invoice.amount_paid,
      invoice.hosted_invoice_url,
      invoice.invoice_pdf,
      invoice.created,
    ],
  )
}
export async function handleStripeEvent(event: Stripe.Event, stripe = stripeClient()) {
  if (event.livemode) throw new DocumentError('invalidWebhook', 400)
  if (
    !event.type.startsWith('customer.subscription.') &&
    !event.type.startsWith('invoice.') &&
    !event.type.startsWith('checkout.session.')
  )
    return
  const object = event.data.object as { customer?: string | { id: string } | null }
  const customerId = providerId(object.customer)
  if (!customerId) return
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    const {
      rows: [customer],
    } = await client.query(
      'SELECT organization_id FROM customer_auth.billing_customers WHERE provider_customer_id=$1',
      [customerId],
    )
    if (!customer) {
      await client.query('COMMIT')
      return
    }
    await billingLock(client, customer.organization_id)
    const inserted = await client.query(
      'INSERT INTO customer_auth.billing_webhook_events(provider_event_id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING provider_event_id',
      [event.id, event.type],
    )
    if (inserted.rowCount) {
      await syncCustomer(client, customer.organization_id, customerId, stripe)
      if (event.type.startsWith('invoice.')) {
        const invoice = await stripe.invoices.retrieve((event.data.object as Stripe.Invoice).id)
        await storeInvoice(client, customer.organization_id, invoice)
      }
      await client.query(
        "INSERT INTO customer_auth.billing_audit_events(organization_id,event,details) VALUES($1,'provider_synced',$2)",
        [customer.organization_id, { type: event.type, eventId: event.id }],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
