import { config } from 'dotenv'
import { readFile, writeFile } from 'node:fs/promises'
import { localStripeSecret, listenToStripe } from './stripe-local'
config({ path: ['.env.local', '.env'] })
try {
  const secret = await localStripeSecret(process.env)
  // This local-only override stays out of version control and survives server restarts.
  let content = await readFile('.env.local', 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return ''
    throw error
  })
  content = content.replace(/^STRIPE_WEBHOOK_SECRET=.*\r?\n?/gm, '')
  await writeFile('.env.local', `${content.trimEnd()}\nSTRIPE_WEBHOOK_SECRET=${secret}\n`, {
    mode: 0o600,
  })
  console.log('[billing] Local signing secret configured; no secret values logged.')
  if (!process.argv.includes('--configure')) {
    const child = listenToStripe(process.env, process.env.PORT || '3000')
    child.on('error', () => {
      console.error('[billing] Could not start Stripe CLI.')
      process.exitCode = 1
    })
    child.on('exit', (code) => {
      process.exitCode = code || 0
    })
    for (const signal of ['SIGINT', 'SIGTERM'] as const)
      process.on(signal, () => child.kill(signal))
  }
} catch {
  console.error(
    '[billing] Local webhook setup failed. Check Stripe CLI installation, test key and network connection.',
  )
  process.exitCode = 1
}
