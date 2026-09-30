import { customerPool } from '../customer-auth/database'
import { readPrivate, sha256 } from '../documents/storage'
import { mailpitProvider, requireLocalEmail, type InvoiceEmailProvider } from './provider'
import { contentHash } from './content'

export async function processInvoiceEmail(
  provider: InvoiceEmailProvider = mailpitProvider,
  organizationId: string | null = null,
) {
  requireLocalEmail()
  // A crashed worker may have handed the message to SMTP. Never retry that lease.
  await customerPool.query(
    `WITH expired AS (
    UPDATE customer_auth.invoice_deliveries SET status='unknown',error_code='emailUnknown',updated_at=now()
    WHERE status='sending' AND updated_at<now()-interval '2 minutes' AND ($1::text IS NULL OR organization_id=$1) RETURNING id)
    INSERT INTO customer_auth.invoice_delivery_events(delivery_id,status) SELECT id,'unknown' FROM expired`,
    [organizationId],
  )
  const claimed = await customerPool.query(
    `WITH claimed AS (UPDATE customer_auth.invoice_deliveries SET status='sending',updated_at=now()
    WHERE id=(SELECT id FROM customer_auth.invoice_deliveries WHERE status='queued' AND mode='mailpit' AND ($1::text IS NULL OR organization_id=$1) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *),
    evidence AS (INSERT INTO customer_auth.invoice_delivery_events(delivery_id,status) SELECT id,'sending' FROM claimed)
    SELECT * FROM claimed`,
    [organizationId],
  )
  const delivery = claimed.rows[0]
  if (!delivery) return false
  const client = await customerPool.connect()
  let attempted = false
  try {
    await client.query('BEGIN')
    // Retain these locks through handoff so a role/sender change cannot race it.
    const membership = await client.query(
      `SELECT 1 FROM customer_auth.organization_memberships m
      JOIN customer_auth.customer_users u ON u.id=m."userId"
      WHERE m."organizationId"=$1 AND m."userId"=$2 AND m.role IN ('owner','admin','reviewer')
      AND u."emailVerified" AND NOT u.suspended FOR SHARE OF m,u`,
      [delivery.organization_id, delivery.created_by],
    )
    await client.query("SELECT pg_advisory_xact_lock(hashtext('invoice-email:'||$1))", [
      delivery.organization_id,
    ])
    const sender = await client.query(
      `SELECT 1 FROM customer_auth.invoice_email_settings WHERE organization_id=$1
      AND sender=$2 AND sender_name=$3 AND mode='mailpit' FOR SHARE`,
      [delivery.organization_id, delivery.sender, delivery.sender_name],
    )
    if (!membership.rowCount || !sender.rowCount) throw new Error('authorizationChanged')
    const exported = await client.query(
      `SELECT e.size_bytes,e.format FROM customer_auth.document_exports e
      JOIN customer_auth.documents d ON d.id=e.document_id WHERE e.id=$1 AND d.id=$2 AND d.organization_id=$3
      AND d.workflow='outgoing' AND d.status='approved' AND d.invoice_state IN ('issued','sent','paid')
      AND d.revision=$4 AND e.revision=$4 AND e.sha256=$5 AND e.validation_report->>'valid'='true'
      AND e.format IN ('xrechnung-ubl-3.0.2','zugferd-en16931') FOR SHARE OF d,e`,
      [
        delivery.export_id,
        delivery.document_id,
        delivery.organization_id,
        delivery.revision,
        delivery.attachment_sha256,
      ],
    )
    if (!exported.rowCount) throw new Error('attachmentChanged')
    const bytes = await readPrivate(delivery.export_id, 'export')
    if (
      bytes.length > 10 * 1024 * 1024 ||
      BigInt(bytes.length) !== BigInt(exported.rows[0].size_bytes) ||
      sha256(bytes) !== delivery.attachment_sha256
    )
      throw new Error('attachmentChanged')
    const logo = delivery.logo_id ? await readPrivate(delivery.logo_id) : undefined
    if (logo && sha256(logo) !== delivery.logo_sha256) throw new Error('logoChanged')
    if (
      delivery.message_sha256 &&
      contentHash(
        {
          subject: delivery.subject,
          body: delivery.body,
          html: delivery.html,
          logoId: delivery.logo_id,
        },
        delivery.logo_sha256,
      ) !== delivery.message_sha256
    )
      throw new Error('messageChanged')
    attempted = true
    const result = await provider.send({
      id: delivery.id,
      sender: delivery.sender,
      senderName: delivery.sender_name,
      recipient: delivery.recipient,
      subject: delivery.subject,
      body: delivery.body,
      html: delivery.html,
      logo,
      bytes,
      pdf: exported.rows[0].format === 'zugferd-en16931',
    })
    await client.query(
      "UPDATE customer_auth.invoice_deliveries SET status='accepted',provider_id=$2,updated_at=now() WHERE id=$1",
      [delivery.id, result.id],
    )
    await client.query(
      "INSERT INTO customer_auth.invoice_delivery_events(delivery_id,status) VALUES($1,'accepted')",
      [delivery.id],
    )
    await client.query(
      `UPDATE customer_auth.documents SET invoice_state=CASE WHEN invoice_state='issued' THEN 'sent' ELSE invoice_state END,
      sent_at=COALESCE(sent_at,now()) WHERE id=$1 AND organization_id=$2`,
      [delivery.document_id, delivery.organization_id],
    )
    await client.query('COMMIT')
  } catch {
    await client.query('ROLLBACK')
    // Even database acknowledgement failure after SMTP acceptance is uncertain.
    const status = attempted ? 'unknown' : 'failed'
    await client.query(
      `WITH changed AS (UPDATE customer_auth.invoice_deliveries SET status=$2,error_code=$3,updated_at=now()
      WHERE id=$1 AND status='sending' RETURNING id)
      INSERT INTO customer_auth.invoice_delivery_events(delivery_id,status) SELECT id,$2 FROM changed`,
      [delivery.id, status, attempted ? 'emailUnknown' : 'emailPreflightFailed'],
    )
  } finally {
    client.release()
  }
  return true
}
