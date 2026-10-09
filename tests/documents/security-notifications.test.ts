import './security-test-env'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { customerPool as pool } from '../../src/lib/customer-auth/database'
import { deliverSecurityNotification } from '../../src/lib/customer-auth/security-notifications'
import { sendCustomerEmail } from '../../src/lib/customer-auth/email'

test(
  'notification intent is atomic, workers claim once, failed sends retry and abandoned leases terminate',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true', timeout: 20000 },
  async () => {
    const user = randomUUID(),
      email = user + '@example.test'
    await pool.query(
      'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified") VALUES($1,\'Synthetic\',$2,true)',
      [user, email],
    )
    const tx = await pool.connect()
    try {
      await tx.query('BEGIN')
      await tx.query(
        "INSERT INTO customer_auth.security_events(user_id,event) VALUES($1,'passwordChanged')",
        [user],
      )
      assert.equal(
        (
          await tx.query('SELECT 1 FROM customer_auth.security_notifications WHERE user_id=$1', [
            user,
          ])
        ).rowCount,
        1,
      )
      await tx.query('ROLLBACK')
      assert.equal(
        (
          await pool.query('SELECT 1 FROM customer_auth.security_notifications WHERE user_id=$1', [
            user,
          ])
        ).rowCount,
        0,
      )
      const event = (
        await pool.query(
          "INSERT INTO customer_auth.security_events(user_id,event) VALUES($1,'passwordChanged') RETURNING id::text",
          [user],
        )
      ).rows[0].id
      const state = async () =>
        (
          await pool.query('SELECT * FROM customer_auth.security_notifications WHERE event_id=$1', [
            event,
          ])
        ).rows[0]
      const ids: string[] = []
      await deliverSecurityNotification(
        async (to, _url, _kind, _locale, id) => {
          assert.equal(to, email)
          ids.push(id!)
          throw new Error('Synthetic SMTP outage')
        },
        false,
        event,
      )
      assert.equal((await state()).status, 'pending')
      assert.equal((await state()).attempts, 1)
      assert.equal(
        await deliverSecurityNotification(
          async () => {
            assert.fail('Backoff must defer delivery')
          },
          false,
          event,
        ),
        false,
      )
      await pool.query(
        'UPDATE customer_auth.security_notifications SET available_at=now() WHERE event_id=$1',
        [event],
      )
      let release!: () => void, started!: () => void
      const gate = new Promise<void>((r) => {
          release = r
        }),
        ready = new Promise<void>((r) => {
          started = r
        })
      const active = deliverSecurityNotification(
        async (to, _url, _kind, _locale, id) => {
          assert.equal(to, email)
          ids.push(id!)
          started()
          await gate
        },
        false,
        event,
      )
      await Promise.race([
        ready,
        active.then(() => {
          throw new Error('Delivery did not reach sender')
        }),
      ])
      try {
        assert.equal(
          await deliverSecurityNotification(
            async () => assert.fail('Duplicate worker send'),
            false,
            event,
          ),
          false,
        )
      } finally {
        release()
      }
      await active
      assert.equal((await state()).status, 'sent')
      assert.equal(ids[0], ids[1])
      await pool.query(
        "UPDATE customer_auth.security_notifications SET status='sending',attempts=8,lease_until=now()-interval '1 minute' WHERE event_id=$1",
        [event],
      )
      assert.equal(
        await deliverSecurityNotification(
          async () => assert.fail('Exhausted lease must not resend'),
          false,
          event,
        ),
        false,
      )
      assert.equal((await state()).status, 'failed')
      // A real SMTP delivery is limited to this synthetic recipient in local Mailpit.
      assert.ok(['localhost', '127.0.0.1'].includes(process.env.CUSTOMER_SMTP_HOST || ''))
      await pool.query(
        "UPDATE customer_auth.security_notifications SET status='pending',attempts=0,available_at=now() WHERE event_id=$1",
        [event],
      )
      await deliverSecurityNotification(sendCustomerEmail, false, event)
      assert.equal((await state()).status, 'sent')
      const previousToken = process.env.SECURITY_MONITOR_TOKEN
      const previousPath = process.env.PASSWORD_BLOCKLIST_PATH
      const previousMode = process.env.PASSWORD_SCREENING_MODE
      process.env.SECURITY_MONITOR_TOKEN = randomUUID()
      process.env.PASSWORD_SCREENING_MODE = 'local'
      process.env.PASSWORD_BLOCKLIST_PATH = '/nonexistent/synthetic-password-corpus'
      try {
        const { GET } = await import('../../src/app/api/security/health/route')
        assert.equal((await GET(new Request('http://localhost/api/security/health'))).status, 404)
        const health = await GET(
          new Request('http://localhost/api/security/health', {
            headers: { authorization: 'Bearer ' + process.env.SECURITY_MONITOR_TOKEN },
          }),
        )
        assert.equal(health.status, 503)
        const body = (await health.json()) as {
          healthy: boolean
          configuration: { screening: boolean }
        }
        assert.equal(body.configuration.screening, false)
        assert.equal(body.healthy, false)
        assert.ok(!JSON.stringify(body).includes(email))
      } finally {
        for (const [key, value] of Object.entries({
          SECURITY_MONITOR_TOKEN: previousToken,
          PASSWORD_BLOCKLIST_PATH: previousPath,
          PASSWORD_SCREENING_MODE: previousMode,
        })) {
          if (value === undefined) delete process.env[key]
          else process.env[key] = value
        }
      }
      const response = await fetch(
        'http://127.0.0.1:8026/api/v1/search?query=' + encodeURIComponent('to:' + email),
      )
      const mail = (await response.json()) as { messages: { ID: string }[] }
      assert.equal(mail.messages.length, 1)
      await fetch('http://127.0.0.1:8026/api/v1/messages', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ IDs: mail.messages.map((m) => m.ID) }),
      })
    } finally {
      await tx.query('ROLLBACK')
      tx.release()
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
      await pool.end()
      const { staffPool } = await import('../../src/lib/staff-auth/database')
      await staffPool.end()
    }
  },
)
