import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, rmdir } from 'node:fs/promises'
import { config } from 'dotenv'
import sharp from 'sharp'
import { invoiceFixture } from './fixtures'
import {
  removePrivate,
  readPrivate,
  writePrivate,
  storagePath,
} from '../../src/lib/documents/storage'

test(
  'company isolation, approval roles, request idempotency, quotas and immutable exports',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const {
      uploadDocuments,
      getDocument,
      saveReview,
      exportDocument,
      downloadDocument,
      entitlements,
      documentLibrary,
    } = await import('../../src/lib/documents/service')
    const userId = randomUUID(),
      memberId = randomUUID(),
      organizationId = randomUUID(),
      otherOrg = randomUUID()
    const owner = { userId, organizationId, role: 'owner' }
    const member = { userId: memberId, organizationId, role: 'owner' } // forged/stale UI role must not grant approval
    const outsider = { userId, organizationId: otherOrg, role: 'owner' }
    const cleanupDocs: string[] = [],
      cleanupExports: string[] = []
    try {
      for (const id of [userId, memberId])
        await pool.query(
          'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
          [id, 'Synthetic Test', id + '@example.test'],
        )
      for (const id of [organizationId, otherOrg])
        await pool.query(
          'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
          [id, 'Synthetic Document Test'],
        )
      for (const [uid, org, role] of [
        [userId, organizationId, 'owner'],
        [memberId, organizationId, 'member'],
        [userId, otherOrg, 'owner'],
      ])
        await pool.query(
          'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
          [randomUUID(), org, uid, role],
        )
      await pool.query(
        'INSERT INTO customer_auth.document_entitlements(organization_id,daily_limit,batch_limit) VALUES($1,2,1)',
        [organizationId],
      )
      const png = await sharp({
        create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
      })
        .png()
        .toBuffer()
      const file = new File([new Uint8Array(png)], 'synthetic.png', { type: 'image/png' })
      const key = randomUUID()
      const [id] = await uploadDocuments(owner, [file], key)
      cleanupDocs.push(id)
      assert.deepEqual(await uploadDocuments(owner, [file], key), [id])
      assert.equal((await entitlements(owner)).used, 1)
      const { documentFilters } = await import('../../src/lib/documents/listing')
      assert.equal(
        (
          await documentLibrary(
            owner,
            documentFilters(new URLSearchParams('q=synthetic&type=image&status=queued')),
          )
        ).total,
        1,
      )
      assert.equal((await documentLibrary(outsider)).total, 0)
      assert.equal(
        (await documentLibrary(owner, documentFilters(new URLSearchParams('q=%')))).total,
        0,
      )
      assert.equal(
        (await documentLibrary(owner, documentFilters(new URLSearchParams('from=2099-01-01'))))
          .total,
        0,
      )
      await assert.rejects(
        getDocument(outsider, id),
        (error: unknown) => error instanceof Error && error.message === 'notFound',
      )
      await assert.rejects(downloadDocument(owner, id, 'source')) // quarantined until clean scan
      await assert.rejects(
        uploadDocuments(owner, [file, file], randomUUID()),
        (error: unknown) => error instanceof Error && error.message === 'batchLimit',
      )
      // This seeds only synthetic extraction output; no AI provider request is made.
      await pool.query(
        "UPDATE customer_auth.documents SET status='needs_review',scanned_at=now(),extracted_data=$2 WHERE id=$1",
        [id, invoiceFixture()],
      )
      const review = {
        revision: 0,
        data: invoiceFixture(),
        approve: true,
        confirmations: { identity: true, dates: true, amounts: true, completeness: true },
      }
      await assert.rejects(
        saveReview(member, id, review),
        (error: unknown) => error instanceof Error && error.message === 'forbidden',
      )
      await assert.rejects(
        saveReview(owner, id, {
          ...review,
          confirmations: { ...review.confirmations, identity: false },
        }),
      )
      await saveReview(owner, id, review)
      await assert.rejects(
        saveReview(owner, id, review),
        (error: unknown) => error instanceof Error && error.message === 'conflict',
      )
      const exported = await exportDocument(owner, id)
      assert.equal(typeof exported, 'string', JSON.stringify(exported))
      cleanupExports.push(exported as string)
      assert.equal(await exportDocument(owner, id), exported)
      const pdfExport = await exportDocument(owner, id, 'zugferd')
      assert.equal(typeof pdfExport, 'string')
      cleanupExports.push(pdfExport as string)
      assert.notEqual(pdfExport, exported)
      assert.equal(await exportDocument(owner, id, 'zugferd'), pdfExport)
      const pdfDownload = await downloadDocument(owner, id, 'zugferd')
      assert.equal(pdfDownload.bytes.subarray(0, 5).toString(), '%PDF-')
      await assert.rejects(downloadDocument(outsider, id, 'zugferd'))
      assert.equal((await getDocument(owner, id)).zugferd_available, true)

      assert.equal(
        (await documentLibrary(owner, documentFilters(new URLSearchParams('status=exported'))))
          .total,
        1,
      )
      assert.equal((await getDocument(owner, id)).export_state, 'idle')
      assert.ok((await downloadDocument(owner, id, 'export')).bytes.length)
      await assert.rejects(downloadDocument(outsider, id, 'export'))
      await saveReview(owner, id, { ...review, revision: 1, approve: false })
      await assert.rejects(
        downloadDocument(owner, id, 'export'),
        (error: unknown) => error instanceof Error && error.message === 'approvalRequired',
      )
      await assert.rejects(downloadDocument(owner, id, 'zugferd'))
      const concurrent = await Promise.allSettled([
        uploadDocuments(owner, [file], randomUUID()),
        uploadDocuments(owner, [file], randomUUID()),
      ])
      assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1)
      for (const result of concurrent)
        if (result.status === 'fulfilled') cleanupDocs.push(...result.value)
      assert.equal((await entitlements(owner)).used, 2)
      const cleanupId = randomUUID()
      const obstacle = storagePath(cleanupId)
      await mkdir(obstacle)
      try {
        await pool.query(
          'INSERT INTO customer_auth.document_deletions(id,artifacts) VALUES($1,$2)',
          [cleanupId, JSON.stringify([{ id: cleanupId, kind: 'source' }])],
        )
        const { cleanupDeletedDocuments } = await import('../../src/lib/documents/deletion')
        assert.equal(await cleanupDeletedDocuments(cleanupId), false)
        assert.equal(
          (
            await pool.query('SELECT attempts FROM customer_auth.document_deletions WHERE id=$1', [
              cleanupId,
            ])
          ).rows[0].attempts,
          1,
        )
        await rmdir(obstacle)
        assert.equal(await cleanupDeletedDocuments(cleanupId), true)
      } finally {
        await rmdir(obstacle).catch(() => {})
        await pool.query('DELETE FROM customer_auth.document_deletions WHERE id=$1', [cleanupId])
      }
      // A history larger than a page remains reachable, with a stable tie-breaker.
      for (let index = 0; index < 21; index++) {
        const extra = randomUUID()
        await pool.query(
          `INSERT INTO customer_auth.documents(id,organization_id,batch_id,uploaded_by,original_name,mime_type,size_bytes,source_sha256,created_at)
          SELECT $2,organization_id,batch_id,uploaded_by,'History fixture '||$3::text,mime_type,size_bytes,source_sha256,'2026-09-12T22:30:00Z'::timestamptz
          FROM customer_auth.documents WHERE id=$1`,
          [id, extra, index],
        )
        cleanupDocs.push(extra)
      }
      const page1 = await documentLibrary(
        owner,
        documentFilters(new URLSearchParams('q=History&from=2026-09-13&to=2026-09-13')),
      )
      const page2 = await documentLibrary(
        owner,
        documentFilters(new URLSearchParams('q=History&page=2')),
      )
      assert.equal(page1.total, 21)
      assert.equal(page1.documents.length, 20)
      assert.equal(page2.documents.length, 1)
      assert.ok(!page1.documents.some((row) => row.id === page2.documents[0].id))
      const { deleteDocument } = await import('../../src/lib/documents/deletion')
      await writePrivate(id, png, 'preview')
      await assert.rejects(
        deleteDocument(outsider, id),
        (error: unknown) => error instanceof Error && error.message === 'notFound',
      )
      await assert.rejects(
        deleteDocument(member, id),
        (error: unknown) => error instanceof Error && error.message === 'forbidden',
      )
      await pool.query("UPDATE customer_auth.documents SET status='processing' WHERE id=$1", [id])
      await assert.rejects(
        deleteDocument(owner, id),
        (error: unknown) => error instanceof Error && error.message === 'deleteBusy',
      )
      await pool.query("UPDATE customer_auth.documents SET status='needs_review' WHERE id=$1", [id])
      assert.equal((await deleteDocument(owner, id)).cleanupPending, false)
      await assert.rejects(readPrivate(id))
      await assert.rejects(readPrivate(id, 'preview'))
      await assert.rejects(readPrivate(exported as string, 'export'))
      assert.equal(
        (
          await pool.query('SELECT id FROM customer_auth.document_reviews WHERE document_id=$1', [
            id,
          ])
        ).rowCount,
        0,
      )
      assert.equal(
        (
          await pool.query('SELECT id FROM customer_auth.document_exports WHERE document_id=$1', [
            id,
          ])
        ).rowCount,
        0,
      )
      assert.equal((await entitlements(owner)).used, 2)
    } finally {
      // Exact random test IDs only; no customer records or files are touched.
      const exports = await pool.query(
        'SELECT e.id FROM customer_auth.document_exports e JOIN customer_auth.documents d ON d.id=e.document_id WHERE d.organization_id=$1',
        [organizationId],
      )
      for (const row of exports.rows)
        if (!cleanupExports.includes(row.id)) cleanupExports.push(row.id)
      const documents = await pool.query(
        'SELECT id FROM customer_auth.documents WHERE organization_id=$1',
        [organizationId],
      )
      for (const row of documents.rows) if (!cleanupDocs.includes(row.id)) cleanupDocs.push(row.id)
      await pool.query('DELETE FROM customer_auth.organizations WHERE id=ANY($1::text[])', [
        [organizationId, otherOrg],
      ])
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=ANY($1::text[])', [
        [userId, memberId],
      ])
      for (const id of cleanupDocs) {
        await removePrivate(id)
        await removePrivate(id, 'preview')
      }
      for (const id of cleanupExports) await removePrivate(id, 'export')
      await pool.end()
    }
  },
)
