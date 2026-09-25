import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { createInterface } from 'node:readline'

export async function localStripeSecret(env: NodeJS.ProcessEnv) {
  if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Stripe test key required')
  const { stdout } = await promisify(execFile)(
    'stripe',
    ['listen', '--print-secret', '--skip-update'],
    {
      env: { ...env, STRIPE_API_KEY: env.STRIPE_SECRET_KEY },
      timeout: 30000,
      maxBuffer: 65536,
    },
  )
  const secret = stdout.trim()
  if (!/^whsec_[A-Za-z0-9]+$/.test(secret)) throw new Error('Invalid local webhook secret')
  return secret
}

export function listenToStripe(env: NodeJS.ProcessEnv, port: string) {
  const child = spawn(
    'stripe',
    [
      'listen',
      '--skip-update',
      '--color',
      'off',
      '--events',
      'checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.paused,customer.subscription.resumed,invoice.paid,invoice.payment_failed,invoice.payment_action_required,invoice.updated,invoice.finalized,invoice.voided,invoice.marked_uncollectible',
      '--forward-to',
      `http://127.0.0.1:${port}/api/billing/webhook`,
    ],
    {
      env: { ...env, STRIPE_API_KEY: env.STRIPE_SECRET_KEY },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    },
  )
  // Never relay raw CLI output: it includes the signing secret and may contain data.
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on('line', (line) => {
      if (line.includes('Ready!'))
        console.log(`[billing] Stripe test webhooks connected on port ${port}.`)
      const status = line.match(/\[(\d{3})\]/)?.[1]
      if (status) console.log(`[billing] Webhook response: ${status}.`)
      else if (
        /(?:error:|fatal:|failed to|unable to|connection.*(?:closed|failed)|connection refused)/i.test(
          line,
        )
      )
        console.error(
          '[billing] Stripe listener reported a connection/forwarding error. Check that the website is running.',
        )
    })
  }
  return child
}
