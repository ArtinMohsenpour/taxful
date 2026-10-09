import './security-test-env'
import test from 'node:test'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { passwordIsBreached } from '../../src/lib/security/password-screening'
import { securityClientIP } from '../../src/lib/security/rate-limit'
import { totp, seal, unseal } from '../../src/lib/staff-auth/crypto'
import { cookieValue } from '../../src/lib/staff-auth/strategy'
import { config } from 'dotenv'
import { verifiedCustomerSession } from './security-fixtures'

test('breach screening checks local sorted corpus and only sends a five-character hash prefix', async () => {
  const password = 'Synthetic breached password only',
    hash = createHash('sha1').update(password).digest('hex').toUpperCase()
  const dir = await mkdtemp(join(tmpdir(), 'screening-'))
  try {
    const path = join(dir, 'corpus')
    await writeFile(path, [hash, '0'.repeat(40), 'F'.repeat(40)].sort().join('\n') + '\n')
    assert.equal(await passwordIsBreached(password, { mode: 'local', path }), true)
    assert.equal(
      await passwordIsBreached('Different synthetic password', { mode: 'local', path }),
      false,
    )
    const fetcher: typeof fetch = async (url, options) => {
      assert.equal(url, `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`)
      assert.equal(options?.body, undefined)
      assert.equal(new Headers(options?.headers).get('Add-Padding'), 'true')
      assert.equal(options?.redirect, 'error')
      return new Response(`${hash.slice(5)}:3\r\n${'0'.repeat(35)}:0`)
    }
    assert.equal(await passwordIsBreached(password, { mode: 'hibp', fetcher }), true)
    assert.equal(
      await passwordIsBreached(password, {
        mode: 'hibp',
        fetcher: async () => new Response(`${hash.slice(5)}:0`),
      }),
      false,
    )
    for (const response of [
      new Response('bad'),
      new Response('x'.repeat(270000)),
      new Response('', { status: 503 }),
    ])
      await assert.rejects(
        passwordIsBreached(password, { mode: 'hibp', fetcher: async () => response }),
      )
    await writeFile(path, 'malformed')
    await assert.rejects(passwordIsBreached(password, { mode: 'local', path }))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
test('trusted ingress is explicit and IPv6 addresses share a /64 budget', () => {
  const env = {
    BETTER_AUTH_URL: 'https://example.test',
    SECURITY_PROXY_CONTRACT: 'overwrite-single-ip',
  }
  assert.throws(() => securityClientIP(new Headers(), { BETTER_AUTH_URL: 'https://example.test' }))
  for (const ip of ['', '1.2.3.4, 5.6.7.8', 'forged'])
    assert.equal(securityClientIP(new Headers({ 'x-forwarded-for': ip }), env), 'unattributed')
  assert.equal(securityClientIP(new Headers({ 'x-forwarded-for': '192.0.2.1' }), env), '192.0.2.1')
  assert.equal(
    securityClientIP(new Headers({ 'x-forwarded-for': '::ffff:192.0.2.1' }), env),
    '192.0.2.1',
  )
  assert.equal(
    securityClientIP(new Headers({ 'x-forwarded-for': '2001:db8::1' }), env),
    securityClientIP(new Headers({ 'x-forwarded-for': '2001:0db8:0:0::abcd' }), env),
  )
})
test('staff TOTP matches RFC 6238 and encrypted secrets are bound to their owner', () => {
  // RFC 6238 SHA-1 vector at 59 seconds, truncated to six digits.
  assert.equal(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1), '287082')
  const previous = process.env.PAYLOAD_SECRET
  process.env.PAYLOAD_SECRET = 'synthetic-test-encryption-secret'
  try {
    const sealed = seal('SYNTHETIC', 1)
    assert.equal(unseal(sealed, 1), 'SYNTHETIC')
    assert.throws(() => unseal(sealed, 2))
    const tampered = Buffer.from(sealed, 'base64')
    tampered[15] ^= 1
    assert.throws(() => unseal(tampered.toString('base64'), 1))
    assert.equal(
      cookieValue(
        new Headers({
          cookie: `taxful-staff-mfa=${'a'.repeat(64)}; taxful-staff-mfa=${'b'.repeat(64)}`,
        }),
      ),
      '',
    )
  } finally {
    if (previous === undefined) delete process.env.PAYLOAD_SECRET
    else process.env.PAYLOAD_SECRET = previous
  }
})
test(
  'atomic limits and live MFA authorization resist concurrent requests and stale session claims',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { consumeSecurityRate } = await import('../../src/lib/security/rate-limit')
    const { requireDocumentMfa } = await import('../../src/lib/customer-auth/required-mfa')
    const user = randomUUID(),
      other = randomUUID(),
      identity = randomUUID()
    try {
      const results = await Promise.all(
        Array.from({ length: 40 }, () => consumeSecurityRate(identity, 'synthetic-test', 10, 60)),
      )
      assert.equal(results.filter((r) => r.allowed).length, 10)
      assert.equal((await consumeSecurityRate(identity, 'separate-test', 1, 60)).allowed, true)
      for (const id of [user, other])
        await pool.query(
          'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified") VALUES($1,\'Synthetic\',$2,true)',
          [id, id + '@example.test'],
        )
      await assert.rejects(requireDocumentMfa(pool, { userId: user }), { message: 'mfaRequired' })
      const sessionId = await verifiedCustomerSession(pool, user)
      await requireDocumentMfa(pool, { userId: user, sessionId })
      await assert.rejects(requireDocumentMfa(pool, { userId: other, sessionId }), {
        message: 'mfaRequired',
      })
      await pool.query(
        'UPDATE customer_auth.customer_sessions SET "securityVerifiedAt"=NULL WHERE id=$1',
        [sessionId],
      )
      await assert.rejects(requireDocumentMfa(pool, { userId: user, sessionId }), {
        message: 'mfaRequired',
      })
      await pool.query(
        'UPDATE customer_auth.customer_sessions SET "securityVerifiedAt"=now(),"expiresAt"=now()-interval \'1 second\' WHERE id=$1',
        [sessionId],
      )
      await assert.rejects(requireDocumentMfa(pool, { userId: user, sessionId }), {
        message: 'mfaRequired',
      })
      await pool.query(
        'UPDATE customer_auth.customer_sessions SET "expiresAt"=now()+interval \'1 day\' WHERE id=$1',
        [sessionId],
      )
      await pool.query('UPDATE customer_auth.customer_users SET suspended=true WHERE id=$1', [user])
      await assert.rejects(requireDocumentMfa(pool, { userId: user, sessionId }), {
        message: 'mfaRequired',
      })
      await pool.query(
        'UPDATE customer_auth.customer_users SET suspended=false,"twoFactorEnabled"=false WHERE id=$1',
        [user],
      )
      await assert.rejects(requireDocumentMfa(pool, { userId: user, sessionId }), {
        message: 'mfaRequired',
      })
    } finally {
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=ANY($1)', [[user, other]])
      await pool.end()
    }
  },
)

test('corpus imports validate ordering and publish positive duplicates without replacing a valid file on error', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'corpus-import-'))
  try {
    const source = join(dir, 'source'),
      output = join(dir, 'output')
    const a = 'A'.repeat(40),
      b = 'B'.repeat(40)
    await writeFile(source, `${a}:0\n${a}:2\n${b}:4\n`)
    execFileSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/password-corpus.ts', source, output],
      { stdio: 'pipe' },
    )
    assert.equal(await readFile(output, 'utf8'), `${a}\n${b}\n`)
    await writeFile(source, `${b}:4\n${a}:2\n`)
    assert.throws(() =>
      execFileSync(
        process.execPath,
        ['--import', 'tsx', 'scripts/password-corpus.ts', source, output],
        { stdio: 'pipe' },
      ),
    )
    assert.equal(await readFile(output, 'utf8'), `${a}\n${b}\n`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
