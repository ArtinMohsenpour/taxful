import { checkOrigin, documentContext } from '@/lib/documents/access'
import { boundedBody, failure, json } from '@/lib/documents/http'
import { DocumentError } from '@/lib/documents/config'
import { checkout } from '@/lib/billing/stripe'
import {
  managementSchema,
  managementOverview,
  manageMutation,
  quoteChange,
  paymentSecret,
  billingRequestLimit,
} from '@/lib/billing/management'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const context = await documentContext(request.headers)
    const parsed = managementSchema.safeParse(
      JSON.parse((await boundedBody(request, 8192)).toString()),
    )
    if (!parsed.success || parsed.data.organizationId !== context.organizationId)
      throw new DocumentError('invalidRequest', 400)
    const input = parsed.data
    await billingRequestLimit(context)
    if (input.action === 'view')
      return json({
        overview: await managementOverview(context),
        ...(await paymentSecret(context).catch(() => ({ clientSecret: null }))),
      })
    if (input.action === 'checkout')
      return json({ clientSecret: await checkout(context, input.plan, input.locale, true) })
    if (input.action === 'quote') return json({ quote: await quoteChange(context, input.plan) })
    const result = await manageMutation(context, input)
    if (result.setupIntentId)
      return json({ ...result, ...(await paymentSecret(context, result.setupIntentId)) })
    return json(result)
  } catch (error) {
    return failure(error)
  }
}
