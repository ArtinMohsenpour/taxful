import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })
const { customerPool } = await import('../src/lib/customer-auth/database')
const { readPrivate, writePrivate, sha256 } = await import('../src/lib/documents/storage')
const { scanDocument } = await import('../src/lib/documents/scan')
const { prepareDocument } = await import('../src/lib/documents/prepare')
const { extractDocument, PROMPT_VERSION } = await import('../src/lib/documents/extract')
const { DocumentError } = await import('../src/lib/documents/config')
const { extractPreparedDocument } = await import('../src/lib/documents/pipeline')
const [id, lease] = process.argv.slice(2)
try {
  const result = await customerPool.query(
    "SELECT * FROM customer_auth.documents WHERE id=$1 AND lease_token=$2 AND status='processing'",
    [id, lease],
  )
  const doc = result.rows[0]
  if (!doc) throw new DocumentError('invalidState')
  const bytes = await readPrivate(id)
  if (sha256(bytes) !== doc.source_sha256) throw new DocumentError('invalidFile')
  await scanDocument(bytes)
  await customerPool.query(
    "UPDATE customer_auth.documents SET scanned_at=now(),processing_stage='reading',updated_at=now() WHERE id=$1 AND lease_token=$2",
    [id, lease],
  )
  const prepared = await prepareDocument(bytes, doc.mime_type)
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
      "UPDATE customer_auth.documents SET source_text=$3,page_count=$4,processing_stage='extracting',updated_at=now() WHERE id=$1 AND lease_token=$2",
      [id, lease, prepared.text, prepared.pages],
    )
    await preparation.query('COMMIT')
  } catch (error) {
    await preparation.query('ROLLBACK')
    throw error
  } finally {
    preparation.release()
  }
  const extracted = await extractPreparedDocument(prepared, extractDocument)
  await customerPool.query(
    "UPDATE customer_auth.documents SET processing_stage='checking',extraction_method=$3,updated_at=now() WHERE id=$1 AND lease_token=$2",
    [id, lease, extracted.method],
  )
  // A source page reference can never extend beyond the actual document.
  const evidence = extracted.evidence.map((item) => ({
    ...item,
    page: prepared.pages && item.page && item.page <= prepared.pages ? item.page : null,
  }))
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    const saved = await client.query(
      "UPDATE customer_auth.documents SET status='needs_review',processing_stage='complete',extracted_data=$3,evidence=$4,extraction_warnings=$5,model=$6,prompt_version=$7,lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING organization_id",
      [
        id,
        lease,
        extracted.data,
        JSON.stringify(evidence),
        JSON.stringify(extracted.warnings),
        extracted.model,
        PROMPT_VERSION,
      ],
    )
    if (saved.rowCount)
      await client.query(
        "INSERT INTO customer_auth.document_events(document_id,organization_id,event,details) VALUES($1,$2,'extracted',$3)",
        [id, doc.organization_id, { model: extracted.model, promptVersion: PROMPT_VERSION }],
      )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
} catch (error) {
  const code = error instanceof DocumentError ? error.code : 'extractionFailed'
  await customerPool.query(
    'UPDATE customer_auth.documents SET status=$3,error_code=$4,lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2',
    [id, lease, code === 'unsafeFile' ? 'rejected' : 'failed', code],
  )
  console.error('Document job failed:', id, code)
  process.exitCode = 1
} finally {
  await customerPool.end()
}
