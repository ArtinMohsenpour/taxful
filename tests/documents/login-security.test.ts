import { config } from 'dotenv'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import assert from 'node:assert/strict'

config({ path: ['.env.local', '.env'] })

test('login failures are serialized, privacy-preserving, locked and clearable', async () => {
  const { customerPool } = await import('../../src/lib/customer-auth/database')
  const { clearLoginFailures, loginAllowed, loginIdentity, recordLoginFailure } =
    await import('../../src/lib/customer-auth/login-protection')
  const email = `${randomUUID()}@example.test`
  const identity = loginIdentity(email)
  assert.ok(identity)
  assert.equal(identity.length, 64)
  assert.equal(identity.includes(email), false)
  try {
    await Promise.all(Array.from({ length: 5 }, () => recordLoginFailure(identity)))
    const state = await loginAllowed(identity)
    assert.equal(state.allowed, false)
    if (!state.allowed) assert.ok(state.retryAfter > 0 && state.retryAfter <= 300)
    const stored = await customerPool.query<{ failure_count: number }>(
      'SELECT failure_count FROM customer_auth.login_attempts WHERE identity_hash=$1',
      [identity],
    )
    assert.equal(stored.rows[0].failure_count, 5)
    await clearLoginFailures(identity)
    assert.deepEqual(await loginAllowed(identity), { allowed: true })
  } finally {
    await clearLoginFailures(identity)
    await customerPool.end()
  }
})
