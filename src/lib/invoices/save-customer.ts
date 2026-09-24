import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import type { DocumentContext } from '../documents/access'
import type { DocumentRecord } from '../documents/schema'
import { customerSchema } from './schema'
import { DocumentError } from '../documents/config'
// Called within the approval transaction. No shared customer entry is silently updated.
export async function saveInvoiceCustomer(
  client: PoolClient,
  context: DocumentContext,
  recipient: DocumentRecord['recipient'],
) {
  const { taxId: _taxId, ...fields } = recipient
  const parsed = customerSchema.safeParse(fields)
  if (!parsed.success) throw new DocumentError('customerInvalid')
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    'invoice-customer:' + context.organizationId,
  ])
  const existing = await client.query(
    'SELECT id FROM customer_auth.invoice_customers WHERE organization_id=$1 AND data=$2::jsonb AND NOT archived ORDER BY created_at,id LIMIT 1',
    [context.organizationId, parsed.data],
  )
  if (existing.rows[0]) return existing.rows[0].id as string
  const id = randomUUID()
  await client.query(
    'INSERT INTO customer_auth.invoice_customers(id,organization_id,data) VALUES($1,$2,$3)',
    [id, context.organizationId, parsed.data],
  )
  return id
}
