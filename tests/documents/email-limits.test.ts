import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'

test(
  'recipient email budgets are atomic, purpose-separated, bounded and recover after expiry',
  {
    skip: process.env.DOCUMENT_INTEGRATION !== 'true',
  },
  async () => {
    config({ path: ['.env.local', '.env'] })
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { emailLimitKey, reserveCustomerEmail } =
      await import('../../src/lib/customer-auth/email-limits')
    const email = `${randomUUID()}@example.test`
    const key = emailLimitKey(email, 'verify')
    assert.equal(key, emailLimitKey(' ' + email.toUpperCase() + ' ', 'verify'))
    assert.equal(key.includes(email), false)
    assert.notEqual(key, emailLimitKey(email, 'reset'))
    try {
      const results = await Promise.all(
        Array.from({ length: 15 }, () => reserveCustomerEmail(email, 'verify')),
      )
      assert.equal(results.filter(Boolean).length, 5)
      assert.equal(await reserveCustomerEmail(email, 'reset'), true)
      await pool.query(
        "UPDATE customer_auth.email_delivery_limits SET hour_started_at=now()-interval '2 hours' WHERE recipient_key=$1",
        [key],
      )
      const next = await Promise.all(
        Array.from({ length: 10 }, () => reserveCustomerEmail(email, 'verify')),
      )
      assert.equal(next.filter(Boolean).length, 5)
      await pool.query(
        "UPDATE customer_auth.email_delivery_limits SET hour_started_at=now()-interval '2 hours' WHERE recipient_key=$1",
        [key],
      )
      assert.equal(
        await reserveCustomerEmail(email, 'verify'),
        false,
        'Daily limit survives hourly reset',
      )
      await pool.query(
        "UPDATE customer_auth.email_delivery_limits SET day_started_at=now()-interval '25 hours' WHERE recipient_key=$1",
        [key],
      )
      assert.equal(await reserveCustomerEmail(email, 'verify'), true)
      const stored = await pool.query(
        'SELECT day_count,hour_count FROM customer_auth.email_delivery_limits WHERE recipient_key=$1',
        [key],
      )
      assert.deepEqual(stored.rows[0], { day_count: 1, hour_count: 1 })
    } finally {
      await pool.query(
        'DELETE FROM customer_auth.email_delivery_limits WHERE recipient_key=ANY($1::text[])',
        [[key, emailLimitKey(email, 'reset')]],
      )
      await pool.end()
    }
  },
)
