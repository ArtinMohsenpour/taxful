import { config } from 'dotenv'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
config({ path: ['.env.local', '.env'] })
const { customerPool } = await import('../src/lib/customer-auth/database')
const { cleanupDeletedDocuments } = await import('../src/lib/documents/deletion')
const { scannerReady } = await import('../src/lib/documents/scan')
const { documentLog } = await import('../src/lib/documents/diagnostics')
const workerId = randomUUID()
customerPool.on('error', () => documentLog('database_connection_lost'))
let ready = false,
  refreshing = false,
  lastHealth = '',
  lastFailure = ''
async function refreshHealth() {
  if (refreshing) return
  refreshing = true
  try {
    ready = await scannerReady()
    await customerPool.query(
      'INSERT INTO customer_auth.document_worker_health(id,heartbeat_at,scanner_ready) VALUES($1,now(),$2) ON CONFLICT(id) DO UPDATE SET heartbeat_at=now(),scanner_ready=$2',
      [workerId, ready],
    )
    const state = ready ? 'ready' : 'waiting_for_scanner'
    if (state !== lastHealth) {
      documentLog(state)
      if (!ready)
        console.error(
          '[documents] Start the scanner with pnpm documents:services. Uploads remain queued.',
        )
      lastHealth = state
    }
  } catch {
    ready = false
    if (lastHealth !== 'health_unavailable') {
      documentLog('health_unavailable')
      console.error('[documents] Check PostgreSQL and run pnpm customer:migrate.')
      lastHealth = 'health_unavailable'
    }
  } finally {
    refreshing = false
  }
}
let stopped = false
process.on('SIGINT', () => {
  stopped = true
})
process.on('SIGTERM', () => {
  stopped = true
})
documentLog('worker_started')
await refreshHealth()
const heartbeat = setInterval(() => void refreshHealth(), 5000)
try {
  while (!stopped) {
    try {
      await cleanupDeletedDocuments()
      // An expired lease is a failure, never an automatic duplicate AI request.
      await customerPool.query(
        "UPDATE customer_auth.documents SET status='failed',error_code='processingTimeout',lease_token=NULL,updated_at=now() WHERE status='processing' AND started_at<now()-interval '5 minutes'",
      )
      if (!ready) {
        if (process.argv.includes('--once')) break
        await sleep(2000)
        continue
      }
      const lease = randomUUID()
      const result = await customerPool.query(
        `
   UPDATE customer_auth.documents SET status='processing',processing_stage='scanning',attempts=attempts+1,lease_token=$1,started_at=now(),updated_at=now()
   WHERE id=(SELECT id FROM customer_auth.documents WHERE status='queued' AND attempts<3 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
   RETURNING id`,
        [lease],
      )
      if (!result.rows[0]) {
        if (process.argv.includes('--once')) break
        await sleep(2000)
        continue
      }
      const id = result.rows[0].id
      try {
        documentLog('job_claimed', { documentId: id, stage: 'scanning' })
        await new Promise<void>((resolve, reject) => {
          const child = spawn(
            process.execPath,
            ['--max-old-space-size=512', '--import', 'tsx', 'scripts/document-job.ts', id, lease],
            { stdio: 'inherit', env: process.env },
          )
          const deadline = setTimeout(() => child.kill('SIGKILL'), 270000)
          child.once('error', () => {
            clearTimeout(deadline)
            reject(new Error('jobStartFailed'))
          })
          child.once('exit', (code) => {
            clearTimeout(deadline)
            if (code === 0) resolve()
            else reject(new Error('jobFailed'))
          })
        })
      } catch {
        const failed = await customerPool.query(
          "UPDATE customer_auth.documents SET status='failed',error_code='processingTimeout',lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2 AND status='processing'",
          [id, lease],
        )
        if (failed.rowCount)
          documentLog('job_failed', { documentId: id, code: 'processingTimeout' })
      }
      lastFailure = ''
      if (process.argv.includes('--once')) break
    } catch (error) {
      const raw = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      const code = /^[A-Z0-9_]{2,30}$/.test(raw) ? raw : 'workerUnavailable'
      if (code !== lastFailure) {
        documentLog('worker_error', { code })
        lastFailure = code
      }
      if (process.argv.includes('--once')) {
        process.exitCode = 1
        break
      }
      await sleep(5000)
    }
  }
} finally {
  clearInterval(heartbeat)
  await customerPool
    .query('DELETE FROM customer_auth.document_worker_health WHERE id=$1', [workerId])
    .catch(() => {})
  documentLog('worker_stopped')
  await customerPool.end()
}
