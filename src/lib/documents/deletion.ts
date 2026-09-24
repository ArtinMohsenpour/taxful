import { customerPool } from '../customer-auth/database'
import { canDeleteDocument, lockMembership, type DocumentContext } from './access'
import { DocumentError } from './config'
import { removePrivate } from './storage'

type Artifact = { id: string; kind: 'source' | 'preview' | 'export' }

// The durable cleanup record is committed with the deletion, so a filesystem
// failure or process restart cannot leave an untracked original/export behind.
export async function cleanupDeletedDocuments(id?: string) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT id,artifacts FROM customer_auth.document_deletions
      WHERE ($1::uuid IS NULL OR id=$1) AND ($1::uuid IS NOT NULL OR last_attempt_at IS NULL OR last_attempt_at<now()-interval '30 seconds')
      ORDER BY created_at LIMIT 5 FOR UPDATE SKIP LOCKED`,
      [id || null],
    )
    for (const job of result.rows) {
      try {
        for (const artifact of job.artifacts as Artifact[])
          await removePrivate(artifact.id, artifact.kind)
        await client.query('DELETE FROM customer_auth.document_deletions WHERE id=$1', [job.id])
      } catch {
        await client.query(
          'UPDATE customer_auth.document_deletions SET attempts=attempts+1,last_attempt_at=now() WHERE id=$1',
          [job.id],
        )
      }
    }
    await client.query('COMMIT')
    if (!id) return true
    const pending = await client.query(
      'SELECT id FROM customer_auth.document_deletions WHERE id=$1',
      [id],
    )
    return !pending.rowCount
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteDocument(context: DocumentContext, id: string) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    const role = await lockMembership(client, context)
    const result = await client.query(
      `SELECT uploaded_by,status,export_state,invoice_state,
      export_started_at>now()-interval '120 seconds' AS export_busy FROM customer_auth.documents
      WHERE id=$1 AND organization_id=$2 FOR UPDATE`,
      [id, context.organizationId],
    )
    const doc = result.rows[0]
    if (!doc) throw new DocumentError('notFound', 404)
    if (doc.invoice_state !== 'draft') throw new DocumentError('invoiceLocked', 409)
    if (!canDeleteDocument({ ...context, role }, doc.uploaded_by))
      throw new DocumentError('forbidden', 403)
    if (doc.status === 'processing' || (doc.export_state === 'generating' && doc.export_busy))
      throw new DocumentError('deleteBusy', 409)
    const exports = await client.query(
      'SELECT id FROM customer_auth.document_exports WHERE document_id=$1',
      [id],
    )
    const artifacts: Artifact[] = [
      { id, kind: 'source' },
      { id, kind: 'preview' },
      ...exports.rows.map((row) => ({ id: row.id as string, kind: 'export' as const })),
    ]
    await client.query('INSERT INTO customer_auth.document_deletions(id,artifacts) VALUES($1,$2)', [
      id,
      JSON.stringify(artifacts),
    ])
    await client.query('DELETE FROM customer_auth.documents WHERE id=$1', [id])
    // Keep the upload batch/idempotency record and quota: deletion must not reset usage.
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  let cleanupPending = true
  try {
    cleanupPending = !(await cleanupDeletedDocuments(id))
  } catch {
    /* The durable job remains retryable. */
  }
  return { removed: true, cleanupPending }
}
