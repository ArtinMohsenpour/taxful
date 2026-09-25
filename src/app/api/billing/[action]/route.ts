import { z } from 'zod'
import { documentContext, checkOrigin } from '@/lib/documents/access'
import { boundedBody, failure, json } from '@/lib/documents/http'
import { DocumentError } from '@/lib/documents/config'
import { checkout, customerPortal, syncCustomer } from '@/lib/billing/stripe'
import { billingAudit, ownerTransaction } from '@/lib/billing/service'
import { planIds } from '@/lib/billing/plans'

export const runtime = 'nodejs'
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    checkOrigin(request)
    const context = await documentContext(request.headers)
    const body = z
      .object({
        organizationId: z.string(),
        locale: z.enum(['en', 'de']),
        plan: z.enum(planIds).optional(),
      })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, 2048)).toString()))
    if (!body.success || body.data.organizationId !== context.organizationId)
      throw new DocumentError('invalidRequest')
    const { action } = await params
    if (action === 'checkout' && body.data.plan)
      return json({ url: await checkout(context, body.data.plan, body.data.locale) })
    if (action === 'portal') return json({ url: await customerPortal(context, body.data.locale) })
    if (action === 'refresh') {
      await ownerTransaction(context, async (client) => {
        const {
          rows: [customer],
        } = await client.query(
          'SELECT provider_customer_id,operation_at FROM customer_auth.billing_customers WHERE organization_id=$1',
          [context.organizationId],
        )
        if (!customer?.provider_customer_id) return
        if (customer.operation_at && Date.now() - new Date(customer.operation_at).getTime() < 10000)
          throw new DocumentError('tooManyRequests', 429)
        await syncCustomer(client, context.organizationId, customer.provider_customer_id)
        await client.query(
          'UPDATE customer_auth.billing_customers SET operation_at=now() WHERE organization_id=$1',
          [context.organizationId],
        )
        await billingAudit(client, context, 'billing_refreshed')
      })
      return json({ ok: true })
    }
    throw new DocumentError('notFound', 404)
  } catch (error) {
    return failure(error)
  }
}
