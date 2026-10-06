import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { hashPassword } from 'better-auth/crypto'

test(
  'password changes require the current password and revoke other sessions even when opted out',
  {
    skip: process.env.DOCUMENT_INTEGRATION !== 'true',
  },
  async () => {
    config({ path: ['.env.local', '.env'] })
    assert.ok(
      ['localhost', '127.0.0.1'].includes(process.env.CUSTOMER_SMTP_HOST || ''),
      'Use local Mailpit only',
    )
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { auth } = await import('../../src/lib/customer-auth/auth')
    const user = randomUUID()
    const password = randomUUID() + '-Synthetic'
    const nextPassword = randomUUID() + '-Synthetic'
    const email = `${user}@example.test`
    const origin = new URL(process.env.BETTER_AUTH_URL!).origin
    const sessions: string[] = []
    const testIP = `127.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.1`
    async function request(path: string, body: object, cookie = '') {
      return auth.handler(
        new Request(`${origin}/api/customer-auth${path}`, {
          method: 'POST',
          headers: {
            origin,
            'content-type': 'application/json',
            cookie,
            'x-forwarded-for': testIP,
          },
          body: JSON.stringify(body),
        }),
      )
    }
    try {
      await pool.query(
        'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,$2,$3,true,$4,$5)',
        [user, 'Synthetic Security', email, 'Synthetic', 'Security'],
      )
      await pool.query(
        'INSERT INTO customer_auth.customer_accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,\'credential\',$2,$3,now())',
        [randomUUID(), user, await hashPassword(password)],
      )
      for (let index = 0; index < 2; index++) {
        const result = await request('/sign-in/email', { email, password })
        assert.equal(result.status, 200)
        sessions.push(
          result.headers
            .getSetCookie()
            .map((value) => value.split(';')[0])
            .filter(
              (value, index, all) =>
                !all.slice(index + 1).some((next) => next.split('=')[0] === value.split('=')[0]),
            )
            .join('; '),
        )
      }
      assert.equal(
        (
          await request(
            '/change-password',
            {
              currentPassword: 'incorrect',
              newPassword: nextPassword,
              revokeOtherSessions: false,
            },
            sessions[0],
          )
        ).status,
        400,
      )
      assert.equal(
        (
          await pool.query('SELECT id FROM customer_auth.customer_sessions WHERE "userId"=$1', [
            user,
          ])
        ).rowCount,
        2,
      )
      const changed = await request(
        '/change-password',
        {
          currentPassword: password,
          newPassword: nextPassword,
          revokeOtherSessions: false,
        },
        sessions[0],
      )
      assert.equal(changed.status, 200)
      for (const cookie of sessions) {
        const response = await auth.handler(
          new Request(`${origin}/api/customer-auth/get-session`, { headers: { cookie } }),
        )
        assert.equal(await response.json(), null)
      }
      assert.equal(
        (
          await pool.query('SELECT id FROM customer_auth.customer_sessions WHERE "userId"=$1', [
            user,
          ])
        ).rowCount,
        1,
      )
      assert.equal((await request('/sign-in/email', { email, password })).status, 401)
      assert.equal((await request('/sign-in/email', { email, password: nextPassword })).status, 200)
      const internal = (await auth.$context).internalAdapter
      const token = randomUUID()
      await internal.createVerificationValue({
        identifier: `reset-password:${token}`,
        value: user,
        expiresAt: new Date(Date.now() + 60_000),
      })
      const stored = await pool.query(
        'SELECT identifier FROM customer_auth.customer_verifications WHERE value=$1',
        [user],
      )
      assert.equal(stored.rows.length, 1)
      assert.equal(stored.rows[0].identifier.includes(token), false)
      const attempts = await Promise.all(
        Array.from({ length: 2 }, () =>
          request('/reset-password', { token, newPassword: password }),
        ),
      )
      assert.deepEqual(attempts.map((response) => response.status).sort(), [200, 400])
      assert.equal(
        (
          await pool.query('SELECT id FROM customer_auth.customer_sessions WHERE "userId"=$1', [
            user,
          ])
        ).rowCount,
        0,
      )
      assert.equal(
        (await request('/reset-password', { token, newPassword: nextPassword })).status,
        400,
      )
      const events = await pool.query(
        'SELECT event FROM customer_auth.security_events WHERE user_id=$1 ORDER BY id',
        [user],
      )
      assert.deepEqual(
        events.rows.map((row) => row.event),
        ['passwordChanged', 'passwordReset'],
      )
      const mail = await fetch(
        'http://127.0.0.1:8026/api/v1/search?query=' + encodeURIComponent('to:' + email),
      )
      assert.equal(mail.ok, true)
      const messages = (await mail.json()) as { messages: { ID: string; Subject: string }[] }
      assert.equal(messages.messages.length, 2)
      assert.ok(messages.messages.every((message) => message.Subject.includes('Passwort')))
      await fetch('http://127.0.0.1:8026/api/v1/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ IDs: messages.messages.map((message) => message.ID) }),
      })
    } finally {
      await pool.query('DELETE FROM customer_auth.customer_verifications WHERE value=$1', [user])
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=$1', [user])
      await pool.end()
    }
  },
)
