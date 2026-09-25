import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { customerPool } from '../customer-auth/database'
import { DocumentError } from '../documents/config'
import { companyProfileSchema } from '../documents/company-profile-schema'
import { planIds, type Plan } from './plans'
import { stripeClient, syncCustomer } from './stripe'
import { billingLock } from './usage'

const reason = z.string().trim().min(5).max(500)
export const adminActionSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('plan'),
      id: z.enum(planIds),
      revision: z.number().int().positive(),
      monthly_documents: z.number().int().min(1).max(100000),
      daily_uploads: z.number().int().min(1).max(10000),
      batch_uploads: z.number().int().min(1).max(5),
      team_members: z.number().int().min(1).max(100),
      storage_gb: z.number().min(0.1).max(1000),
      monthly_price_cents: z.number().int().min(0).max(1000000),
      published: z.boolean(),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal('customer'),
      id: z.string().min(1).max(200),
      firstName: z.string().trim().min(1).max(75),
      lastName: z.string().trim().min(1).max(75),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.enum(['suspend', 'restore', 'revoke', 'reset']),
      id: z.string().min(1).max(200),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal('grant'),
      id: z.string().min(1).max(200),
      plan: z.enum(planIds),
      days: z.number().int().min(1).max(365).optional(),
      expiryMode: z.enum(['days', 'period', 'date']).default('days'),
      expiresAt: z.string().datetime().optional(),
      reason,
    })
    .strict(),
  z.object({ action: z.literal('removeGrant'), id: z.string().min(1).max(200), reason }).strict(),
  z
    .object({
      action: z.enum(['cancelSubscription', 'resumeSubscription']),
      id: z.string().min(1).max(200),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal('company'),
      id: z.string().min(1).max(200),
      data: companyProfileSchema,
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal('discount'),
      code: z
        .string()
        .trim()
        .regex(/^[A-Z0-9_-]{3,40}$/),
      percent: z.number().int().min(1).max(100),
      maxRedemptions: z.number().int().min(1).max(10000),
      days: z.number().int().min(1).max(365),
      reason,
    })
    .strict(),
  z.object({ action: z.literal('disableDiscount'), id: z.uuid(), reason }).strict(),
])
export async function adminSnapshot(query: string, offset: number) {
  const client = await customerPool.connect()
  try {
    const plans = await client.query<Plan>(
      'SELECT * FROM customer_auth.billing_plans ORDER BY monthly_documents',
    )
    const customers = await client.query(
      `SELECT id,"firstName","lastName",email,"emailVerified",suspended,"createdAt" FROM customer_auth.customer_users
      WHERE $1='' OR position(lower($1) in lower(email||' '||name))>0 ORDER BY "createdAt" DESC,id LIMIT 50 OFFSET $2`,
      [query, offset],
    )
    const organizations = await client.query(
      `SELECT o.id,o.name,s.status,s.plan_id,s.provider_subscription_id,s.current_period_end,s.cancel_at_period_end,customer_auth.effective_billing_plan(o.id) AS effective_plan,g.plan_id AS grant_plan,g.expires_at AS grant_expires,
      p.data AS profile, (SELECT count(*)::int FROM customer_auth.organization_memberships m WHERE m."organizationId"=o.id) AS members,
      (SELECT jsonb_agg(jsonb_build_object('email',u.email,'role',m.role)) FROM customer_auth.organization_memberships m JOIN customer_auth.customer_users u ON u.id=m."userId" WHERE m."organizationId"=o.id) AS memberships
      FROM customer_auth.organizations o LEFT JOIN customer_auth.billing_subscriptions s ON s.organization_id=o.id
      LEFT JOIN customer_auth.billing_plan_grants g ON g.organization_id=o.id AND g.expires_at>now() LEFT JOIN customer_auth.company_invoice_profiles p ON p.organization_id=o.id
      WHERE $1='' OR position(lower($1) in lower(o.name))>0 ORDER BY o."createdAt" DESC,o.id LIMIT 50 OFFSET $2`,
      [query, offset],
    )
    const discounts = await client.query(
      'SELECT * FROM customer_auth.billing_discounts ORDER BY expires_at DESC LIMIT 100',
    )
    const audit = await client.query(
      'SELECT * FROM customer_auth.billing_staff_audit ORDER BY id DESC LIMIT 50',
    )
    return {
      plans: plans.rows,
      customers: customers.rows,
      organizations: organizations.rows,
      discounts: discounts.rows,
      audit: audit.rows,
    }
  } finally {
    client.release()
  }
}

export async function adminBillingDetails(organizationId: string) {
  const client = await customerPool.connect()
  try {
    const result = await client.query(
      'SELECT provider_customer_id FROM customer_auth.billing_customers WHERE organization_id=$1',
      [organizationId],
    )
    const customerId: string | undefined = result.rows[0]?.provider_customer_id
    if (!customerId) return null
    const stripe = stripeClient()
    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted || customer.livemode) throw new DocumentError('billingConflict', 409)
    const methods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
      limit: 100,
    })
    const defaultId =
      typeof customer.invoice_settings.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings.default_payment_method?.id
    return {
      providerCustomerId: customer.id,
      name: customer.name || '',
      email: customer.email || '',
      address: customer.address,
      paymentMethods: methods.data.map((method) => ({
        id: method.id,
        brand: method.card?.brand || 'card',
        last4: method.card?.last4 || '',
        expMonth: method.card?.exp_month || null,
        expYear: method.card?.exp_year || null,
        funding: method.card?.funding || null,
        country: method.card?.country || null,
        isDefault: method.id === defaultId,
      })),
    }
  } finally {
    client.release()
  }
}
export async function adminAction(staffId: string, input: z.infer<typeof adminActionSchema>) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    // Serialize staff operations; optimistic plan revisions prevent lost updates.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('billing-admin'))")
    const target = 'id' in input ? input.id : input.code
    if (input.action === 'plan') {
      const {
        rows: [old],
      } = await client.query<Plan>(
        'SELECT * FROM customer_auth.billing_plans WHERE id=$1 FOR UPDATE',
        [input.id],
      )
      if (!old || old.revision !== input.revision) throw new DocumentError('conflict', 409)
      if (input.id === 'free' && input.monthly_price_cents !== 0)
        throw new DocumentError('invalidRequest')
      let priceId = old.stripe_price_id,
        productId = old.stripe_product_id
      if (input.id !== 'free' && input.published) {
        if (!input.monthly_price_cents) throw new DocumentError('invalidRequest')
        const stripe = stripeClient()
        if (!productId)
          productId = (
            await stripe.products.create(
              { name: `Taxful ${input.id}`, metadata: { plan: input.id } },
              { idempotencyKey: `plan-product-${input.id}` },
            )
          ).id
        if (
          !priceId ||
          (await stripe.prices.retrieve(priceId)).unit_amount !== input.monthly_price_cents
        ) {
          priceId = (
            await stripe.prices.create(
              {
                product: productId,
                currency: 'eur',
                unit_amount: input.monthly_price_cents,
                recurring: { interval: 'month' },
                tax_behavior: 'exclusive',
                metadata: { plan: input.id },
              },
              {
                idempotencyKey: `plan-price-${input.id}-${old.revision}-${input.monthly_price_cents}`,
              },
            )
          ).id
          await client.query(
            'INSERT INTO customer_auth.billing_price_history(stripe_price_id,plan_id,monthly_price_cents) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
            [priceId, input.id, input.monthly_price_cents],
          )
        }
      }
      await client.query(
        `UPDATE customer_auth.billing_plans SET monthly_documents=$2,daily_uploads=$3,batch_uploads=$4,team_members=$5,storage_bytes=$6,
        monthly_price_cents=$7,published=$8,stripe_price_id=$9,stripe_product_id=$10,revision=revision+1 WHERE id=$1`,
        [
          input.id,
          input.monthly_documents,
          input.daily_uploads,
          input.batch_uploads,
          input.team_members,
          Math.round(input.storage_gb * 1024 ** 3),
          input.monthly_price_cents,
          input.published,
          priceId,
          productId,
        ],
      )
    } else if (['customer', 'suspend', 'restore', 'revoke', 'reset'].includes(input.action)) {
      const {
        rows: [user],
      } = await client.query(
        'SELECT id,email,locale FROM customer_auth.customer_users WHERE id=$1 FOR UPDATE',
        [target],
      )
      if (!user) throw new DocumentError('notFound', 404)
      if (input.action === 'customer')
        await client.query(
          'UPDATE customer_auth.customer_users SET "firstName"=$2,"lastName"=$3,name=$4,"updatedAt"=now() WHERE id=$1',
          [input.id, input.firstName, input.lastName, `${input.firstName} ${input.lastName}`],
        )
      if (input.action === 'suspend' || input.action === 'restore')
        await client.query(
          'UPDATE customer_auth.customer_users SET suspended=$2,"updatedAt"=now() WHERE id=$1',
          [target, input.action === 'suspend'],
        )
      if (['suspend', 'revoke', 'reset'].includes(input.action))
        await client.query('DELETE FROM customer_auth.customer_sessions WHERE "userId"=$1', [
          target,
        ])
      if (input.action === 'reset') {
        const { auth } = await import('../customer-auth/auth')
        await auth.api.requestPasswordReset({
          body: {
            email: user.email,
            redirectTo: new URL(
              `/${user.locale === 'en' ? 'en' : 'de'}/reset-password`,
              process.env.BETTER_AUTH_URL,
            ).href,
          },
        })
      }
    } else if (input.action === 'cancelSubscription' || input.action === 'resumeSubscription') {
      await billingLock(client, input.id)
      const {
        rows: [subscription],
      } = await client.query(
        `SELECT s.provider_subscription_id,c.provider_customer_id FROM customer_auth.billing_subscriptions s JOIN customer_auth.billing_customers c USING(organization_id) WHERE s.organization_id=$1`,
        [input.id],
      )
      if (!subscription?.provider_subscription_id || !subscription.provider_customer_id)
        throw new DocumentError('notFound', 404)
      const stripe = stripeClient()
      const current = await stripe.subscriptions.retrieve(subscription.provider_subscription_id)
      if (
        current.customer !== subscription.provider_customer_id ||
        !['active', 'trialing', 'past_due'].includes(current.status)
      )
        throw new DocumentError('conflict', 409)
      await stripe.subscriptions.update(current.id, {
        cancel_at_period_end: input.action === 'cancelSubscription',
      })
      await syncCustomer(client, input.id, subscription.provider_customer_id, stripe)
    } else if (
      input.action === 'grant' ||
      input.action === 'removeGrant' ||
      input.action === 'company'
    ) {
      await billingLock(client, input.id)
      const org = await client.query('SELECT id FROM customer_auth.organizations WHERE id=$1', [
        input.id,
      ])
      if (!org.rowCount) throw new DocumentError('notFound', 404)
      if (input.action === 'grant') {
        const { grantExpiry } = await import('./grants')
        if (input.expiryMode === 'period') {
          const customer = await client.query(
            'SELECT provider_customer_id FROM customer_auth.billing_customers WHERE organization_id=$1',
            [input.id],
          )
          if (customer.rows[0]?.provider_customer_id)
            await syncCustomer(client, input.id, customer.rows[0].provider_customer_id)
        }
        const subscription = await client.query(
          'SELECT current_period_end FROM customer_auth.billing_subscriptions WHERE organization_id=$1',
          [input.id],
        )
        const expires = grantExpiry(input, subscription.rows[0]?.current_period_end || null)
        await client.query(
          `INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(organization_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,expires_at=EXCLUDED.expires_at,reason=EXCLUDED.reason,staff_id=EXCLUDED.staff_id,created_at=now()`,
          [input.id, input.plan, expires, input.reason, staffId],
        )
      }
      if (input.action === 'removeGrant')
        await client.query(
          'DELETE FROM customer_auth.billing_plan_grants WHERE organization_id=$1',
          [input.id],
        )
      if (input.action === 'company')
        await client.query(
          `INSERT INTO customer_auth.company_invoice_profiles(organization_id,data) VALUES($1,$2)
        ON CONFLICT(organization_id) DO UPDATE SET data=EXCLUDED.data,revision=company_invoice_profiles.revision+1,updated_by=NULL,updated_at=now()`,
          [input.id, input.data],
        )
    } else if (input.action === 'discount') {
      const stripe = stripeClient()
      const existing = await client.query(
        'SELECT * FROM customer_auth.billing_discounts WHERE code=$1 FOR UPDATE',
        [input.code],
      )
      let pending = existing.rows[0]
      if (
        pending &&
        (pending.provider_promotion_id ||
          pending.percent_off !== input.percent ||
          pending.max_redemptions !== input.maxRedemptions)
      )
        throw new DocumentError('conflict', 409)
      if (!pending) {
        const created = await client.query(
          `INSERT INTO customer_auth.billing_discounts(id,code,percent_off,max_redemptions,expires_at,active)
          VALUES($1,$2,$3,$4,to_timestamp($5),false) RETURNING *`,
          [
            randomUUID(),
            input.code,
            input.percent,
            input.maxRedemptions,
            Math.floor(Date.now() / 1000) + input.days * 86400,
          ],
        )
        pending = created.rows[0]
        await client.query(
          "INSERT INTO customer_auth.billing_staff_audit(staff_id,action,target_id,reason) VALUES($1,'discount_requested',$2,$3)",
          [staffId, input.code, input.reason],
        )
        // Persist the intent and expiry before the provider call. A retry uses identical parameters.
        await client.query('COMMIT')
        await client.query('BEGIN')
        await client.query("SELECT pg_advisory_xact_lock(hashtext('billing-admin'))")
        const fresh = await client.query(
          'SELECT * FROM customer_auth.billing_discounts WHERE id=$1 FOR UPDATE',
          [pending.id],
        )
        pending = fresh.rows[0]
        if (pending.provider_promotion_id) throw new DocumentError('conflict', 409)
      }
      const coupon = await stripe.coupons.create(
        { percent_off: input.percent, duration: 'once', name: input.code },
        { idempotencyKey: `coupon-${pending.id}` },
      )
      const expires = Math.floor(new Date(pending.expires_at).getTime() / 1000)
      const recovered = await stripe.promotionCodes.list({ code: input.code, limit: 10 })
      const found = recovered.data.find((item) => item.metadata?.taxfulDiscountId === pending.id)
      const promotion =
        found ||
        (await stripe.promotionCodes.create(
          {
            promotion: { type: 'coupon', coupon: coupon.id },
            code: input.code,
            max_redemptions: input.maxRedemptions,
            expires_at: expires,
            metadata: { taxfulDiscountId: pending.id },
          },
          { idempotencyKey: `promotion-${pending.id}` },
        ))
      await client.query(
        'UPDATE customer_auth.billing_discounts SET provider_promotion_id=$2,active=$3 WHERE id=$1',
        [pending.id, promotion.id, promotion.active],
      )
    } else if (input.action === 'disableDiscount') {
      const {
        rows: [discount],
      } = await client.query(
        'SELECT provider_promotion_id FROM customer_auth.billing_discounts WHERE id=$1',
        [input.id],
      )
      if (!discount) throw new DocumentError('notFound', 404)
      await stripeClient().promotionCodes.update(discount.provider_promotion_id, { active: false })
      await client.query('UPDATE customer_auth.billing_discounts SET active=false WHERE id=$1', [
        input.id,
      ])
    }
    await client.query(
      'INSERT INTO customer_auth.billing_staff_audit(staff_id,action,target_id,reason,details) VALUES($1,$2,$3,$4,$5)',
      [
        staffId,
        input.action,
        target,
        input.reason,
        input.action === 'plan'
          ? { revision: input.revision + 1, monthlyPriceCents: input.monthly_price_cents }
          : input.action === 'grant'
            ? {
                plan: input.plan,
                expiryMode: input.expiryMode,
                days: input.days,
                expiresAt: input.expiresAt,
              }
            : {},
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
