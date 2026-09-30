import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { hasPermission } from '../customer-auth/permissions'
import type { DocumentContext } from '../documents/access'
import { DocumentError } from '../documents/config'
import { scanDocument } from '../documents/scan'
import { readPrivate, writePrivate, removePrivate, sha256 } from '../documents/storage'
import { invoiceTransaction } from '../invoices/service'
import { normalizeContent, contentHash } from './content'
import { templateSchema } from './schema'
import { requireLocalEmail } from './provider'

export async function emailTemplates(context: DocumentContext) {
  return invoiceTransaction(context, async (client, role) => ({
    canManage: hasPermission(role, 'settings'),
    templates: (
      await client.query(
        'SELECT locale,subject,body,html,logo_id AS "logoId",design,revision FROM customer_auth.invoice_email_templates WHERE organization_id=$1',
        [context.organizationId],
      )
    ).rows,
  }))
}
export async function logoBytes(context: DocumentContext, id: string) {
  return invoiceTransaction(context, async (client) => {
    const result = await client.query(
      'SELECT sha256 FROM customer_auth.invoice_email_logos WHERE id=$1 AND organization_id=$2',
      [id, context.organizationId],
    )
    if (!result.rowCount) throw new DocumentError('notFound', 404)
    const bytes = await readPrivate(id)
    if (sha256(bytes) !== result.rows[0].sha256)
      throw new DocumentError('emailAttachmentInvalid', 409)
    return bytes
  })
}
export async function previewEmailContent(context: DocumentContext, input: unknown) {
  let content
  try {
    content = normalizeContent(input)
  } catch {
    throw new DocumentError('invalidRequest')
  }
  await invoiceTransaction(context, async (_client, role) => {
    if (!hasPermission(role, 'approve')) throw new DocumentError('forbidden', 403)
  })
  const logo = content.logoId ? await logoBytes(context, content.logoId) : null
  if (!logo && content.html.includes('cid:company-logo'))
    throw new DocumentError('emailLogoRequired')
  return {
    content,
    hash: contentHash(content, logo ? sha256(logo) : null),
    previewHtml: logo
      ? content.html.replace(
          /(<img\b[^>]*\bsrc=")cid:company-logo(")/,
          (_match, start: string, end: string) =>
            `${start}data:image/png;base64,${logo.toString('base64')}${end}`,
        )
      : content.html,
  }
}
export async function saveEmailTemplate(context: DocumentContext, input: unknown) {
  requireLocalEmail()
  const parsed = templateSchema.safeParse(input)
  if (!parsed.success || parsed.data.organizationId !== context.organizationId)
    throw new DocumentError('invalidRequest')
  const value = parsed.data
  const content = normalizeContent(value.content)
  return invoiceTransaction(context, async (client, role) => {
    if (!hasPermission(role, 'settings')) throw new DocumentError('forbidden', 403)
    if (
      content.logoId &&
      !(
        await client.query(
          'SELECT 1 FROM customer_auth.invoice_email_logos WHERE id=$1 AND organization_id=$2',
          [content.logoId, context.organizationId],
        )
      ).rowCount
    )
      throw new DocumentError('notFound', 404)
    const result = await client.query(
      `INSERT INTO customer_auth.invoice_email_templates(organization_id,locale,subject,body,html,logo_id,design)
      SELECT $1,$2,$3,$4,$5,$6,$8 WHERE $7=0
      ON CONFLICT DO NOTHING RETURNING revision`,
      [
        context.organizationId,
        value.locale,
        content.subject,
        content.body,
        content.html,
        content.logoId,
        value.revision,
        content.design || null,
      ],
    )
    if (!result.rowCount && value.revision > 0) {
      const updated = await client.query(
        `UPDATE customer_auth.invoice_email_templates SET subject=$3,body=$4,html=$5,logo_id=$6,design=$8,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND locale=$2 AND revision=$7 RETURNING revision`,
        [
          context.organizationId,
          value.locale,
          content.subject,
          content.body,
          content.html,
          content.logoId,
          value.revision,
          content.design || null,
        ],
      )
      result.rows = updated.rows
    }
    if (!result.rows.length) throw new DocumentError('conflict', 409)
    await client.query(
      `INSERT INTO customer_auth.document_events(organization_id,actor_id,event,details) VALUES($1,$2,'invoice_email_template_changed',$3)`,
      [
        context.organizationId,
        context.userId,
        { locale: value.locale, revision: result.rows[0].revision },
      ],
    )
    return { revision: result.rows[0].revision, content }
  })
}
export async function uploadEmailLogo(context: DocumentContext, bytes: Buffer) {
  requireLocalEmail()
  return invoiceTransaction(context, async (client, role) => {
    if (!hasPermission(role, 'settings')) throw new DocumentError('forbidden', 403)
    await client.query("SELECT pg_advisory_xact_lock(hashtext('invoice-email-logo:'||$1))", [
      context.organizationId,
    ])
    const count = await client.query(
      'SELECT count(*)::int AS n FROM customer_auth.invoice_email_logos WHERE organization_id=$1',
      [context.organizationId],
    )
    if (count.rows[0].n >= 20) throw new DocumentError('emailLogoLimit', 429)
    if (
      bytes.length > 512000 ||
      !(
        bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      )
    )
      throw new DocumentError('emailLogoInvalid')
    await scanDocument(bytes)
    let png: Buffer
    try {
      const decoder = sharp(bytes, { limitInputPixels: 4000000, animated: false })
      const meta = await decoder.metadata()
      if (!['png', 'jpeg'].includes(meta.format || '') || (meta.pages || 1) > 1)
        throw new Error('format')
      png = await decoder
        .resize({ width: 600, height: 300, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer()
      if (png.length > 512000) throw new Error('size')
    } catch {
      throw new DocumentError('emailLogoInvalid')
    }
    const id = randomUUID()
    await writePrivate(id, png)
    try {
      await client.query(
        'INSERT INTO customer_auth.invoice_email_logos(id,organization_id,sha256) VALUES($1,$2,$3)',
        [id, context.organizationId, sha256(png)],
      )
    } catch (error) {
      await removePrivate(id)
      throw error
    }
    return { id }
  })
}
