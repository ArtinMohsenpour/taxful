import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { blankCompanyProfile } from '../../src/lib/documents/company-profile-schema'
import { productSchema } from '../../src/lib/invoices/schema'
import { invoiceFixture } from './fixtures'

test('catalog validates unit codes, net prices and supported tax treatment', () => {
  const product = {
    description: 'Consulting',
    unitCode: 'HUR',
    unitPrice: '100.00',
    taxRate: '19',
    currency: 'EUR',
  }
  assert.equal(productSchema.safeParse(product).success, true)
  assert.equal(
    productSchema.safeParse({ ...product, taxCategory: 'AE', taxRate: '0' }).success,
    true,
  )
  assert.equal(
    productSchema.safeParse({ ...product, taxCategory: 'E', taxRate: '19' }).success,
    false,
  )
  for (const change of [
    { unitCode: 'UNKNOWN' },
    { unitPrice: '-1' },
    { unitPrice: '10.123' },
    { taxRate: '0' },
    { currency: 'USD' },
  ])
    assert.equal(productSchema.safeParse({ ...product, ...change }).success, false)
})

test(
  'invoice lifecycle: tenant isolation, idempotency, snapshots, numbering and received-file restrictions',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { createInvoiceDraft, saveDirectory, directory, updateInvoiceWorkflow } =
      await import('../../src/lib/invoices/service')
    const { getDocument, saveReview, exportDocument, downloadDocument, documentLibrary } =
      await import('../../src/lib/documents/service')
    const { deleteDocument } = await import('../../src/lib/documents/deletion')
    const { documentFilters } = await import('../../src/lib/documents/listing')
    const { workspaceOverview } = await import('../../src/lib/documents/overview')
    const org = randomUUID(),
      other = randomUUID(),
      owner = randomUUID(),
      member = randomUUID()
    const context = { organizationId: org, userId: owner, role: 'owner' }
    try {
      for (const id of [owner, member])
        await pool.query(
          'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
          [id, 'Synthetic', id + '@example.test'],
        )
      for (const id of [org, other])
        await pool.query(
          'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
          [id, 'Synthetic Invoices'],
        )
      for (const [userId, role] of [
        [owner, 'owner'],
        [member, 'member'],
      ])
        await pool.query(
          'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
          [randomUUID(), org, userId, role],
        )
      await pool.query(
        'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
        [randomUUID(), other, owner, 'owner'],
      )
      const customer = {
        organizationId: org,
        revision: 0,
        data: { ...blankCompanyProfile, companyName: 'Synthetic Customer' },
      }
      await assert.rejects(saveDirectory({ ...context, userId: member }, 'customers', customer), {
        message: 'forbidden',
      })
      const saved = await saveDirectory(context, 'customers', customer)
      await assert.rejects(
        saveDirectory(context, 'customers', { ...customer, id: saved.id, revision: 0 }),
        { message: 'conflict' },
      )
      assert.equal((await directory({ ...context, organizationId: other }, 'customers')).length, 0)
      const product = await saveDirectory(context, 'products', {
        organizationId: org,
        revision: 0,
        data: {
          description: 'Consulting',
          unitCode: 'HUR',
          unitPrice: '100.00',
          taxRate: '19',
          currency: 'EUR',
        },
      })
      const request = {
        organizationId: org,
        requestKey: randomUUID(),
        customerId: saved.id,
        productIds: [product.id],
      }
      const [first, replayed] = await Promise.all([
        createInvoiceDraft(context, request),
        createInvoiceDraft(context, request),
      ])
      assert.equal(first.id, replayed.id)
      const doc = await getDocument(context, first.id)
      assert.equal(doc.reviewed_data.recipient.companyName, 'Synthetic Customer')
      assert.equal(doc.reviewed_data.grossAmount, '119.00')
      assert.equal(doc.scanned_at, null)
      assert.equal(doc.source_kind, 'manual')
      await assert.rejects(downloadDocument(context, first.id, 'source'), { message: 'notFound' })
      await assert.rejects(
        createInvoiceDraft(
          { ...context, organizationId: other },
          { ...request, organizationId: other, requestKey: randomUUID() },
        ),
        { message: 'notFound' },
      )
      await saveDirectory(context, 'customers', {
        ...customer,
        id: saved.id,
        revision: 1,
        data: { ...customer.data, companyName: 'Changed name' },
      })
      assert.equal(
        (await getDocument(context, first.id)).reviewed_data.recipient.companyName,
        'Synthetic Customer',
      )
      const second = await createInvoiceDraft(context, {
        organizationId: org,
        requestKey: randomUUID(),
      })
      assert.notEqual(
        (await getDocument(context, second.id)).reviewed_data.documentNumber,
        doc.reviewed_data.documentNumber,
      )
      await deleteDocument(context, second.id)
      const third = await createInvoiceDraft(context, {
        organizationId: org,
        requestKey: randomUUID(),
      })
      assert.notEqual(
        (await getDocument(context, third.id)).reviewed_data.documentNumber,
        doc.reviewed_data.documentNumber,
      )
      const reviewed = { ...invoiceFixture(), documentNumber: doc.reviewed_data.documentNumber }
      const review = {
        revision: 0,
        data: reviewed,
        approve: true,
        confirmations: { identity: true, dates: true, amounts: true, completeness: true },
      }
      await assert.rejects(saveReview({ ...context, userId: member }, first.id, review), {
        message: 'forbidden',
      })
      await assert.rejects(
        saveReview(context, first.id, {
          ...review,
          data: { ...reviewed, documentNumber: 'different' },
        }),
        { message: 'numberLocked' },
      )
      await saveReview(context, first.id, { ...review, saveCustomer: true })
      const savedCustomerId = (await getDocument(context, first.id)).saved_customer_id
      assert.ok(savedCustomerId)
      assert.equal((await directory(context, 'customers')).length, 2)
      const thirdDocument = await getDocument(context, third.id)
      await saveReview(context, third.id, {
        ...review,
        data: { ...reviewed, documentNumber: thirdDocument.reviewed_data.documentNumber },
        approve: false,
      })
      assert.equal((await directory(context, 'customers')).length, 2)
      assert.equal((await getDocument(context, third.id)).saved_customer_id, null)
      await pool.query(
        'UPDATE customer_auth.organization_memberships SET role=$3 WHERE "organizationId"=$1 AND "userId"=$2',
        [org, member, 'reviewer'],
      )
      await assert.rejects(
        saveReview({ ...context, userId: member }, first.id, {
          ...review,
          revision: 1,
          saveCustomer: true,
        }),
        { message: 'forbidden' },
      )
      assert.equal((await getDocument(context, first.id)).revision, 1)
      await saveReview(context, first.id, { ...review, revision: 1, saveCustomer: true })
      assert.equal((await getDocument(context, first.id)).saved_customer_id, savedCustomerId)
      assert.equal((await directory(context, 'customers')).length, 2)
      // Simulate successful validator completion for lifecycle checks; live validators are exercised separately.
      await pool.query(
        "UPDATE customer_auth.documents SET invoice_state='issued',issued_at=now() WHERE id=$1",
        [first.id],
      )
      await assert.rejects(saveReview(context, first.id, { ...review, revision: 1 }), {
        message: 'invoiceLocked',
      })
      await assert.rejects(deleteDocument(context, first.id), { message: 'invoiceLocked' })
      await updateInvoiceWorkflow(context, first.id, { organizationId: org, action: 'sent' })
      await updateInvoiceWorkflow(context, first.id, { organizationId: org, action: 'paid' })
      assert.equal((await getDocument(context, first.id)).invoice_state, 'paid')
      await assert.rejects(
        createInvoiceDraft(
          { ...context, organizationId: other },
          {
            organizationId: other,
            requestKey: randomUUID(),
            invoiceKind: 'credit_note',
            sourceInvoiceId: first.id,
          },
        ),
        { message: 'invalidReference' },
      )
      await assert.rejects(
        createInvoiceDraft(context, {
          organizationId: org,
          requestKey: randomUUID(),
          invoiceKind: 'credit_note',
          sourceInvoiceId: third.id,
        }),
        { message: 'invalidReference' },
      )
      const creditRequest = {
        organizationId: org,
        requestKey: randomUUID(),
        invoiceKind: 'credit_note',
        sourceInvoiceId: first.id,
      }
      const credit = await createInvoiceDraft(context, creditRequest)
      assert.equal((await createInvoiceDraft(context, creditRequest)).id, credit.id)
      const creditData = (await getDocument(context, credit.id)).reviewed_data
      assert.equal(creditData.invoiceKind, 'credit_note')
      assert.notEqual(creditData.documentNumber, reviewed.documentNumber)
      assert.deepEqual(creditData.precedingInvoices, [
        { number: reviewed.documentNumber, date: reviewed.documentDate },
      ])
      assert.equal(creditData.grossAmount, '119.00')
      assert.equal(creditData.invoiceNote, '')
      assert.equal((await getDocument(context, first.id)).invoice_state, 'paid')
      const batch = randomUUID(),
        incoming = randomUUID()
      await pool.query(
        'INSERT INTO customer_auth.document_batches(id,organization_id,request_key,fingerprint) VALUES($1,$2,$3,$4)',
        [batch, org, randomUUID(), 'synthetic'],
      )
      await pool.query(
        "INSERT INTO customer_auth.documents(id,organization_id,batch_id,uploaded_by,original_name,mime_type,size_bytes,source_sha256,status,scanned_at,workflow,extracted_data) VALUES($1,$2,$3,$4,'Synthetic received.pdf','application/pdf',1,'test','needs_review',now(),'incoming',$5)",
        [incoming, org, batch, owner, invoiceFixture()],
      )
      await assert.rejects(saveReview(context, incoming, review), { message: 'workflowRequired' })
      await updateInvoiceWorkflow(context, incoming, {
        organizationId: org,
        action: 'received_reviewed',
      })
      await assert.rejects(exportDocument(context, incoming), { message: 'exportBusy' })
      const list = await documentLibrary(
        context,
        documentFilters(new URLSearchParams('workflow=incoming')),
      )
      assert.deepEqual(
        list.documents.map((row) => row.id),
        [incoming],
      )
      const dashboard = await workspaceOverview(context)
      assert.deepEqual(
        {
          documents: dashboard.stats.documents,
          outgoing: dashboard.stats.outgoing,
          incoming: dashboard.stats.incoming,
          customers: dashboard.stats.customers,
          exportFiles: dashboard.stats.exportFiles,
          needsAttention: dashboard.stats.needsAttention,
        },
        { documents: 4, outgoing: 3, incoming: 1, customers: 2, exportFiles: 0, needsAttention: 2 },
      )
      assert.equal(dashboard.recent.length, 4)
      assert.equal(
        (await workspaceOverview({ ...context, organizationId: other })).stats.documents,
        0,
      )
      await pool.query(
        'DELETE FROM customer_auth.organization_memberships WHERE "organizationId"=$1 AND "userId"=$2',
        [org, member],
      )
      await assert.rejects(
        createInvoiceDraft(
          { ...context, userId: member },
          { organizationId: org, requestKey: randomUUID() },
        ),
        { message: 'forbidden' },
      )
    } finally {
      await pool.query('DELETE FROM customer_auth.organizations WHERE id=ANY($1::text[])', [
        [org, other],
      ])
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=ANY($1::text[])', [
        [owner, member],
      ])
      await pool.end()
    }
  },
)
