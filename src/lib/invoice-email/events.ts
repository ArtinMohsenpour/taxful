import { z } from 'zod'
import { invoiceTransaction } from '../invoices/service'
import type { DocumentContext } from '../documents/access'
import { hasPermission } from '../customer-auth/permissions'
import { DocumentError } from '../documents/config'
import { requireLocalEmail } from './provider'

// Simulation evidence never represents a real recipient-server outcome.
const simulationSchema = z
  .object({
    deliveryId: z.uuid(),
    eventKey: z.uuid(),
    status: z.enum(['delivered', 'bounced', 'complained']),
  })
  .strict()
export async function simulateDeliveryEvent(context: DocumentContext, input: unknown) {
  requireLocalEmail()
  const parsed = simulationSchema.safeParse(input)
  if (!parsed.success) throw new DocumentError('invalidRequest')
  const value = parsed.data
  return invoiceTransaction(context, async (client, role) => {
    if (!hasPermission(role, 'settings')) throw new DocumentError('forbidden', 403)
    const delivery = await client.query(
      "SELECT id FROM customer_auth.invoice_deliveries WHERE id=$1 AND organization_id=$2 AND mode='mailpit' AND status='accepted' FOR UPDATE",
      [value.deliveryId, context.organizationId],
    )
    if (!delivery.rowCount) throw new DocumentError('notFound', 404)
    const previous = await client.query(
      'SELECT status FROM customer_auth.invoice_delivery_events WHERE delivery_id=$1 AND event_key=$2',
      [value.deliveryId, value.eventKey],
    )
    if (previous.rowCount) {
      if (previous.rows[0].status !== value.status) throw new DocumentError('conflict', 409)
      return { recorded: true }
    }
    const count = await client.query(
      "SELECT count(*)::int AS n FROM customer_auth.invoice_delivery_events WHERE delivery_id=$1 AND source='simulation'",
      [value.deliveryId],
    )
    if (count.rows[0].n >= 10) throw new DocumentError('emailRateLimit', 429)
    await client.query(
      "INSERT INTO customer_auth.invoice_delivery_events(delivery_id,status,source,event_key,actor_id) VALUES($1,$2,'simulation',$3,$4)",
      [value.deliveryId, value.status, value.eventKey, context.userId],
    )
    return { recorded: true }
  })
}
