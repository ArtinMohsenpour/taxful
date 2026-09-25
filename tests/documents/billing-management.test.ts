import { test } from 'node:test'
import assert from 'node:assert/strict'
import { grantExpiry } from '../../src/lib/billing/grants'

test('gift duration, period end and exact expiry are explicit and bounded', () => {
  const now = new Date('2026-09-25T12:00:00Z'),
    end = new Date('2026-10-24T12:00:00Z')
  assert.equal(grantExpiry({}, end, now).toISOString(), '2026-10-25T12:00:00.000Z')
  assert.equal(grantExpiry({ expiryMode: 'period' }, end, now).getTime(), end.getTime())
  assert.equal(
    grantExpiry({ expiryMode: 'date', expiresAt: '2026-10-02T10:00:00Z' }, end, now).toISOString(),
    '2026-10-02T10:00:00.000Z',
  )
  assert.throws(() => grantExpiry({ expiryMode: 'period' }, null, now), /invalidGrantExpiry/)
  assert.throws(
    () => grantExpiry({ expiryMode: 'date', expiresAt: '2026-01-01T00:00:00Z' }, end, now),
    /invalidGrantExpiry/,
  )
  assert.throws(
    () => grantExpiry({ expiryMode: 'date', expiresAt: '2028-01-01T00:00:00Z' }, end, now),
    /invalidGrantExpiry/,
  )
})
