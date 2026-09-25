import { spawn, type ChildProcess } from 'node:child_process'
import { config } from 'dotenv'
import { localStripeSecret, listenToStripe } from './stripe-local'

config({ path: ['.env.local', '.env'] })

// Keep the website and its document worker together during local development.
const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-deprecation'].filter(Boolean).join(' '),
}
const children: ChildProcess[] = []
let stopping = false
function stop(code: number) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children)
    if (child.pid && child.exitCode === null) {
      try {
        if (process.platform === 'win32') child.kill('SIGTERM')
        else process.kill(-child.pid, 'SIGTERM')
      } catch {
        /* Already exited. */
      }
    }
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
if (env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && env.STRIPE_LOCAL_WEBHOOKS !== 'false') {
  try {
    env.STRIPE_WEBHOOK_SECRET = await localStripeSecret(env)
    if (!stopping) {
      const args = process.argv.slice(2)
      const portIndex = args.findIndex((arg) => arg === '-p' || arg === '--port')
      const port =
        (portIndex >= 0
          ? args[portIndex + 1]
          : args.find((arg) => arg.startsWith('--port='))?.split('=')[1]) ||
        env.PORT ||
        '3000'
      const listener = listenToStripe(env, port)
      children.push(listener)
      listener.on('error', () => {
        console.error('[billing] Stripe listener could not start.')
        stop(1)
      })
      listener.on('exit', () => {
        if (!stopping) {
          console.error(
            '[billing] Stripe listener stopped; restart pnpm dev to restore payment sync.',
          )
          stop(1)
        }
      })
    }
  } catch {
    console.error(
      '[billing] Webhook setup failed. Check Stripe CLI, test key and network. Use STRIPE_LOCAL_WEBHOOKS=false only with another listener configured.',
    )
    stop(1)
  }
}
for (const args of [
  ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)],
  ['--import', 'tsx', 'scripts/document-worker.ts'],
]) {
  if (stopping) break
  const child = spawn(process.execPath, args, {
    env,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })
  children.push(child)
  child.once('error', () => {
    console.error('[dev] Could not start website or document worker.')
    stop(1)
  })
  child.once('exit', (code) => {
    if (!stopping) stop(code || 0)
  })
}
