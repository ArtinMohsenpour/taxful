import { randomUUID } from 'node:crypto'
import { hasPermission } from '../customer-auth/permissions'
import { type DocumentContext } from '../documents/access'
import { DocumentError } from '../documents/config'
import { recordSchema } from '../documents/schema'
import { readPrivate, sha256 } from '../documents/storage'
import { invoiceTransaction } from '../invoices/service'
import { composeInvoiceEmail, deliverySchema, senderSchema } from './schema'
import { localEmailEnabled, requireLocalEmail } from './provider'

export async function emailSettings(context: DocumentContext) {
  return invoiceTransaction(context, async (client, role) => {
    const result = await client.query(
      'SELECT sender,sender_name,revision FROM customer_auth.invoice_email_settings WHERE organization_id=$1',
      [context.organizationId],
    )
    return {
      enabled: localEmailEnabled(),
      canManage: hasPermission(role, 'settings'),
      settings: result.rows[0] || null,
    }
  })
}
export async function saveEmailSettings(
  context: DocumentContext,
  input: unknown,
  sessionId: string,
) {
  requireLocalEmail()
  const parsed = senderSchema.safeParse(input)
  if (!parsed.success || parsed.data.organizationId !== context.organizationId)
    throw new DocumentError('invalidRequest')
  const value = parsed.data
  return invoiceTransaction(context, async (client, role) => {
    if (!hasPermission(role, 'settings')) throw new DocumentError('forbidden', 403)
    // A current MFA proof is required when enrolled; otherwise a fresh login.
    const proof = await client.query(
      `SELECT 1 FROM customer_auth.customer_sessions s
      JOIN customer_auth.customer_users u ON u.id=s."userId"
      WHERE s.id=$1 AND s."userId"=$2 AND s."expiresAt">now() AND NOT u.suspended
      AND (CASE WHEN u."twoFactorEnabled" THEN s."securityVerifiedAt" ELSE s."createdAt" END)>now()-interval '5 minutes' FOR SHARE OF s,u`,
      [sessionId, context.userId],
    )
    if (!proof.rowCount) throw new DocumentError('emailFreshRequired', 403)
    await client.query("SELECT pg_advisory_xact_lock(hashtext('invoice-email:'||$1))", [
      context.organizationId,
    ])
    const result =
      value.revision === 0
        ? await client.query(
            `INSERT INTO customer_auth.invoice_email_settings(organization_id,sender,sender_name,mode)
          VALUES($1,$2,$3,'mailpit') ON CONFLICT DO NOTHING RETURNING revision`,
            [context.organizationId, value.sender, value.senderName],
          )
        : await client.query(
            `UPDATE customer_auth.invoice_email_settings SET sender=$2,sender_name=$3,revision=revision+1,updated_at=now()
          WHERE organization_id=$1 AND revision=$4 RETURNING revision`,
            [context.organizationId, value.sender, value.senderName, value.revision],
          )
    if (!result.rowCount) throw new DocumentError('conflict', 409)
    await client.query(
      `INSERT INTO customer_auth.document_events(organization_id,actor_id,event,details) VALUES($1,$2,'invoice_email_settings_changed',$3)`,
      [
        context.organizationId,
        context.userId,
        { revision: result.rows[0].revision, mode: 'mailpit' },
      ],
    )
    return { revision: result.rows[0].revision }
  })
}

export async function emailHistory(context: DocumentContext, documentId: string) {
  return invoiceTransaction(context, async (client) => {
    const doc = await client.query(
      'SELECT revision FROM customer_auth.documents WHERE id=$1 AND organization_id=$2',
      [documentId, context.organizationId],
    )
    if (!doc.rowCount) throw new DocumentError('notFound', 404)
    const exports = await client.query(
      `SELECT id,format,sha256,size_bytes FROM customer_auth.document_exports
      WHERE document_id=$1 AND revision=$2 AND validation_report->>'valid'='true'
      AND format IN ('xrechnung-ubl-3.0.2','zugferd-en16931') ORDER BY format DESC`,
      [documentId, doc.rows[0].revision],
    )
    const history = await client.query(
      `SELECT d.id,d.recipient,d.sender,d.sender_name,d.subject,d.body,d.locale,d.status,d.created_at,d.updated_at,
      d.attachment_sha256,d.revision,d.provider_id,d.error_code,
      (SELECT json_agg(json_build_object('status',e.status,'at',e.created_at) ORDER BY e.id) FROM customer_auth.invoice_delivery_events e WHERE e.delivery_id=d.id) AS events
      FROM customer_auth.invoice_deliveries d WHERE d.organization_id=$1 AND d.document_id=$2 ORDER BY d.created_at DESC,d.id DESC LIMIT 50`,
      [context.organizationId, documentId],
    )
    return { exports: exports.rows, deliveries: history.rows }
  })
}

export async function queueInvoiceEmail(context: DocumentContext, input: unknown) {
  requireLocalEmail()
  const parsed = deliverySchema.safeParse(input)
  if (!parsed.success || parsed.data.organizationId !== context.organizationId)
    throw new DocumentError('invalidRequest')
  const value = parsed.data,
    fingerprint = sha256(JSON.stringify(value))
  return invoiceTransaction(context, async (client, role) => {
    if (!hasPermission(role, 'approve')) throw new DocumentError('forbidden', 403)
    await client.query("SELECT pg_advisory_xact_lock(hashtext('invoice-email:'||$1))", [
      context.organizationId,
    ])
    const existing = await client.query(
      'SELECT id,fingerprint FROM customer_auth.invoice_deliveries WHERE organization_id=$1 AND request_key=$2',
      [context.organizationId, value.requestKey],
    )
    if (existing.rowCount) {
      if (existing.rows[0].fingerprint !== fingerprint) throw new DocumentError('conflict', 409)
      return { id: existing.rows[0].id as string }
    }
    const doc = await client.query(
      `SELECT revision,reviewed_data FROM customer_auth.documents WHERE id=$1 AND organization_id=$2
      AND workflow='outgoing' AND status='approved' AND invoice_state IN ('issued','sent','paid') FOR SHARE`,
      [value.documentId, context.organizationId],
    )
    if (!doc.rowCount) throw new DocumentError('emailIssuedRequired', 409)
    const exported = await client.query(
      `SELECT id,sha256,size_bytes FROM customer_auth.document_exports WHERE id=$1 AND document_id=$2 AND revision=$3
      AND validation_report->>'valid'='true' AND format IN ('xrechnung-ubl-3.0.2','zugferd-en16931')`,
      [value.exportId, value.documentId, doc.rows[0].revision],
    )
    if (!exported.rowCount) throw new DocumentError('emailExportRequired', 409)
    const bytes = await readPrivate(value.exportId, 'export')
    if (
      bytes.length > 10 * 1024 * 1024 ||
      BigInt(bytes.length) !== BigInt(exported.rows[0].size_bytes) ||
      sha256(bytes) !== exported.rows[0].sha256
    )
      throw new DocumentError('emailAttachmentInvalid', 409)
    const sender = await client.query(
      "SELECT * FROM customer_auth.invoice_email_settings WHERE organization_id=$1 AND mode='mailpit' AND revision=$2 FOR SHARE",
      [context.organizationId, value.senderRevision],
    )
    if (!sender.rowCount) throw new DocumentError('emailSenderRequired', 409)
    const previous = await client.query(
      'SELECT id,status FROM customer_auth.invoice_deliveries WHERE organization_id=$1 AND document_id=$2 ORDER BY created_at DESC,id DESC LIMIT 1',
      [context.organizationId, value.documentId],
    )
    if ((previous.rows[0]?.id || null) !== value.previousDeliveryId)
      throw new DocumentError('emailDuplicate', 409)
    if (previous.rows[0] && ['queued', 'sending'].includes(previous.rows[0].status))
      throw new DocumentError('emailDuplicate', 409)
    const rate = await client.query(
      `SELECT count(*)::int AS day,count(*) FILTER(WHERE created_at>now()-interval '1 hour')::int AS hour
      FROM customer_auth.invoice_deliveries WHERE organization_id=$1 AND created_at>now()-interval '24 hours'`,
      [context.organizationId],
    )
    if (rate.rows[0].day >= 100 || rate.rows[0].hour >= 20)
      throw new DocumentError('emailRateLimit', 429)
    const data = recordSchema.parse(doc.rows[0].reviewed_data)
    const message = composeInvoiceEmail(
      value.locale,
      data.documentNumber,
      sender.rows[0].sender_name,
      value.note,
    )
    const id = randomUUID()
    await client.query(
      `INSERT INTO customer_auth.invoice_deliveries
      (id,organization_id,document_id,export_id,revision,attachment_sha256,request_key,fingerprint,sender,sender_name,recipient,subject,body,locale,mode,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'mailpit',$15)`,
      [
        id,
        context.organizationId,
        value.documentId,
        value.exportId,
        doc.rows[0].revision,
        exported.rows[0].sha256,
        value.requestKey,
        fingerprint,
        sender.rows[0].sender,
        sender.rows[0].sender_name,
        value.recipient,
        message.subject,
        message.body,
        value.locale,
        context.userId,
      ],
    )
    await client.query(
      "INSERT INTO customer_auth.invoice_delivery_events(delivery_id,status) VALUES($1,'queued')",
      [id],
    )
    return { id }
  })
}
