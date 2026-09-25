import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { customerPool } from '../customer-auth/database'
import { lockMembership, type DocumentContext } from '../documents/access'
import { canManageCompany } from '../documents/company-profile'
import { DocumentError } from '../documents/config'
import { consumeDocuments } from '../billing/usage'
import { emptyRecord, recordSchema } from '../documents/schema'
import { companyProfileSchema } from '../documents/company-profile-schema'
import { calculateInvoice } from '../documents/invoice-calculation'
import { event } from '../documents/service'
import { sha256 } from '../documents/storage'
import { customerSchema, productSchema, draftSchema } from './schema'
import type { PoolClient } from 'pg'
import { hasPermission } from '../customer-auth/permissions'

export type DirectoryKind = 'customers' | 'products'
const tables = { customers: 'invoice_customers', products: 'invoice_products' } as const
export async function invoiceTransaction<T>(
  context: DocumentContext,
  fn: (client: PoolClient, role: string) => Promise<T>,
) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    const role = await lockMembership(client, context)
    const result = await fn(client, role)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
export async function directory(context: DocumentContext, kind: DirectoryKind, query = '') {
  if (query.length > 120) throw new DocumentError('invalidRequest')
  return invoiceTransaction(context, async (client) => {
    const result = await client.query(
      `SELECT id,data,revision,archived FROM customer_auth.${tables[kind]}
       WHERE organization_id=$1 AND NOT archived AND ($2='' OR position(lower($2) in lower(data::text))>0)
       ORDER BY updated_at DESC,id LIMIT 200`,
      [context.organizationId, query],
    )
    return result.rows
  })
}
export async function saveDirectory(context: DocumentContext, kind: DirectoryKind, input: unknown) {
  const schema = z
    .object({
      id: z.uuid().optional(),
      revision: z.number().int().nonnegative(),
      organizationId: z.string(),
      archived: z.boolean().default(false),
      data: kind === 'customers' ? customerSchema : productSchema,
    })
    .strict()
  const parsed = schema.safeParse(input)
  if (!parsed.success || parsed.data.organizationId !== context.organizationId)
    throw new DocumentError('invalidRequest')
  const value = parsed.data
  return invoiceTransaction(context, async (client, role) => {
    if (!hasPermission(role,'directory')) throw new DocumentError('forbidden', 403)
    if (value.id) {
      const result = await client.query(
        `UPDATE customer_auth.${tables[kind]}
        SET data=$3,archived=$4,revision=revision+1,updated_at=now()
        WHERE id=$1 AND organization_id=$2 AND revision=$5 RETURNING id,revision`,
        [value.id, context.organizationId, value.data, value.archived, value.revision],
      )
      if (!result.rows[0]) throw new DocumentError('conflict', 409)
      return result.rows[0]
    }
    if (value.revision !== 0 || value.archived) throw new DocumentError('invalidRequest')
    const id = randomUUID()
    await client.query(
      `INSERT INTO customer_auth.${tables[kind]}(id,organization_id,data) VALUES($1,$2,$3)`,
      [id, context.organizationId, value.data],
    )
    return { id, revision: 1 }
  })
}
export async function createInvoiceDraft(context: DocumentContext, input: unknown) {
  const parsed = draftSchema.safeParse(input)
  if (!parsed.success || parsed.data.organizationId !== context.organizationId)
    throw new DocumentError('invalidRequest')
  const value = parsed.data
  const fingerprint = sha256(JSON.stringify(value))
  return invoiceTransaction(context, async (client) => {
    // Serializes idempotent requests, quota consumption and number reservation per company.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      'document-upload:' + context.organizationId,
    ])
    const previous = await client.query(
      'SELECT document_id,fingerprint FROM customer_auth.invoice_draft_requests WHERE organization_id=$1 AND request_key=$2',
      [context.organizationId, value.requestKey],
    )
    if (previous.rows[0]) {
      if (!previous.rows[0].document_id || previous.rows[0].fingerprint !== fingerprint)
        throw new DocumentError('conflict', 409)
      return { id: previous.rows[0].document_id as string }
    }
    await consumeDocuments(client, context.organizationId, 'draft:' + value.requestKey, 1)
    const data = emptyRecord('invoice')
    data.invoiceKind = value.invoiceKind || 'standard'
    data.currency = 'EUR'
    data.issuer.country = data.recipient.country = 'DE'
    const date = await client.query(
      "SELECT to_char(now() AT TIME ZONE 'Europe/Berlin','YYYY-MM-DD') AS date",
    )
    data.documentDate = date.rows[0].date
    data.supplyDate = data.documentDate
    const year = Number(data.documentDate.slice(0, 4))
    const sequence = await client.query(
      `INSERT INTO customer_auth.invoice_sequences(organization_id,year,next_value) VALUES($1,$2,2)
      ON CONFLICT(organization_id,year) DO UPDATE SET next_value=invoice_sequences.next_value+1 RETURNING next_value-1 AS value`,
      [context.organizationId, year],
    )
    data.documentNumber = `TF-${year}-${String(sequence.rows[0].value).padStart(6, '0')}`
    const profile = await client.query(
      'SELECT data FROM customer_auth.company_invoice_profiles WHERE organization_id=$1',
      [context.organizationId],
    )
    if (profile.rows[0]) {
      const company = companyProfileSchema.parse(profile.rows[0].data)
      data.issuer = { ...data.issuer, ...company, country: company.country || 'DE' }
    }
    if (value.customerId) {
      const customer = await client.query(
        'SELECT data FROM customer_auth.invoice_customers WHERE id=$1 AND organization_id=$2 AND NOT archived',
        [value.customerId, context.organizationId],
      )
      if (!customer.rows[0]) throw new DocumentError('notFound', 404)
      const selected = customerSchema.parse(customer.rows[0].data)
      data.recipient = { ...data.recipient, ...selected, country: selected.country || 'DE' }
    }
    for (const productId of value.productIds) {
      const result = await client.query(
        'SELECT data FROM customer_auth.invoice_products WHERE id=$1 AND organization_id=$2 AND NOT archived',
        [productId, context.organizationId],
      )
      if (!result.rows[0]) throw new DocumentError('notFound', 404)
      const product = productSchema.parse(result.rows[0].data)
      data.lines.push({
        description: product.description,
        quantity: '1',
        unitCode: product.unitCode,
        unitPrice: product.unitPrice,
        netAmount: product.unitPrice,
        taxRate: product.taxRate,
        taxCategory: product.taxCategory || 'S',
      })
    }
    if (!data.lines.length)
      data.lines.push({
        description: '',
        quantity: '1',
        unitCode: 'C62',
        unitPrice: '',
        netAmount: '',
        taxRate: '19',
      })
    if (value.sourceInvoiceId) {
      if (!['credit_note', 'correction', 'final'].includes(data.invoiceKind!))
        throw new DocumentError('invalidReference')
      const source = await client.query(
        "SELECT reviewed_data FROM customer_auth.documents WHERE id=$1 AND organization_id=$2 AND workflow='outgoing' AND invoice_state IN ('issued','sent','paid') FOR SHARE",
        [value.sourceInvoiceId, context.organizationId],
      )
      if (!source.rows[0]) throw new DocumentError('invalidReference')
      const original = recordSchema.parse(source.rows[0].reviewed_data)
      if (
        original.invoiceKind === 'credit_note' ||
        (data.invoiceKind === 'final' &&
          !['partial', 'prepayment'].includes(original.invoiceKind || 'standard'))
      )
        throw new DocumentError('invalidReference')
      const { documentNumber, documentDate, invoiceKind } = data
      Object.assign(data, original, {
        documentNumber,
        documentDate,
        invoiceKind,
        invoiceNote: '',
        dueDate: '',
        prepaidAmount: '0.00',
        advancePayments: [],
        precedingInvoices: [{ number: original.documentNumber, date: original.documentDate }],
      })
    }
    const amounts = calculateInvoice(data)
    if (amounts)
      Object.assign(data, {
        netAmount: amounts.net,
        taxAmount: amounts.tax,
        grossAmount: amounts.gross,
      })
    const id = randomUUID()
    await client.query(
      `INSERT INTO customer_auth.documents(id,organization_id,uploaded_by,original_name,status,reviewed_data,workflow,source_kind,processing_stage)
      VALUES($1,$2,$3,$4,'needs_review',$5,'outgoing','manual','complete')`,
      [id, context.organizationId, context.userId, data.documentNumber, data],
    )
    // Imported drafts may already use this prefix. Skip reserved numbers, including
    // deleted drafts, instead of making the whole sequence unusable after a collision.
    while (true) {
      const reserved = await client.query(
        'INSERT INTO customer_auth.invoice_numbers(organization_id,number,document_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING number',
        [context.organizationId, data.documentNumber, id],
      )
      if (reserved.rowCount) break
      const next = await client.query(
        'UPDATE customer_auth.invoice_sequences SET next_value=next_value+1 WHERE organization_id=$1 AND year=$2 RETURNING next_value-1 AS value',
        [context.organizationId, year],
      )
      data.documentNumber = `TF-${year}-${String(next.rows[0].value).padStart(6, '0')}`
    }
    await client.query(
      'UPDATE customer_auth.documents SET original_name=$2,reviewed_data=$3 WHERE id=$1',
      [id, data.documentNumber, data],
    )
    await client.query(
      'INSERT INTO customer_auth.invoice_draft_requests(organization_id,request_key,fingerprint,document_id) VALUES($1,$2,$3,$4)',
      [context.organizationId, value.requestKey, fingerprint, id],
    )
    await event(client, context, id, 'draft_created')
    return { id }
  })
}

export async function updateInvoiceWorkflow(context: DocumentContext, id: string, input: unknown) {
  const parsed = z
    .object({
      organizationId: z.string(),
      action: z.enum(['incoming', 'outgoing', 'sent', 'paid', 'received_reviewed']),
    })
    .strict()
    .safeParse(input)
  if (!parsed.success || parsed.data.organizationId !== context.organizationId)
    throw new DocumentError('invalidRequest')
  return invoiceTransaction(context, async (client, role) => {
    if (!hasPermission(role,'approve'))
      throw new DocumentError('forbidden', 403)
    const result = await client.query(
      'SELECT * FROM customer_auth.documents WHERE id=$1 AND organization_id=$2 FOR UPDATE',
      [id, context.organizationId],
    )
    const doc = result.rows[0]
    if (!doc) throw new DocumentError('notFound', 404)
    const action = parsed.data.action
    if (action === 'incoming' || action === 'outgoing') {
      if (doc.workflow !== 'unclassified' || doc.export_state === 'generating')
        throw new DocumentError('invalidState', 409)
      await client.query(
        'UPDATE customer_auth.documents SET workflow=$2,updated_at=now() WHERE id=$1',
        [id, action],
      )
      if (action === 'outgoing' && doc.status === 'approved') {
        const number = String(doc.reviewed_data?.documentNumber || '')
        const reserved = await client.query(
          'INSERT INTO customer_auth.invoice_numbers(organization_id,number,document_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING number',
          [context.organizationId, number, id],
        )
        if (!number || !reserved.rowCount) throw new DocumentError('numberTaken', 409)
        await client.query(
          "UPDATE customer_auth.documents SET invoice_state='issued',issued_at=now() WHERE id=$1 AND EXISTS(SELECT 1 FROM customer_auth.document_exports WHERE document_id=$1 AND revision=$2)",
          [id, doc.revision],
        )
      }
    } else if (action === 'received_reviewed') {
      if (doc.input_validation && !doc.input_validation.valid)
        throw new DocumentError('inputInvoiceInvalid', 409)
      if (
        doc.workflow !== 'incoming' ||
        !doc.scanned_at ||
        !['needs_review', 'approved', 'unsupported'].includes(doc.status)
      )
        throw new DocumentError('invalidState', 409)
      await client.query(
        "UPDATE customer_auth.documents SET status='approved',approved_by=$2,approved_at=now(),updated_at=now() WHERE id=$1",
        [id, context.userId],
      )
    } else {
      if (
        doc.workflow !== 'outgoing' ||
        !['issued', 'sent'].includes(doc.invoice_state) ||
        (action === 'sent' && doc.invoice_state !== 'issued')
      )
        throw new DocumentError('invalidState', 409)
      await client.query(
        `UPDATE customer_auth.documents SET invoice_state=$2,${action === 'sent' ? 'sent_at' : 'paid_at'}=now(),updated_at=now() WHERE id=$1`,
        [id, action],
      )
    }
    await event(client, context, id, 'invoice_' + action)
    return { ok: true }
  })
}
