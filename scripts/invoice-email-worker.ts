import { config } from 'dotenv'
import { setTimeout as sleep } from 'node:timers/promises'
config({ path: ['.env.local', '.env'] })
const { customerPool } = await import('../src/lib/customer-auth/database')
const { localEmailEnabled } = await import('../src/lib/invoice-email/provider')
const { processInvoiceEmail } = await import('../src/lib/invoice-email/worker')
let stopped = false
process.on('SIGINT', () => {
  stopped = true
})
process.on('SIGTERM', () => {
  stopped = true
})
customerPool.on('error', () => console.error('[invoice-email] Database connection unavailable.'))
let failed = false
try {
  while (!stopped) {
    try {
      if (localEmailEnabled()) await processInvoiceEmail()
      failed = false
    } catch {
      if (!failed)
        console.error('[invoice-email] Worker unavailable. Check database and migrations.')
      failed = true
      if (process.argv.includes('--once')) process.exitCode = 1
    }
    if (process.argv.includes('--once')) break
    await sleep(2000)
  }
} finally {
  await customerPool.end()
}
