import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { invoiceFixture } from './fixtures'
import { mailbox, senderSchema, composeInvoiceEmail } from '../../src/lib/invoice-email/schema'
import { localEmailEnabled } from '../../src/lib/invoice-email/provider'

test('mail input rejects headers, multiple recipients, and remote local-mode configurations', () => {
  for (const address of [
    'a@example.test\r\nBcc: b@example.test',
    'a@example.test,b@example.test',
    'A <a@example.test>',
  ])
    assert.equal(mailbox.safeParse(address).success, false)
  assert.equal(
    senderSchema.safeParse({
      organizationId: 'a',
      sender: 'a@example.test',
      senderName: 'A\nB',
      revision: 0,
    }).success,
    false,
  )
  assert.equal(
    composeInvoiceEmail('en', '123\r\nBCC: test', 'Example', 'Hello').subject.includes('\n'),
    false,
  )
  const mode = process.env.INVOICE_EMAIL_MODE,
    url = process.env.BETTER_AUTH_URL
  try {
    process.env.INVOICE_EMAIL_MODE = 'mailpit'
    process.env.BETTER_AUTH_URL = 'https://taxful.de'
    assert.equal(localEmailEnabled(), false)
    process.env.BETTER_AUTH_URL = 'http://localhost:3100'
    assert.equal(localEmailEnabled(), true)
    process.env.INVOICE_EMAIL_MODE = 'ses'
    assert.equal(localEmailEnabled(), false)
  } finally {
    if (mode === undefined) delete process.env.INVOICE_EMAIL_MODE
    else process.env.INVOICE_EMAIL_MODE = mode
    if (url === undefined) delete process.env.BETTER_AUTH_URL
    else process.env.BETTER_AUTH_URL = url
  }
})

test(
  'invoice email isolation, sender security, idempotency, integrity, worker failures and Mailpit delivery',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    process.env.INVOICE_EMAIL_MODE = 'mailpit'
    process.env.BETTER_AUTH_URL = 'http://localhost:3100'
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { saveEmailSettings, queueInvoiceEmail, emailHistory } =
      await import('../../src/lib/invoice-email/service')
    const { processInvoiceEmail } = await import('../../src/lib/invoice-email/worker')
    const { exportDocument } = await import('../../src/lib/documents/service')
    const { readPrivate, removePrivate, sha256 } = await import('../../src/lib/documents/storage')
    const org = randomUUID(),
      other = randomUUID(),
      owner = randomUUID(),
      member = randomUUID(),
      session = randomUUID()
    const context = { userId: owner, organizationId: org, role: 'owner' }
    const documents: string[] = [],
      exports: string[] = [],
      mailIds: string[] = []
    let sends = 0
    const fake = {
      send: async () => {
        sends++
        return { id: randomUUID() }
      },
    }
    async function makeInvoice(format: 'xrechnung' | 'zugferd' = 'xrechnung') {
      const id = randomUUID(),
        data = invoiceFixture()
      data.documentNumber = id
      await pool.query(
        `INSERT INTO customer_auth.documents(id,organization_id,uploaded_by,original_name,status,reviewed_data,workflow,source_kind,processing_stage)
      VALUES($1,$2,$3,'Synthetic invoice','approved',$4,'outgoing','manual','complete')`,
        [id, org, owner, data],
      )
      documents.push(id)
      const exported = await exportDocument(context, id, format)
      assert.equal(typeof exported, 'string', JSON.stringify(exported))
      exports.push(exported as string)
      return {
        organizationId: org,
        documentId: id,
        exportId: exported as string,
        requestKey: randomUUID(),
        recipient: owner + '@example.test',
        locale: 'en' as const,
        note: 'Synthetic test only',
        senderRevision: 1,
        acknowledgeRecipient: true as const,
        previousDeliveryId: null as string | null,
      }
    }
    try {
      for (const id of [owner, member])
        await pool.query(
          'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified") VALUES($1,\'Synthetic\',$2,true)',
          [id, id + '@example.test'],
        )
      for (const id of [org, other])
        await pool.query(
          'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,\'Synthetic email\',$1,now())',
          [id],
        )
      await pool.query(
        "INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id) VALUES($1,'starter',now()+interval '1 day','Synthetic email fixture','test')",
        [org],
      )
      for (const [user, role] of [
        [owner, 'owner'],
        [member, 'member'],
      ])
        await pool.query(
          'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
          [randomUUID(), org, user, role],
        )
      await pool.query(
        'INSERT INTO customer_auth.customer_sessions(id,token,"userId","expiresAt","updatedAt") VALUES($1,$2,$3,now()+interval \'1 day\',now())',
        [session, randomUUID(), owner],
      )
      const settings = {
        organizationId: org,
        sender: 'accounts@example.test',
        senderName: 'Synthetic Company',
        revision: 0,
      }
      await assert.rejects(saveEmailSettings({ ...context, userId: member }, settings, session), {
        message: 'forbidden',
      })
      await assert.rejects(saveEmailSettings(context, settings, randomUUID()), {
        message: 'emailFreshRequired',
      })
      await pool.query(
        'UPDATE customer_auth.customer_sessions SET "createdAt"=now()-interval \'10 minutes\' WHERE id=$1',
        [session],
      )
      await assert.rejects(saveEmailSettings(context, settings, session), {
        message: 'emailFreshRequired',
      })
      await pool.query('UPDATE customer_auth.customer_sessions SET "createdAt"=now() WHERE id=$1', [
        session,
      ])
      assert.equal((await saveEmailSettings(context, settings, session)).revision, 1)
      await assert.rejects(saveEmailSettings(context, settings, session), { message: 'conflict' })
      const input = await makeInvoice()
      await assert.rejects(emailHistory({ ...context, organizationId: other }, input.documentId), {
        message: 'forbidden',
      })
      await assert.rejects(queueInvoiceEmail({ ...context, userId: member }, input), {
        message: 'forbidden',
      })
      await assert.rejects(queueInvoiceEmail(context, { ...input, organizationId: other }), {
        message: 'invalidRequest',
      })
      await assert.rejects(queueInvoiceEmail(context, { ...input, exportId: randomUUID() }), {
        message: 'emailExportRequired',
      })
      await pool.query("UPDATE customer_auth.documents SET invoice_state='draft' WHERE id=$1", [
        input.documentId,
      ])
      await assert.rejects(queueInvoiceEmail(context, input), { message: 'emailIssuedRequired' })
      await pool.query("UPDATE customer_auth.documents SET invoice_state='issued' WHERE id=$1", [
        input.documentId,
      ])
      const [first, retry] = await Promise.all([
        queueInvoiceEmail(context, input),
        queueInvoiceEmail(context, input),
      ])
      assert.equal(first.id, retry.id)
      await assert.rejects(queueInvoiceEmail(context, { ...input, note: 'changed' }), {
        message: 'conflict',
      })
      await assert.rejects(queueInvoiceEmail(context, { ...input, requestKey: randomUUID() }), {
        message: 'emailDuplicate',
      })
      await Promise.all([processInvoiceEmail(fake, org), processInvoiceEmail(fake, org)])
      assert.equal(sends, 1)
      assert.equal((await emailHistory(context, input.documentId)).deliveries[0].status, 'accepted')
      assert.equal(
        (
          await pool.query('SELECT invoice_state FROM customer_auth.documents WHERE id=$1', [
            input.documentId,
          ])
        ).rows[0].invoice_state,
        'sent',
      )
      const second = await queueInvoiceEmail(context, {
        ...input,
        requestKey: randomUUID(),
        previousDeliveryId: first.id,
      })
      await processInvoiceEmail(
        {
          send: async () => {
            throw new Error('ambiguous SMTP timeout')
          },
        },
        org,
      )
      assert.equal((await emailHistory(context, input.documentId)).deliveries[0].status, 'unknown')
      await processInvoiceEmail(fake, org)
      assert.equal(sends, 1)
      await queueInvoiceEmail(context, {
        ...input,
        requestKey: randomUUID(),
        previousDeliveryId: second.id,
      })
      await pool.query(
        'UPDATE customer_auth.organization_memberships SET role=\'member\' WHERE "userId"=$1',
        [owner],
      )
      await processInvoiceEmail(fake, org)
      assert.equal(sends, 1)
      assert.equal((await emailHistory(context, input.documentId)).deliveries[0].status, 'failed')
      await pool.query(
        'UPDATE customer_auth.organization_memberships SET role=\'owner\' WHERE "userId"=$1',
        [owner],
      )
      const last = (await emailHistory(context, input.documentId)).deliveries[0]
      const corrupt = await queueInvoiceEmail(context, {
        ...input,
        requestKey: randomUUID(),
        previousDeliveryId: last.id,
      })
      await pool.query('UPDATE customer_auth.document_exports SET sha256=$2 WHERE id=$1', [
        input.exportId,
        '0'.repeat(64),
      ])
      await processInvoiceEmail(fake, org)
      assert.equal(sends, 1)
      assert.equal((await emailHistory(context, input.documentId)).deliveries[0].id, corrupt.id)
      assert.equal((await emailHistory(context, input.documentId)).deliveries[0].status, 'failed')
      await pool.query('UPDATE customer_auth.document_exports SET sha256=$2 WHERE id=$1', [
        input.exportId,
        sha256(await readPrivate(input.exportId, 'export')),
      ])
      const crash = await queueInvoiceEmail(context, {
        ...input,
        requestKey: randomUUID(),
        previousDeliveryId: corrupt.id,
      })
      await pool.query(
        "UPDATE customer_auth.invoice_deliveries SET status='sending',updated_at=now()-interval '3 minutes' WHERE id=$1",
        [crash.id],
      )
      await processInvoiceEmail(fake, org)
      assert.equal((await emailHistory(context, input.documentId)).deliveries[0].status, 'unknown')
      // Real SMTP handoff, both official formats, using only synthetic companies.
      for (const format of ['xrechnung', 'zugferd'] as const) {
        const invoice = await makeInvoice(format)
        const queued = await queueInvoiceEmail(context, invoice)
        await pool.query("UPDATE customer_auth.documents SET invoice_state='paid' WHERE id=$1", [
          invoice.documentId,
        ])
        await processInvoiceEmail(undefined, org)
        const delivery = (await emailHistory(context, invoice.documentId)).deliveries[0]
        assert.equal(delivery.status, 'accepted')
        assert.equal(
          (
            await pool.query('SELECT invoice_state FROM customer_auth.documents WHERE id=$1', [
              invoice.documentId,
            ])
          ).rows[0].invoice_state,
          'paid',
        )
        const search = await fetch(
          'http://127.0.0.1:8026/api/v1/search?query=' +
            encodeURIComponent('to:' + invoice.recipient),
        )
        const listing = (await search.json()) as { messages: { ID: string; Subject: string }[] }
        const item = listing.messages.find((m) => m.Subject.includes(invoice.documentId))
        assert.ok(item)
        mailIds.push(item.ID)
        const mail = (await (
          await fetch('http://127.0.0.1:8026/api/v1/message/' + item.ID)
        ).json()) as {
          From: { Address: string }
          To: { Address: string }[]
          Attachments: { PartID: string }[]
          Text: string
          MessageID: string
        }
        assert.equal(mail.From.Address, settings.sender)
        assert.equal(mail.To[0].Address, invoice.recipient)
        assert.equal(mail.Attachments.length, 1)
        assert.ok(mail.Text.includes('Synthetic test only'))
        assert.ok(mail.MessageID.includes(queued.id))
        const attachment = Buffer.from(
          await (
            await fetch(
              `http://127.0.0.1:8026/api/v1/message/${item.ID}/part/${mail.Attachments[0].PartID}`,
            )
          ).arrayBuffer(),
        )
        assert.equal(sha256(attachment), delivery.attachment_sha256)
      }
      const latest = (await emailHistory(context, input.documentId)).deliveries[0]
      const settingsChanged = await queueInvoiceEmail(context, {
        ...input,
        requestKey: randomUUID(),
        previousDeliveryId: latest.id,
      })
      await saveEmailSettings(
        context,
        { ...settings, sender: 'new@example.test', revision: 1 },
        session,
      )
      await processInvoiceEmail(fake, org)
      assert.equal(sends, 1)
      assert.equal((await emailHistory(context, input.documentId)).deliveries[0].status, 'failed')
      // Rate limits count attempts, not just successful sends.
      await pool.query(
        `INSERT INTO customer_auth.invoice_deliveries
        (id,organization_id,document_id,export_id,revision,attachment_sha256,request_key,fingerprint,sender,sender_name,recipient,subject,body,locale,mode,status,created_by)
        SELECT gen_random_uuid(),organization_id,document_id,export_id,revision,attachment_sha256,gen_random_uuid(),'rate-fixture',sender,sender_name,recipient,subject,body,locale,mode,'failed',created_by
        FROM customer_auth.invoice_deliveries CROSS JOIN generate_series(1,20) WHERE id=$1`,
        [settingsChanged.id],
      )
      // Keep the explicitly named prior delivery latest for the duplicate check.
      await pool.query(
        "UPDATE customer_auth.invoice_deliveries SET created_at=now()-interval '10 minutes' WHERE organization_id=$1 AND fingerprint='rate-fixture'",
        [org],
      )
      await assert.rejects(
        queueInvoiceEmail(context, {
          ...input,
          requestKey: randomUUID(),
          senderRevision: 2,
          previousDeliveryId: settingsChanged.id,
        }),
        { message: 'emailRateLimit' },
      )
    } finally {
      // Delete only this test's captured messages, never the shared inbox.
      for (const ID of mailIds)
        await fetch('http://127.0.0.1:8026/api/v1/messages', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ IDs: [ID] }),
        })
      await pool.query('DELETE FROM customer_auth.invoice_deliveries WHERE organization_id=$1', [
        org,
      ])
      await pool.query('DELETE FROM customer_auth.organizations WHERE id=ANY($1::text[])', [
        [org, other],
      ])
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=ANY($1::text[])', [
        [owner, member],
      ])
      for (const id of exports) await removePrivate(id, 'export')
      await pool.end()
    }
  },
)
