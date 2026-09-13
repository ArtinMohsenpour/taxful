import { randomUUID } from 'node:crypto'
import { customerPool } from '../customer-auth/database'
import { documentLimits, DocumentError } from './config'
import { detectDocument } from './prepare'
import { readPrivate, writePrivate, removePrivate, sha256 } from './storage'
import { lockMembership, canDeleteDocument, type DocumentContext } from './access'
import { recordSchema, reviewSchema, validateRecord } from './schema'
import { generateXRechnung, validateXRechnung, xrechnungRequirements } from './xrechnung'
import type { PoolClient } from 'pg'
import { documentFilters, type DocumentFilters } from './listing'

export async function event(
  client: PoolClient,
  context: DocumentContext,
  documentId: string,
  name: string,
  details: object = {},
) {
  await client.query(
    'INSERT INTO customer_auth.document_events(document_id,organization_id,actor_id,event,details) VALUES($1,$2,$3,$4,$5)',
    [documentId, context.organizationId, context.userId, name, details],
  )
}
export async function entitlements(context: DocumentContext) {
  const limits = documentLimits()
  const result = await customerPool.query(
    'SELECT daily_limit, batch_limit FROM customer_auth.document_entitlements WHERE organization_id=$1',
    [context.organizationId],
  )
  const usage = await customerPool.query(
    "SELECT used FROM customer_auth.document_usage WHERE organization_id=$1 AND usage_day=(now() AT TIME ZONE 'Europe/Berlin')::date",
    [context.organizationId],
  )
  return {
    dailyLimit: result.rows[0]?.daily_limit ?? limits.dailyLimit,
    batchLimit: result.rows[0]?.batch_limit ?? 1,
    used: usage.rows[0]?.used ?? 0,
    maxFileBytes: limits.maxFileBytes,
    maxRequestBytes: limits.maxRequestBytes,
  }
}
export async function uploadDocuments(context: DocumentContext, files: File[], key: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(key)) throw new DocumentError('invalidRequest')
  const limits = documentLimits()
  if (!files.length || files.length > 5) throw new DocumentError('batchLimit')
  const input = await Promise.all(
    files.map(async (file) => {
      if (!file.size || file.size > limits.maxFileBytes) throw new DocumentError('fileTooLarge')
      const bytes = Buffer.from(await file.arrayBuffer())
      return {
        bytes,
        mime: await detectDocument(bytes),
        hash: sha256(bytes),
        name: file.name.replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 180) || 'document',
      }
    }),
  )
  const fingerprint = sha256(
    JSON.stringify(input.map((file) => ({ hash: file.hash, name: file.name }))),
  )
  const client = await customerPool.connect()
  const written: string[] = []
  try {
    await client.query('BEGIN')
    await lockMembership(client, context)
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      'document-upload:' + context.organizationId,
    ])
    const existing = await client.query(
      'SELECT id,fingerprint FROM customer_auth.document_batches WHERE organization_id=$1 AND request_key=$2',
      [context.organizationId, key],
    )
    if (existing.rows[0]) {
      if (existing.rows[0].fingerprint !== fingerprint) throw new DocumentError('conflict', 409)
      const result = await client.query(
        'SELECT id FROM customer_auth.documents WHERE batch_id=$1',
        [existing.rows[0].id],
      )
      await client.query('COMMIT')
      return result.rows.map((row) => row.id as string)
    }
    const plan = await client.query(
      'SELECT daily_limit,batch_limit FROM customer_auth.document_entitlements WHERE organization_id=$1',
      [context.organizationId],
    )
    const daily = plan.rows[0]?.daily_limit ?? limits.dailyLimit
    if (files.length > (plan.rows[0]?.batch_limit ?? 1)) throw new DocumentError('batchLimit')
    await client.query(
      "INSERT INTO customer_auth.document_usage(organization_id,usage_day) VALUES($1,(now() AT TIME ZONE 'Europe/Berlin')::date) ON CONFLICT DO NOTHING",
      [context.organizationId],
    )
    const usage = await client.query(
      "UPDATE customer_auth.document_usage SET used=used+$2 WHERE organization_id=$1 AND usage_day=(now() AT TIME ZONE 'Europe/Berlin')::date AND used+$2<=$3 RETURNING used",
      [context.organizationId, files.length, daily],
    )
    if (!usage.rowCount) throw new DocumentError('dailyLimit', 429)
    const batch = randomUUID()
    await client.query(
      'INSERT INTO customer_auth.document_batches(id,organization_id,request_key,fingerprint) VALUES($1,$2,$3,$4)',
      [batch, context.organizationId, key, fingerprint],
    )
    for (const file of input) {
      const id = randomUUID()
      await writePrivate(id, file.bytes)
      written.push(id)
      await client.query(
        'INSERT INTO customer_auth.documents(id,organization_id,batch_id,uploaded_by,original_name,mime_type,size_bytes,source_sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          id,
          context.organizationId,
          batch,
          context.userId,
          file.name,
          file.mime,
          file.bytes.length,
          file.hash,
        ],
      )
      await event(client, context, id, 'uploaded')
    }
    await client.query('COMMIT')
    return written
  } catch (error) {
    await client.query('ROLLBACK')
    // Preserve committed files if a COMMIT acknowledgement was lost.
    for (const id of written) {
      const persisted = await client.query('SELECT id FROM customer_auth.documents WHERE id=$1', [
        id,
      ])
      if (!persisted.rowCount) await removePrivate(id)
    }
    throw error
  } finally {
    client.release()
  }
}
export async function listDocuments(context: DocumentContext) {
  const result = await customerPool.query(
    'SELECT id,original_name,mime_type,size_bytes,status,error_code,created_at,updated_at FROM customer_auth.documents WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100',
    [context.organizationId],
  )
  return result.rows
}
export async function documentLibrary(
  context: DocumentContext,
  filters: DocumentFilters = documentFilters(),
) {
  const where = `d.organization_id=$1
    AND ($2='' OR position(lower($2) in lower(d.original_name))>0)
    AND ($3='all' OR ($3='exported' AND d.status='approved' AND e.id IS NOT NULL)
      OR ($3='approved' AND d.status='approved' AND e.id IS NULL)
      OR ($3='processing' AND (d.status='processing' OR (d.export_state='generating' AND d.export_started_at>now()-interval '60 seconds')))
      OR ($3='failed' AND (d.status IN ('failed','rejected') OR d.export_state='failed' OR (d.export_state='generating' AND d.export_started_at<=now()-interval '60 seconds')))
      OR ($3 NOT IN ('all','exported','approved','failed','processing') AND d.status=$3))
    AND ($4='all' OR ($4='pdf' AND d.mime_type='application/pdf')
      OR ($4='word' AND d.mime_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      OR ($4='image' AND d.mime_type LIKE 'image/%'))
    AND ($5::date IS NULL OR d.created_at >= ($5::date::timestamp AT TIME ZONE 'Europe/Berlin'))
    AND ($6::date IS NULL OR d.created_at < (($6::date+1)::timestamp AT TIME ZONE 'Europe/Berlin'))`
  const join = `FROM customer_auth.documents d LEFT JOIN customer_auth.document_exports e
    ON e.document_id=d.id AND e.revision=d.revision AND e.format='xrechnung-ubl-3.0.2'`
  const values = [
    context.organizationId,
    filters.q,
    filters.status,
    filters.type,
    filters.from || null,
    filters.to || null,
  ]
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const count = await client.query(`SELECT count(*)::int AS total ${join} WHERE ${where}`, values)
    const total = count.rows[0].total as number
    const page = Math.min(filters.page, Math.max(1, Math.ceil(total / 20)))
    const result = await client.query(
      `SELECT d.id,d.uploaded_by,d.original_name,d.mime_type,d.size_bytes,d.status,d.error_code,
      d.processing_stage,d.extraction_method,
      CASE WHEN d.export_state='generating' AND d.export_started_at<=now()-interval '60 seconds' THEN 'failed' ELSE d.export_state END AS export_state,
      d.created_at,d.updated_at,
      (d.scanned_at IS NOT NULL AND d.status<>'rejected') AS source_available,
      (e.id IS NOT NULL AND d.status='approved') AS export_available,
      to_char(d.created_at AT TIME ZONE 'Europe/Berlin','YYYY-MM-DD') AS upload_date
      ${join} WHERE ${where} ORDER BY d.created_at DESC,d.id DESC LIMIT 20 OFFSET $7`,
      [...values, (page - 1) * 20],
    )
    await client.query('COMMIT')
    return {
      documents: result.rows.map(({ uploaded_by, ...row }) => ({
        ...row,
        can_delete: canDeleteDocument(context, uploaded_by),
      })),
      total,
      page,
      pageSize: 20,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
export async function getDocument(context: DocumentContext, id: string) {
  const result = await customerPool.query(
    `SELECT d.*,
     CASE WHEN d.export_state='generating' AND d.export_started_at<=now()-interval '60 seconds' THEN 'failed' ELSE d.export_state END AS export_state,
     EXISTS(SELECT 1 FROM customer_auth.document_exports e WHERE e.document_id=d.id AND e.revision=d.revision) AS export_available
     FROM customer_auth.documents d WHERE d.id=$1 AND d.organization_id=$2`,
    [id, context.organizationId],
  )
  if (!result.rows[0]) throw new DocumentError('notFound', 404)
  return result.rows[0]
}
export async function saveReview(context: DocumentContext, id: string, input: unknown) {
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) throw new DocumentError('invalidRequest')
  const { data, revision, approve, confirmations } = parsed.data
  if (approve && (!Object.values(confirmations).every(Boolean) || validateRecord(data).length))
    throw new DocumentError('reviewInvalid')
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    await lockMembership(client, context, approve)
    const document = await client.query(
      "SELECT status,revision,export_state,export_started_at>now()-interval '60 seconds' AS export_busy FROM customer_auth.documents WHERE id=$1 AND organization_id=$2 FOR UPDATE",
      [id, context.organizationId],
    )
    if (!document.rows[0]) throw new DocumentError('notFound', 404)
    if (document.rows[0].export_state === 'generating' && document.rows[0].export_busy)
      throw new DocumentError('exportBusy', 409)
    if (document.rows[0].revision !== revision) throw new DocumentError('conflict', 409)
    if (!['needs_review', 'approved'].includes(document.rows[0].status))
      throw new DocumentError('invalidState', 409)
    const next = revision + 1
    await client.query(
      'INSERT INTO customer_auth.document_reviews(id,document_id,revision,data,reviewed_by,approved) VALUES($1,$2,$3,$4,$5,$6)',
      [randomUUID(), id, next, data, context.userId, approve],
    )
    await client.query(
      "UPDATE customer_auth.documents SET reviewed_data=$3,revision=$4,status=$5,export_state='idle',approved_by=$6,approved_at=CASE WHEN $6::text IS NULL THEN NULL ELSE now() END,updated_at=now() WHERE id=$1 AND organization_id=$2",
      [
        id,
        context.organizationId,
        data,
        next,
        approve ? 'approved' : 'needs_review',
        approve ? context.userId : null,
      ],
    )
    await event(client, context, id, approve ? 'approved' : 'review_saved', {
      revision: next,
      confirmations: approve ? confirmations : undefined,
    })
    await client.query('COMMIT')
    return { revision: next, status: approve ? 'approved' : 'needs_review' }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
export async function retryDocument(context: DocumentContext, id: string) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    await lockMembership(client, context)
    const result = await client.query(
      "UPDATE customer_auth.documents SET status='queued',processing_stage='queued',error_code=NULL,lease_token=NULL,updated_at=now() WHERE id=$1 AND organization_id=$2 AND status='failed' AND attempts<3 RETURNING id",
      [id, context.organizationId],
    )
    if (!result.rowCount) throw new DocumentError('invalidState', 409)
    await event(client, context, id, 'retry_requested')
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
export async function exportDocument(context: DocumentContext, id: string) {
  const claim = await customerPool.connect()
  let started: string
  try {
    await claim.query('BEGIN')
    await lockMembership(claim, context, true)
    const result = await claim.query(
      `UPDATE customer_auth.documents SET export_state='generating',export_started_at=now(),updated_at=now()
      WHERE id=$1 AND organization_id=$2 AND status='approved'
      AND (export_state<>'generating' OR export_started_at<now()-interval '60 seconds') RETURNING export_started_at::text`,
      [id, context.organizationId],
    )
    if (!result.rowCount) throw new DocumentError('exportBusy', 409)
    started = result.rows[0].export_started_at
    await claim.query('COMMIT')
  } catch (error) {
    await claim.query('ROLLBACK')
    throw error
  } finally {
    claim.release()
  }
  try {
    const result = await generateDocumentExport(context, id)
    await customerPool.query(
      'UPDATE customer_auth.documents SET export_state=$3,updated_at=now() WHERE id=$1 AND organization_id=$2 AND export_started_at=$4',
      [id, context.organizationId, typeof result === 'string' ? 'idle' : 'failed', started],
    )
    return result
  } catch (error) {
    await customerPool.query(
      "UPDATE customer_auth.documents SET export_state='failed',updated_at=now() WHERE id=$1 AND organization_id=$2 AND export_started_at=$3",
      [id, context.organizationId, started],
    )
    throw error
  }
}
async function generateDocumentExport(context: DocumentContext, id: string) {
  const client = await customerPool.connect()
  let written: string | undefined
  try {
    await client.query('BEGIN')
    await lockMembership(client, context, true)
    const result = await client.query(
      'SELECT * FROM customer_auth.documents WHERE id=$1 AND organization_id=$2 FOR UPDATE',
      [id, context.organizationId],
    )
    const doc = result.rows[0]
    if (!doc) throw new DocumentError('notFound', 404)
    if (doc.status !== 'approved') throw new DocumentError('approvalRequired', 409)
    const existing = await client.query(
      "SELECT id FROM customer_auth.document_exports WHERE document_id=$1 AND revision=$2 AND format='xrechnung-ubl-3.0.2'",
      [id, doc.revision],
    )
    if (existing.rows[0]) {
      await client.query('COMMIT')
      return existing.rows[0].id as string
    }
    const data = recordSchema.parse(doc.reviewed_data)
    const missing = xrechnungRequirements(data)
    if (missing.length) {
      await client.query('COMMIT')
      return { issues: missing.map((field) => ({ code: field, message: 'exportIncomplete' })) }
    }
    const xml = generateXRechnung(data)
    const report = await validateXRechnung(xml)
    if (!report.valid) {
      await event(client, context, id, 'export_rejected', {
        revision: doc.revision,
        issues: report.issues.map((issue) => issue.code),
      })
      await client.query('COMMIT')
      return { issues: report.issues }
    }
    written = randomUUID()
    await writePrivate(written, Buffer.from(xml), 'export')
    await client.query(
      'INSERT INTO customer_auth.document_exports(id,document_id,revision,format,sha256,validation_report,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [written, id, doc.revision, 'xrechnung-ubl-3.0.2', sha256(xml), report, context.userId],
    )
    await event(client, context, id, 'export_validated', {
      revision: doc.revision,
      exportId: written,
    })
    await client.query('COMMIT')
    return written
  } catch (error) {
    await client.query('ROLLBACK')
    if (written) {
      const persisted = await client.query(
        'SELECT id FROM customer_auth.document_exports WHERE id=$1',
        [written],
      )
      if (!persisted.rowCount) await removePrivate(written, 'export')
    }
    throw error
  } finally {
    client.release()
  }
}
export async function downloadDocument(
  context: DocumentContext,
  id: string,
  kind: 'source' | 'preview' | 'export',
) {
  const doc = await getDocument(context, id)
  if (!doc.scanned_at || doc.status === 'rejected') throw new DocumentError('invalidState', 409)
  if (kind === 'export') {
    if (doc.status !== 'approved') throw new DocumentError('approvalRequired', 409)
    const result = await customerPool.query(
      'SELECT id,sha256 FROM customer_auth.document_exports WHERE document_id=$1 AND revision=$2',
      [id, doc.revision],
    )
    if (!result.rows[0]) throw new DocumentError('notFound', 404)
    const bytes = await readPrivate(result.rows[0].id, 'export')
    if (sha256(bytes) !== result.rows[0].sha256) throw new DocumentError('invalidFile')
    return { bytes, mime: 'application/xml', name: 'xrechnung-' + id + '.xml' }
  }
  if (kind === 'preview' && !doc.mime_type.startsWith('image/'))
    throw new DocumentError('notFound', 404)
  const bytes = await readPrivate(id, kind)
  if (kind === 'source' && sha256(bytes) !== doc.source_sha256)
    throw new DocumentError('invalidFile')
  return { bytes, mime: kind === 'preview' ? 'image/png' : doc.mime_type, name: doc.original_name }
}
