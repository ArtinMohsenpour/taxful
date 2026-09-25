import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import Stripe from 'stripe'
import { effectivePlan } from '../../src/lib/billing/plans'

test('paid access expires and failed payments have a bounded grace period', () => {
  const now = new Date('2026-09-24T12:00:00Z'),
    future = new Date('2026-10-01T00:00:00Z'),
    past = new Date('2026-09-23T00:00:00Z')
  const sub = {
    plan_id: 'professional' as const,
    status: 'active',
    current_period_end: future,
    grace_until: null,
  }
  assert.equal(effectivePlan(sub, now), 'professional')
  assert.equal(effectivePlan({ ...sub, current_period_end: past }, now), 'free')
  assert.equal(
    effectivePlan({ ...sub, status: 'past_due', grace_until: future }, now),
    'professional',
  )
  assert.equal(effectivePlan({ ...sub, status: 'past_due', grace_until: past }, now), 'free')
  for (const status of ['unpaid', 'paused', 'canceled', 'incomplete', 'incomplete_expired'])
    assert.equal(effectivePlan({ ...sub, status }, now), 'free')
})
test('Stripe signatures reject tampering and expired replay timestamps', () => {
  const stripe = new Stripe('sk_test_synthetic'),
    secret = 'whsec_synthetic',
    payload = JSON.stringify({ id: 'evt_synthetic', type: 'invoice.paid' })
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret })
  assert.equal(stripe.webhooks.constructEvent(payload, header, secret).id, 'evt_synthetic')
  assert.throws(() => stripe.webhooks.constructEvent(payload + ' ', header, secret))
  assert.throws(() => stripe.webhooks.constructEvent(payload, header, 'whsec_wrong'))
  const expired = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp: Math.floor(Date.now() / 1000) - 600,
  })
  assert.throws(() => stripe.webhooks.constructEvent(payload, expired, secret))
})
test(
  'billing isolation, atomic quotas, team limits, webhook replay and unpaid upgrades',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { consumeDocuments, consumeExport, availableUsage } =
      await import('../../src/lib/billing/usage')
    const { billingOverview } = await import('../../src/lib/billing/service')
    const { handleStripeEvent } = await import('../../src/lib/billing/stripe')
    const { createInvoiceDraft } = await import('../../src/lib/invoices/service')
    const org = randomUUID(),
      other = randomUUID(),
      owner = randomUUID(),
      member = randomUUID(),
      customerId = 'cus_' + randomUUID(),
      priceId = 'price_' + randomUUID()
    const ctx = { organizationId: org, userId: owner, role: 'owner' }
    const tx = async (fn: (c: import('pg').PoolClient) => Promise<unknown>) => {
      const c = await pool.connect()
      try {
        await c.query('BEGIN')
        const value = await fn(c)
        await c.query('COMMIT')
        return value
      } catch (e) {
        await c.query('ROLLBACK')
        throw e
      } finally {
        c.release()
      }
    }
    try {
      for (const id of [owner, member])
        await pool.query(
          'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
          [id, 'Billing fixture', `${id}@example.test`],
        )
      for (const id of [org, other])
        await pool.query(
          'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
          [id, 'Billing fixture'],
        )
      await pool.query(
        'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
        [randomUUID(), org, owner, 'owner'],
      )
      await assert.rejects(
        () => billingOverview({ ...ctx, userId: member, role: 'owner' }),
        /forbidden/,
      )
      await assert.rejects(() => billingOverview({ ...ctx, organizationId: other }), /forbidden/)
      await assert.rejects(
        () =>
          pool.query(
            'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
            [randomUUID(), org, member, 'member'],
          ),
        /teamLimit/,
      )
      await assert.rejects(
        () =>
          pool.query(
            'INSERT INTO customer_auth.organization_invitations(id,"organizationId",email,role,status,"expiresAt","inviterId") VALUES($1,$2,$3,$4,$5,now()+interval \'1 day\',$6)',
            [randomUUID(), org, `${member}@example.test`, 'member', 'pending', owner],
          ),
        /teamLimit/,
      )
      const draftInput = {
        organizationId: org,
        requestKey: randomUUID(),
        productIds: [],
        invoiceKind: 'standard',
      }
      // Use the same validated draft shape as the user-facing endpoint.
      const { draftSchema } = await import('../../src/lib/invoices/schema')
      const input = draftSchema.parse(draftInput)
      const first = await createInvoiceDraft(ctx, input),
        again = await createInvoiceDraft(ctx, input)
      assert.equal(first.id, again.id)
      await tx((c) => consumeDocuments(c, org, 'fill', 8))
      const attempts = await Promise.allSettled([
        tx((c) => consumeDocuments(c, org, 'race1', 1)),
        tx((c) => consumeDocuments(c, org, 'race2', 1)),
      ])
      assert.equal(attempts.filter((item) => item.status === 'fulfilled').length, 1)
      assert.equal((await availableUsage(org)).used.documents, 10)
      await tx((c) => consumeExport(c, org, first.id, 100))
      await tx((c) => consumeExport(c, org, first.id, 100))
      assert.equal((await availableUsage(org)).used.exports, 1)
      assert.equal((await availableUsage(other)).used.documents, 0)
      await assert.rejects(
        () => tx((c) => consumeDocuments(c, other, 'batch-over', 2, 100)),
        /batchLimit/,
      )
      await assert.rejects(
        () => tx((c) => consumeExport(c, other, randomUUID(), 300 * 1024 * 1024)),
        /storageLimit/,
      )
      await pool.query(
        "INSERT INTO customer_auth.billing_usage_ledger(organization_id,operation_key,kind,quantity) VALUES($1,'daily-full','upload',5)",
        [other],
      )
      await assert.rejects(
        () => tx((c) => consumeDocuments(c, other, 'daily-over', 1, 100)),
        /dailyLimit/,
      )
      const { deleteDocument } = await import('../../src/lib/documents/deletion')
      await deleteDocument(ctx, first.id)
      assert.equal((await availableUsage(org)).used.documents, 10)
      assert.equal((await availableUsage(org)).used.exports, 1)
      await pool.query(
        "INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id) VALUES($1,$2,now()+interval '1 day',$3,$4)",
        [org, 'starter', 'Synthetic test', 'test'],
      )
      await pool.query(
        'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
        [randomUUID(), org, member, 'member'],
      )
      await assert.rejects(
        () => billingOverview({ ...ctx, userId: member, role: 'owner' }),
        /ownerOnly/,
      )
      await pool.query('DELETE FROM customer_auth.billing_plan_grants WHERE organization_id=$1', [
        org,
      ])
      await pool.query(
        'INSERT INTO customer_auth.billing_customers(organization_id,provider_customer_id) VALUES($1,$2)',
        [org, customerId],
      )
      await pool.query(
        'INSERT INTO customer_auth.billing_price_history(stripe_price_id,plan_id,monthly_price_cents) VALUES($1,$2,1000)',
        [priceId, 'professional'],
      )
      let status = 'active',
        invoiceStatus = 'paid'
      const fake = {
        subscriptions: {
          list: async () => ({
            has_more: false,
            data: [
              {
                id: 'sub_' + org,
                status,
                created: Math.floor(Date.now() / 1000) - 3600,
                customer: customerId,
                cancel_at_period_end: false,
                latest_invoice: 'in_test',
                items: {
                  data: [
                    {
                      price: { id: priceId },
                      quantity: 1,
                      current_period_end: Math.floor(Date.now() / 1000) + 86400,
                    },
                  ],
                },
              },
            ],
          }),
        },
        invoices: {
          list: async () => ({ data: [] }),
          retrieve: async () => ({ status: invoiceStatus }),
        },
      } as unknown as Stripe
      const event = (id: string) =>
        ({
          id,
          type: 'customer.subscription.updated',
          livemode: false,
          data: { object: { customer: customerId } },
        }) as Stripe.Event
      invoiceStatus = 'open'
      await handleStripeEvent(event('evt_' + randomUUID()), fake)
      assert.equal((await availableUsage(org)).plan.id, 'free')
      await pool.query(
        `INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id,created_at)
         VALUES($1,'business',now()+interval '7 days','Old trial',1,now()-interval '1 day')`,
        [org],
      )
      await handleStripeEvent(event('evt_' + randomUUID()), fake)
      assert.equal(
        (await availableUsage(org)).plan.id,
        'business',
        'unpaid checkout keeps trial access',
      )
      invoiceStatus = 'paid'
      const paidEvent = event('evt_' + randomUUID())
      await handleStripeEvent(paidEvent, fake)
      await handleStripeEvent(paidEvent, fake)
      assert.equal((await availableUsage(org)).plan.id, 'professional')
      const events = await pool.query(
        'SELECT count(*)::int AS count FROM customer_auth.billing_webhook_events WHERE provider_event_id=$1',
        [paidEvent.id],
      )
      assert.equal(events.rows[0].count, 1)
      const ended = await pool.query(
        "SELECT count(*)::int AS count FROM customer_auth.billing_audit_events WHERE organization_id=$1 AND event='complimentary_ended'",
        [org],
      )
      assert.equal(ended.rows[0].count, 1, 'old grant ends exactly once after confirmed payment')
      await pool.query(
        "UPDATE customer_auth.billing_plan_grants SET expires_at=now()+interval '1 day',created_at=now() WHERE organization_id=$1",
        [org],
      )
      await handleStripeEvent(event('evt_' + randomUUID()), fake)
      const overview = await billingOverview(ctx)
      assert.equal(overview.subscription.plan_id, 'professional')
      assert.equal(
        overview.grant.plan_id,
        'business',
        'a later intentional grant survives reconciliation',
      )
      assert.equal(overview.plan.id, 'business')
      await pool.query('DELETE FROM customer_auth.billing_plan_grants WHERE organization_id=$1', [
        org,
      ])
      status = 'past_due'
      invoiceStatus = 'open'
      await handleStripeEvent(event('evt_' + randomUUID()), fake)
      const grace = await pool.query(
        'SELECT grace_until FROM customer_auth.billing_subscriptions WHERE organization_id=$1',
        [org],
      )
      await handleStripeEvent(event('evt_' + randomUUID()), fake)
      assert.equal(
        (
          await pool.query(
            'SELECT grace_until FROM customer_auth.billing_subscriptions WHERE organization_id=$1',
            [org],
          )
        ).rows[0].grace_until.getTime(),
        grace.rows[0].grace_until.getTime(),
      )
      await pool.query(
        "UPDATE customer_auth.billing_subscriptions SET grace_until=now()-interval '1 second' WHERE organization_id=$1",
        [org],
      )
      assert.equal((await availableUsage(org)).plan.id, 'free')
      status = 'canceled'
      await handleStripeEvent(event('evt_' + randomUUID()), fake)
      assert.equal((await availableUsage(org)).plan.id, 'free')
    } finally {
      await pool.query(
        "DELETE FROM customer_auth.billing_webhook_events WHERE provider_event_id IN (SELECT details->>'eventId' FROM customer_auth.billing_audit_events WHERE organization_id=$1)",
        [org],
      )
      await pool.query('DELETE FROM customer_auth.organizations WHERE id=ANY($1)', [[org, other]])
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=ANY($1)', [
        [owner, member],
      ])
      await pool.query('DELETE FROM customer_auth.billing_price_history WHERE stripe_price_id=$1', [
        priceId,
      ])
      await pool.end()
    }
  },
)
