import type { PoolClient } from 'pg'
import { customerPool } from '../customer-auth/database'
import { DocumentError } from '../documents/config'
import type { Plan } from './plans'

export async function billingLock(client: PoolClient, organizationId: string) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('billing:'||$1))", [organizationId])
}
export async function effectiveEntitlements(client: PoolClient, organizationId: string) {
  const result = await client.query<Plan>(
    'SELECT * FROM customer_auth.billing_plans WHERE id=customer_auth.effective_billing_plan($1)',
    [organizationId],
  )
  if (!result.rows[0]) throw new DocumentError('billingUnavailable', 503)
  return result.rows[0]
}
export async function usageSnapshot(client: PoolClient, organizationId: string) {
  const { rows } = await client.query<{
    documents: number
    uploads: number
    exports: number
    storage: string
    seats: number
    resets: Date
  }>(
    `SELECT
    COALESCE((SELECT sum(quantity)::int FROM customer_auth.billing_usage_ledger WHERE organization_id=$1 AND kind='document' AND created_at >= date_trunc('month',now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin'),0) AS documents,
    COALESCE((SELECT sum(quantity)::int FROM customer_auth.billing_usage_ledger WHERE organization_id=$1 AND kind='upload' AND created_at >= date_trunc('day',now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin'),0) AS uploads,
    COALESCE((SELECT sum(quantity)::int FROM customer_auth.billing_usage_ledger WHERE organization_id=$1 AND kind='export' AND created_at >= date_trunc('month',now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin'),0) AS exports,
    ((SELECT COALESCE(sum(size_bytes),0) FROM customer_auth.documents WHERE organization_id=$1) +
     (SELECT COALESCE(sum(e.size_bytes),0) FROM customer_auth.document_exports e JOIN customer_auth.documents d ON d.id=e.document_id WHERE d.organization_id=$1))::text AS storage,
    (SELECT count(*)::int FROM (
      SELECT lower(u.email) AS email FROM customer_auth.organization_memberships m JOIN customer_auth.customer_users u ON u.id=m."userId" WHERE m."organizationId"=$1
      UNION SELECT lower(email) FROM customer_auth.organization_invitations WHERE "organizationId"=$1 AND status='pending' AND "expiresAt">now()
    ) seats) AS seats,
    (date_trunc('month',now() AT TIME ZONE 'Europe/Berlin')+interval '1 month') AT TIME ZONE 'Europe/Berlin' AS resets`,
    [organizationId],
  )
  return rows[0]
}
export async function consumeDocuments(
  client: PoolClient,
  organizationId: string,
  key: string,
  count: number,
  uploadBytes?: number,
) {
  await billingLock(client, organizationId)
  const plan = await effectiveEntitlements(client, organizationId)
  const used = await usageSnapshot(client, organizationId)
  if (used.documents + count > plan.monthly_documents) throw new DocumentError('monthlyLimit', 429)
  if (uploadBytes !== undefined) {
    if (count > plan.batch_uploads) throw new DocumentError('batchLimit', 429)
    if (used.uploads + count > plan.daily_uploads) throw new DocumentError('dailyLimit', 429)
    if (BigInt(used.storage) + BigInt(uploadBytes) > BigInt(plan.storage_bytes))
      throw new DocumentError('storageLimit', 429)
  }
  for (const kind of uploadBytes === undefined ? ['document'] : ['document', 'upload'])
    await client.query(
      'INSERT INTO customer_auth.billing_usage_ledger(organization_id,operation_key,kind,quantity) VALUES($1,$2,$3,$4)',
      [organizationId, key, kind, count],
    )
}
export async function consumeExport(
  client: PoolClient,
  organizationId: string,
  documentId: string,
  bytes: number,
  record = true,
) {
  await billingLock(client, organizationId)
  const plan = await effectiveEntitlements(client, organizationId)
  const used = await usageSnapshot(client, organizationId)
  const previous = await client.query(
    "SELECT 1 FROM customer_auth.billing_usage_ledger WHERE organization_id=$1 AND kind='export' AND operation_key=$2",
    [organizationId, documentId],
  )
  if (!previous.rowCount && used.exports >= plan.monthly_documents)
    throw new DocumentError('exportLimit', 429)
  if (BigInt(used.storage) + BigInt(bytes) > BigInt(plan.storage_bytes))
    throw new DocumentError('storageLimit', 429)
  if (record)
    await client.query(
      "INSERT INTO customer_auth.billing_usage_ledger(organization_id,operation_key,kind,quantity) VALUES($1,$2,'export',1) ON CONFLICT DO NOTHING",
      [organizationId, documentId],
    )
}
export async function availableUsage(organizationId: string) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const plan = await effectiveEntitlements(client, organizationId)
    const used = await usageSnapshot(client, organizationId)
    await client.query('COMMIT')
    return { plan, used }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
