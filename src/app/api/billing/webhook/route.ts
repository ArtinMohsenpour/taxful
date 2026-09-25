import { boundedBody, json } from '@/lib/documents/http'
import { handleStripeEvent, stripeClient } from '@/lib/billing/stripe'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return json({ error: 'unavailable' }, 503)
  let event
  try {
    const raw = await boundedBody(request, 1024 * 1024)
    event = stripeClient().webhooks.constructEvent(
      raw,
      request.headers.get('stripe-signature') || '',
      secret,
    )
    if (event.livemode) return json({ error: 'invalidWebhook' }, 400)
  } catch {
    return json({ error: 'invalidWebhook' }, 400)
  }
  try {
    await handleStripeEvent(event)
    return json({ received: true })
  } catch {
    console.error('Billing webhook failed', { eventId: event.id, type: event.type })
    return json({ error: 'retryLater' }, 503)
  }
}
