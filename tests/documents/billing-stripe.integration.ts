// Opt-in real Stripe TEST-mode regression. Only synthetic customer/subscription records are mutated.
import { config } from 'dotenv'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
config({ path: ['.env.local', '.env'] })
if (process.env.STRIPE_INTEGRATION !== 'true')
  throw new Error('Set STRIPE_INTEGRATION=true explicitly')
const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
const { stripeClient, syncCustomer, checkout } = await import('../../src/lib/billing/stripe')
const { ownerTransaction, billingOverview } = await import('../../src/lib/billing/service')
const { manageMutation, managementSchema, quoteChange, managementOverview, paymentSecret } =
  await import('../../src/lib/billing/management')
const { adminBillingDetails } = await import('../../src/lib/billing/admin')
const stripe = stripeClient(),
  org = randomUUID(),
  user = randomUUID()
const context = { organizationId: org, userId: user, role: 'owner' }
let customerId: string | undefined, subscriptionId: string | undefined
async function act(body: object, operationId = randomUUID()) {
  const input = managementSchema.parse({ ...body, organizationId: org, locale: 'en', operationId })
  if (!('operationId' in input)) throw new Error('Expected mutation')
  return manageMutation(context, input)
}
try {
  await pool.query(
    'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [user, 'Synthetic billing test', `${user}@example.test`],
  )
  await pool.query(
    'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
    [org, 'Synthetic billing test'],
  )
  await pool.query(
    'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
    [randomUUID(), org, user, 'owner'],
  )
  const customer = await stripe.customers.create({
    name: 'Synthetic Taxful billing regression',
    metadata: { syntheticTaxfulTest: org },
  })
  customerId = customer.id
  await pool.query(
    'INSERT INTO customer_auth.billing_customers(organization_id,provider_customer_id) VALUES($1,$2)',
    [org, customer.id],
  )
  const checkoutSecret = await checkout(context, 'starter', 'en', true)
  assert.match(checkoutSecret, /^cs_test_/)
  assert.equal(
    await checkout(context, 'starter', 'en', true),
    checkoutSecret,
    'open custom checkout is reused',
  )
  const sessions = await stripe.checkout.sessions.list({ customer: customer.id, status: 'open' })
  for (const session of sessions.data) await stripe.checkout.sessions.expire(session.id)
  console.log('Custom checkout creates and reuses a server-priced session.')
  const setup = await act({ action: 'setup' })
  assert.ok(setup.setupIntentId)
  assert.ok((await paymentSecret(context, setup.setupIntentId)).clientSecret)
  const confirmed = await stripe.setupIntents.confirm(setup.setupIntentId, {
    payment_method: 'pm_card_visa',
  })
  assert.equal(confirmed.status, 'succeeded')
  await act({ action: 'saveMethod', setupIntentId: setup.setupIntentId })
  const goodMethod =
    typeof confirmed.payment_method === 'string'
      ? confirmed.payment_method
      : confirmed.payment_method!.id
  const { rows: plans } = await pool.query(
    "SELECT id,stripe_price_id FROM customer_auth.billing_plans WHERE id IN ('starter','professional','business') AND published",
  )
  const prices = Object.fromEntries(plans.map((plan) => [plan.id, plan.stripe_price_id]))
  assert.ok(prices.starter && prices.professional && prices.business)
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: prices.starter }],
    default_payment_method: goodMethod,
    payment_behavior: 'error_if_incomplete',
    metadata: { syntheticTaxfulTest: org },
  })
  subscriptionId = subscription.id
  assert.equal(subscription.status, 'active')
  await ownerTransaction(context, (client) => syncCustomer(client, org, customer.id, stripe))
  assert.equal((await billingOverview(context)).plan.id, 'starter')
  const quote = await quoteChange(context, 'professional')
  assert.equal(quote.kind, 'upgrade')
  assert.ok(quote.amount > 0)
  const op = randomUUID()
  await act({ action: 'change', quoteId: quote.id }, op)
  const invoicesBeforeReplay = (await stripe.invoices.list({ customer: customer.id })).data.length
  await act({ action: 'change', quoteId: quote.id }, op)
  assert.equal(
    (await stripe.invoices.list({ customer: customer.id })).data.length,
    invoicesBeforeReplay,
  )
  assert.equal((await billingOverview(context)).plan.id, 'professional')
  await assert.rejects(() => act({ action: 'cancel' }, op), /conflict/)
  console.log('Paid upgrade, immutable intent and duplicate-payment protection passed.')
  const down = await quoteChange(context, 'starter')
  assert.equal(down.kind, 'downgrade')
  assert.equal(down.amount, 0)
  await act({ action: 'change', quoteId: down.id })
  const scheduled = await managementOverview(context)
  assert.equal(scheduled?.subscription?.scheduledPlan, 'starter')
  assert.equal(
    (await billingOverview(context)).plan.id,
    'professional',
    'downgrade waits until renewal',
  )
  await act({ action: 'defaultMethod', paymentMethodId: goodMethod })
  await act({ action: 'undoChange' })
  assert.equal((await managementOverview(context))?.subscription?.hasSchedule, false)
  await act({ action: 'cancel' })
  assert.equal((await managementOverview(context))?.subscription?.canceling, true)
  await act({ action: 'resume' })
  assert.equal((await managementOverview(context))?.subscription?.canceling, false)
  console.log(
    'Scheduled downgrade, saved-card consistency, undo, cancellation and resumption passed.',
  )
  const bad = await stripe.paymentMethods.attach('pm_card_chargeCustomerFail', {
    customer: customer.id,
  })
  await act({ action: 'defaultMethod', paymentMethodId: bad.id })
  const failedQuote = await quoteChange(context, 'business')
  await act({ action: 'change', quoteId: failedQuote.id })
  assert.equal((await managementOverview(context))?.subscription?.pending, true)
  assert.equal(
    (await billingOverview(context)).plan.id,
    'professional',
    'failed upgrade never grants Business',
  )
  await act({ action: 'defaultMethod', paymentMethodId: goodMethod })
  await act({ action: 'retryPayment' })
  assert.equal((await billingOverview(context)).plan.id, 'business')
  await act({ action: 'removeMethod', paymentMethodId: goodMethod })
  assert.equal(
    (await managementOverview(context))?.methods.find((method) => method.id === bad.id)?.isDefault,
    true,
    'the only replacement becomes the default before the old default is removed',
  )
  await assert.rejects(
    () => act({ action: 'removeMethod', paymentMethodId: bad.id }),
    /defaultMethodProtected/,
  )
  const staffView = await adminBillingDetails(org)
  assert.equal(staffView?.paymentMethods[0]?.last4, '0341')
  assert.equal('number' in (staffView?.paymentMethods[0] || {}), false)
  console.log(
    'Declined upgrade retains paid access; replacing card and retrying payment activates the upgrade.',
  )
  // Entirely synthetic billing details, supplied explicitly as a simulated form submission.
  await act({
    action: 'details',
    name: 'Synthetic Company',
    email: 'billing@example.test',
    address: {
      line1: 'Test street 1',
      line2: '',
      city: 'Berlin',
      postal_code: '10115',
      country: 'DE',
    },
  })
  assert.equal((await managementOverview(context))?.name, 'Synthetic Company')
  await pool.query(
    "INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id) VALUES($1,'professional',now()+interval '30 days','Synthetic gift',1)",
    [org],
  )
  assert.equal(
    (await billingOverview(context)).plan.id,
    'business',
    'gift must not reduce a higher paid plan',
  )
  console.log('Billing details and gifted/paid access separation passed.')
} catch (error) {
  console.error('Stripe test failed:', error instanceof Error ? error.message : 'unknown')
  process.exitCode = 1
} finally {
  if (subscriptionId)
    await stripe.subscriptions
      .cancel(subscriptionId)
      .catch(() => console.error('Synthetic subscription cleanup needs retry.'))
  if (customerId)
    await stripe.customers
      .del(customerId)
      .catch(() => console.error('Synthetic customer cleanup needs retry.'))
  await pool.query(
    "DELETE FROM customer_auth.billing_webhook_events WHERE provider_event_id IN (SELECT details->>'eventId' FROM customer_auth.billing_audit_events WHERE organization_id=$1)",
    [org],
  )
  await pool.query('DELETE FROM customer_auth.organizations WHERE id=$1', [org])
  await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
  await pool.end()
  console.log('Synthetic billing records cleaned up.')
}
