import { customerPool } from '../customer-auth/database'
import type { DocumentContext } from './access'

export function documentLog(
  event: string,
  details: { documentId?: string; stage?: string; elapsedMs?: number; code?: string } = {},
) {
  console.log(
    JSON.stringify({ time: new Date().toISOString(), service: 'documents', event, ...details }),
  )
}
export async function processingHealth() {
  const result =
    await customerPool.query(`SELECT count(*)>0 AS online, coalesce(bool_or(scanner_ready),false) AS "scannerReady"
    FROM customer_auth.document_worker_health WHERE heartbeat_at>now()-interval '20 seconds'`)
  return result.rows[0] as { online: boolean; scannerReady: boolean }
}
export async function processingActivity(context: DocumentContext, id: string) {
  const result = await customerPool.query(
    `SELECT event, created_at AS "createdAt",details->>'stage' AS stage,
    details->>'elapsedMs' AS "elapsedMs",details->>'code' AS code
    FROM customer_auth.document_events WHERE document_id=$1 AND organization_id=$2
    AND event IN ('processing_stage','processing_failed','extracted','classified_unsupported')
    ORDER BY created_at DESC,id DESC LIMIT 15`,
    [id, context.organizationId],
  )
  return result.rows.reverse()
}
