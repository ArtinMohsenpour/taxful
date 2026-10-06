import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'

test(
  'signup conceals existing identities and enforces case-insensitive email uniqueness',
  {
    skip: process.env.DOCUMENT_INTEGRATION !== 'true',
  },
  async () => {
    config({ path: ['.env.local', '.env'] })
    assert.ok(['localhost', '127.0.0.1'].includes(process.env.CUSTOMER_SMTP_HOST || ''))
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { auth } = await import('../../src/lib/customer-auth/auth')
    const email = `${randomUUID()}@example.test`
    const password = randomUUID() + '-Synthetic'
    const origin = new URL(process.env.BETTER_AUTH_URL!).origin
    const ip = `127.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.2`
    const request = (path: string, body: object) =>
      auth.handler(
        new Request(`${origin}/api/customer-auth${path}`, {
          method: 'POST',
          headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': ip },
          body: JSON.stringify(body),
        }),
      )
    const body = {
      email,
      password,
      name: 'Deliberately different',
      firstName: 'Synthetic',
      lastName: 'Identity',
    }
    try {
      const created = await request('/sign-up/email', body)
      assert.equal(created.status, 200)
      const fresh = await created.json()
      const duplicate = await request('/sign-up/email', { ...body, email: email.toUpperCase() })
      assert.equal(duplicate.status, created.status)
      const existing = await duplicate.json()
      assert.equal(fresh.token, null)
      assert.equal(existing.token, null)
      assert.notEqual(existing.user.id, fresh.user.id)
      const comparable = (result: typeof fresh) => {
        const { id: _id, createdAt: _created, updatedAt: _updated, ...fields } = result.user
        return fields
      }
      assert.deepEqual(comparable(existing), comparable(fresh))
      assert.equal(
        (
          await pool.query('SELECT id FROM customer_auth.customer_users WHERE lower(email)=$1', [
            email,
          ])
        ).rowCount,
        1,
      )
      await assert.rejects(
        pool.query(
          'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,$2,$3,false,$4,$5)',
          [randomUUID(), 'Synthetic Identity', email.toUpperCase(), 'Synthetic', 'Identity'],
        ),
        (error: unknown) =>
          !!error && typeof error === 'object' && 'code' in error && error.code === '23505',
      )
      const known = await request('/sign-in/email', { email, password: 'incorrect-password' })
      const unknown = await request('/sign-in/email', {
        email: `${randomUUID()}@example.test`,
        password: 'incorrect-password',
      })
      assert.equal(known.status, 401)
      assert.equal(unknown.status, known.status)
      assert.deepEqual(await known.json(), await unknown.json())
    } finally {
      await pool.query('DELETE FROM customer_auth.customer_users WHERE lower(email)=$1', [email])
      const response = await fetch(
        'http://127.0.0.1:8026/api/v1/search?query=' + encodeURIComponent('to:' + email),
      )
      const mail = (await response.json()) as { messages: { ID: string }[] }
      if (mail.messages.length)
        await fetch('http://127.0.0.1:8026/api/v1/messages', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ IDs: mail.messages.map((message) => message.ID) }),
        })
      await pool.end()
    }
  },
)
