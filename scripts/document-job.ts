import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })
const { customerPool } = await import('../src/lib/customer-auth/database')
const { readPrivate, writePrivate, sha256 } = await import('../src/lib/documents/storage')
const { scanDocument } = await import('../src/lib/documents/scan')
const { prepareDocument } = await import('../src/lib/documents/prepare')
const { extractDocument, PROMPT_VERSION } = await import('../src/lib/documents/extract')
const { DocumentError } = await import('../src/lib/documents/config')
const { extractClassifiedDocument } = await import('../src/lib/documents/pipeline')
const { classifyDocument } = await import('../src/lib/documents/classify')
const { documentLog } = await import('../src/lib/documents/diagnostics')
const { validateImportedInvoice } = await import('../src/lib/documents/import-validation')
const [id, lease] = process.argv.slice(2)
let currentStage = 'scanning',
  stageStarted = performance.now()
async function stage(next: string) {
  const elapsedMs = Math.round(performance.now() - stageStarted)
  documentLog('stage_finished', { documentId: id, stage: currentStage, elapsedMs })
  currentStage = next
  stageStarted = performance.now()
  documentLog('stage_started', { documentId: id, stage: next })
  await customerPool.query(
    "INSERT INTO customer_auth.document_events(document_id,organization_id,event,details) SELECT id,organization_id,'processing_stage',$3 FROM customer_auth.documents WHERE id=$1 AND lease_token=$2",
    [id, lease, { stage: next }],
  )
}
documentLog('stage_started', { documentId: id, stage: currentStage })
try {
  const result = await customerPool.query(
    "SELECT * FROM customer_auth.documents WHERE id=$1 AND lease_token=$2 AND status='processing'",
    [id, lease],
  )
  const doc = result.rows[0]
  if (!doc) throw new DocumentError('invalidState')
  await customerPool.query(
    "INSERT INTO customer_auth.document_events(document_id,organization_id,event,details) VALUES($1,$2,'processing_stage',$3)",
    [id, doc.organization_id, { stage: 'scanning' }],
  )
  const bytes = await readPrivate(id)
  if (sha256(bytes) !== doc.source_sha256) throw new DocumentError('invalidFile')
  await scanDocument(bytes)
  await stage('reading')
  await customerPool.query(
    "UPDATE customer_auth.documents SET scanned_at=now(),processing_stage='reading',updated_at=now() WHERE id=$1 AND lease_token=$2",
    [id, lease],
  )
  const prepared = await prepareDocument(bytes, doc.mime_type)
  if (prepared.structured) {
    if (doc.workflow !== 'incoming') throw new DocumentError('structuredIncomingOnly')
    if (prepared.embedded) await scanDocument(prepared.embedded)
    await stage('checking')
    await customerPool.query(
      "UPDATE customer_auth.documents SET processing_stage='checking',extraction_method=$3,updated_at=now() WHERE id=$1 AND lease_token=$2",
      [id, lease, prepared.method],
    )
    const validation = await validateImportedInvoice(prepared.structured, bytes, doc.mime_type)
    const client = await customerPool.connect()
    try {
      await client.query('BEGIN')
      const saved = await client.query(
        `UPDATE customer_auth.documents SET status='needs_review',processing_stage='complete',
        extracted_data=$3,source_text=$4,page_count=$5,evidence='[]',extraction_warnings='[]',model='structured-local',prompt_version='structured-v1',
        input_validation=$6,classification=$7,lease_token=NULL,error_code=NULL,updated_at=now()
        WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING id`,
        [
          id,
          lease,
          prepared.structured.data,
          prepared.text,
          prepared.pages,
          validation,
          { kind: 'invoice', confidence: 'high', reason: 'Structured invoice' },
        ],
      )
      if (saved.rowCount)
        await client.query(
          "INSERT INTO customer_auth.document_events(document_id,organization_id,event,details) VALUES($1,$2,'extracted',$3)",
          [
            id,
            doc.organization_id,
            {
              method: prepared.method,
              format: prepared.structured.format,
              valid: validation.valid,
            },
          ],
        )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } else {
    const preparation = await customerPool.connect()
    try {
      await preparation.query('BEGIN')
      const current = await preparation.query(
        "SELECT id FROM customer_auth.documents WHERE id=$1 AND lease_token=$2 AND status='processing' FOR UPDATE",
        [id, lease],
      )
      if (!current.rowCount) throw new DocumentError('invalidState')
      if (prepared.preview) {
        try {
          await writePrivate(id, prepared.preview, 'preview')
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
        }
      }
      await preparation.query(
        "UPDATE customer_auth.documents SET source_text=$3,page_count=$4,processing_stage='classifying',updated_at=now() WHERE id=$1 AND lease_token=$2",
        [id, lease, prepared.text, prepared.pages],
      )
      await preparation.query('COMMIT')
    } catch (error) {
      await preparation.query('ROLLBACK')
      throw error
    } finally {
      preparation.release()
    }
    await stage('classifying')
    const classification = await classifyDocument(prepared)
    const supported = classification.kind === 'invoice' && classification.confidence === 'high'
    const transition = await customerPool.query(
      "UPDATE customer_auth.documents SET classification=$3,processing_stage='extracting',updated_at=now() WHERE id=$1 AND lease_token=$2 RETURNING id",
      [id, lease, classification],
    )
    if (!transition.rowCount) throw new DocumentError('invalidState')
    await stage(supported ? 'extracting' : 'checking')
    const extracted = await extractClassifiedDocument(prepared, classification, extractDocument)
    await customerPool.query(
      "UPDATE customer_auth.documents SET processing_stage='checking',extraction_method=$3,updated_at=now() WHERE id=$1 AND lease_token=$2",
      [id, lease, extracted.method],
    )
    if (supported) await stage('checking')
    // A source page reference can never extend beyond the actual document.
    const evidence = extracted.evidence.map((item) => ({
      ...item,
      page: prepared.pages && item.page && item.page <= prepared.pages ? item.page : null,
    }))
    const client = await customerPool.connect()
    try {
      await client.query('BEGIN')
      const saved = await client.query(
        "UPDATE customer_auth.documents SET status=$8,processing_stage='complete',extracted_data=$3,evidence=$4,extraction_warnings=$5,model=$6,prompt_version=$7,lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING organization_id",
        [
          id,
          lease,
          extracted.data,
          JSON.stringify(evidence),
          JSON.stringify(extracted.warnings),
          extracted.model,
          PROMPT_VERSION,
          supported && extracted.data.documentType === 'invoice' ? 'needs_review' : 'unsupported',
        ],
      )
      if (saved.rowCount)
        await client.query(
          'INSERT INTO customer_auth.document_events(document_id,organization_id,event,details) VALUES($1,$2,$4,$3)',
          [
            id,
            doc.organization_id,
            { model: extracted.model, promptVersion: PROMPT_VERSION, classification },
            supported ? 'extracted' : 'classified_unsupported',
          ],
        )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  documentLog('job_completed', {
    documentId: id,
    stage: currentStage,
    elapsedMs: Math.round(performance.now() - stageStarted),
  })
} catch (error) {
  const code = error instanceof DocumentError ? error.code : 'extractionFailed'
  await customerPool.query(
    'UPDATE customer_auth.documents SET status=$3,error_code=$4,lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2',
    [id, lease, code === 'unsafeFile' ? 'rejected' : 'failed', code],
  )
  documentLog('stage_failed', {
    documentId: id,
    stage: currentStage,
    code,
    elapsedMs: Math.round(performance.now() - stageStarted),
  })
  await customerPool
    .query(
      "INSERT INTO customer_auth.document_events(document_id,organization_id,event,details) SELECT id,organization_id,'processing_failed',$2 FROM customer_auth.documents WHERE id=$1",
      [id, { stage: currentStage, code }],
    )
    .catch(() => {})
  process.exitCode = 1
} finally {
  await customerPool.end()
}
