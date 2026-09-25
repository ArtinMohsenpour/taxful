import type { PoolClient } from 'pg'
import { customerPool } from '../customer-auth/database'
import { lockMembership, type DocumentContext } from '../documents/access'
import { DocumentError } from '../documents/config'
import { billingLock, effectiveEntitlements, usageSnapshot } from './usage'
import { hasPermission } from '../customer-auth/permissions'

export async function ownerTransaction<T>(
  context: DocumentContext,
  action: (client: PoolClient) => Promise<T>,
) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    const role = await lockMembership(client, context)
    if (!hasPermission(role, 'billing')) throw new DocumentError('ownerOnly', 403)
    await billingLock(client, context.organizationId)
    const result = await action(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
export async function billingAudit(
  client: PoolClient,
  context: DocumentContext,
  event: string,
  details: object = {},
) {
  await client.query(
    'INSERT INTO customer_auth.billing_audit_events(organization_id,actor_id,event,details) VALUES($1,$2,$3,$4)',
    [context.organizationId, context.userId, event, details],
  )
}
export async function billingOverview(context: DocumentContext) {
  return ownerTransaction(context, async (client) => {
    const plan = await effectiveEntitlements(client, context.organizationId)
    const used = await usageSnapshot(client, context.organizationId)
    const subscription = await client.query(
      'SELECT plan_id,status,current_period_end,cancel_at_period_end,grace_until,synced_at FROM customer_auth.billing_subscriptions WHERE organization_id=$1',
      [context.organizationId],
    )
    const invoices = await client.query(
      'SELECT * FROM customer_auth.billing_invoices WHERE organization_id=$1 ORDER BY issued_at DESC LIMIT 100',
      [context.organizationId],
    )
    const grant = await client.query(
      'SELECT plan_id,expires_at FROM customer_auth.billing_plan_grants WHERE organization_id=$1 AND expires_at>now()',
      [context.organizationId],
    )
    const audit = await client.query(
      'SELECT event,created_at FROM customer_auth.billing_audit_events WHERE organization_id=$1 ORDER BY id DESC LIMIT 30',
      [context.organizationId],
    )
    return {
      plan,
      used,
      subscription: subscription.rows[0] || null,
      grant: grant.rows[0] || null,
      invoices: invoices.rows,
      audit: audit.rows,
    }
  })
}
