import { config } from 'dotenv'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { setTimeout as sleep } from 'node:timers/promises'
config({ path: ['.env.local', '.env'] })
const { customerPool } = await import('../src/lib/customer-auth/database')
const { cleanupDeletedDocuments } = await import('../src/lib/documents/deletion')
let stopped = false
process.on('SIGINT', () => {
  stopped = true
})
process.on('SIGTERM', () => {
  stopped = true
})
console.log('Document worker started. Waiting for queued documents.')
try {
  while (!stopped) {
    await cleanupDeletedDocuments()
    // An expired lease is a failure, never an automatic duplicate AI request.
    await customerPool.query(
      "UPDATE customer_auth.documents SET status='failed',error_code='processingTimeout',lease_token=NULL,updated_at=now() WHERE status='processing' AND started_at<now()-interval '5 minutes'",
    )
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
      await promisify(execFile)(
        process.execPath,
        ['--max-old-space-size=512', '--import', 'tsx', 'scripts/document-job.ts', id, lease],
        { timeout: 240000, maxBuffer: 64 * 1024, env: process.env },
      )
    } catch {
      await customerPool.query(
        "UPDATE customer_auth.documents SET status='failed',error_code='processingTimeout',lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2 AND status='processing'",
        [id, lease],
      )
      console.error('Document job ended without success:', id)
    }
    if (process.argv.includes('--once')) break
  }
} finally {
  await customerPool.end()
}
