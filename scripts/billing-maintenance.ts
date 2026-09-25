import { config } from 'dotenv'
import { stat } from 'node:fs/promises'
config({ path: ['.env.local', '.env'] })
const { customerPool } = await import('../src/lib/customer-auth/database')
const { storagePath } = await import('../src/lib/documents/storage')
const { billingLock } = await import('../src/lib/billing/usage')
const { syncCustomer } = await import('../src/lib/billing/stripe')
let failed = false
try {
  const exports = await customerPool.query(
    'SELECT e.id,d.organization_id FROM customer_auth.document_exports e JOIN customer_auth.documents d ON d.id=e.document_id WHERE e.size_bytes=0',
  )
  for (const item of exports.rows) {
    try {
      const file = await stat(storagePath(item.id, 'export'))
      await customerPool.query(
        'UPDATE customer_auth.document_exports SET size_bytes=$2 WHERE id=$1 AND size_bytes=0',
        [item.id, file.size],
      )
    } catch {
      failed = true
      console.error('Existing export size could not be reconciled', { exportId: item.id })
    }
  }
  console.log('Existing export storage sizes reconciled.')
  if (process.argv.includes('--sync')) {
    const customers = await customerPool.query(
      'SELECT organization_id,provider_customer_id FROM customer_auth.billing_customers WHERE provider_customer_id IS NOT NULL',
    )
    for (const customer of customers.rows) {
      const client = await customerPool.connect()
      try {
        await client.query('BEGIN')
        await billingLock(client, customer.organization_id)
        await syncCustomer(client, customer.organization_id, customer.provider_customer_id)
        await client.query('COMMIT')
      } catch {
        await client.query('ROLLBACK')
        failed = true
        console.error('Billing reconciliation failed', { organizationId: customer.organization_id })
      } finally {
        client.release()
      }
    }
  }
} finally {
  await customerPool.end()
}
if (failed) process.exitCode = 1
