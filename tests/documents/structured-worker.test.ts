import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { config } from 'dotenv'
import { invoiceFixture } from './fixtures'
import { generateXRechnung } from '../../src/lib/documents/xrechnung'
import { generateZugferd } from '../../src/lib/documents/zugferd'
import { writePrivate, removePrivate, sha256 } from '../../src/lib/documents/storage'

test(
  'worker imports XML and embedded XML with AI disabled and retains invalid source reports',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { getDocument, downloadDocument } = await import('../../src/lib/documents/service')
    const { updateInvoiceWorkflow } = await import('../../src/lib/invoices/service')
    const org = randomUUID(),
      user = randomUUID(),
      batch = randomUUID(),
      ids: string[] = []
    const context = { organizationId: org, userId: user, role: 'owner' }
    try {
      await pool.query(
        'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [user, 'Synthetic Import', user + '@example.test'],
      )
      await pool.query(
        'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
        [org, 'Synthetic Import'],
      )
      await pool.query(
        'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
        [randomUUID(), org, user, 'owner'],
      )
      await pool.query(
        'INSERT INTO customer_auth.document_batches(id,organization_id,request_key,fingerprint) VALUES($1,$2,$3,$4)',
        [batch, org, randomUUID(), 'synthetic-import'],
      )
      const xml = generateXRechnung(invoiceFixture())
      const fixtures = [
        { bytes: Buffer.from(xml), mime: 'application/xml', valid: true, method: 'structured_xml' },
        {
          bytes: (await generateZugferd(invoiceFixture())).bytes,
          mime: 'application/pdf',
          valid: true,
          method: 'embedded_xml',
        },
        {
          bytes: Buffer.from(
            xml.replace(
              '<cbc:TaxInclusiveAmount currencyID="EUR">119.00',
              '<cbc:TaxInclusiveAmount currencyID="EUR">120.00',
            ),
          ),
          mime: 'application/xml',
          valid: false,
          method: 'structured_xml',
        },
      ]
      for (const fixture of fixtures) {
        const id = randomUUID(),
          lease = randomUUID()
        ids.push(id)
        await writePrivate(id, fixture.bytes)
        await pool.query(
          `INSERT INTO customer_auth.documents(id,organization_id,batch_id,uploaded_by,original_name,mime_type,size_bytes,source_sha256,status,lease_token,started_at,workflow)
     VALUES($1,$2,$3,$4,'Synthetic incoming invoice',$5,$6,$7,'processing',$8,now(),'incoming')`,
          [id, org, batch, user, fixture.mime, fixture.bytes.length, sha256(fixture.bytes), lease],
        )
        const exit = await new Promise<number | null>((resolve, reject) => {
          const child = spawn(
            process.execPath,
            ['--import', 'tsx', 'scripts/document-job.ts', id, lease],
            {
              env: { ...process.env, DOCUMENT_AI_ENABLED: 'false', GEMINI_API_KEY: '' },
              stdio: 'ignore',
            },
          )
          const timer = setTimeout(() => {
            child.kill('SIGKILL')
            reject(new Error('job timeout'))
          }, 120000)
          child.on('error', reject)
          child.on('exit', (code) => {
            clearTimeout(timer)
            resolve(code)
          })
        })
        const document = await getDocument(context, id)
        assert.equal(exit, 0, document.error_code)
        assert.equal(document.status, 'needs_review')
        assert.equal(document.model, 'structured-local')
        assert.equal(document.extraction_method, fixture.method)
        assert.equal(document.input_validation.valid, fixture.valid)
        assert.equal(document.extracted_data.documentNumber, 'TEST-2026-001')
        const source = await downloadDocument(context, id, 'source')
        assert.equal(sha256(source.bytes), sha256(fixture.bytes))
        if (!fixture.valid)
          await assert.rejects(
            updateInvoiceWorkflow(context, id, {
              organizationId: org,
              action: 'received_reviewed',
            }),
            { message: 'inputInvoiceInvalid' },
          )
        else
          await updateInvoiceWorkflow(context, id, {
            organizationId: org,
            action: 'received_reviewed',
          })
      }
    } finally {
      await pool.query('DELETE FROM customer_auth.organizations WHERE id=$1', [org])
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
      for (const id of ids) await removePrivate(id)
      await pool.end()
    }
  },
)
