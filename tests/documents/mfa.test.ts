import { passwordCorpusFixture } from './security-fixtures'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { hashPassword, symmetricDecrypt } from 'better-auth/crypto'

test(
  'MFA enrollment, login isolation, replay protection, recovery, stale sessions and passkey policy',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true', timeout: 120_000 },
  async () => {
    config({ path: ['.env.local', '.env'] })
    assert.ok(
      ['localhost', '127.0.0.1'].includes(process.env.CUSTOMER_SMTP_HOST || ''),
      'Use local Mailpit only',
    )
    const cleanupCorpus = await passwordCorpusFixture()
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { auth } = await import('../../src/lib/customer-auth/auth')
    const { requireUserVerification } = await import('../../src/lib/customer-auth/mfa-security')
    const origin = new URL(process.env.BETTER_AUTH_URL!).origin
    const users = [randomUUID(), randomUUID()]
    const password = randomUUID() + '-Synthetic-Only'
    const ipPrefix = `127.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.`
    let requestIndex = 0
    const jars: Map<string, string>[] = []
    function jar() {
      const value = new Map<string, string>()
      jars.push(value)
      return value
    }
    async function request(
      cookies: Map<string, string>,
      path: string,
      data?: object,
      requestOrigin = origin,
    ) {
      const response = await auth.handler(
        new Request(`${origin}/api/customer-auth${path}`, {
          method: data ? 'POST' : 'GET',
          headers: {
            origin: requestOrigin,
            'content-type': 'application/json',
            cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
            'x-forwarded-for': `${ipPrefix}${++requestIndex}`,
          },
          body: data ? JSON.stringify(data) : undefined,
        }),
      )
      for (const cookie of response.headers.getSetCookie()) {
        const [pair] = cookie.split(';')
        const i = pair.indexOf('=')
        if (pair.slice(i + 1)) cookies.set(pair.slice(0, i), pair.slice(i + 1))
        else cookies.delete(pair.slice(0, i))
      }
      return { status: response.status, body: await response.json() }
    }
    async function login(cookies: Map<string, string>, user = users[0]) {
      return request(cookies, '/sign-in/email', { email: `${user}@example.test`, password })
    }
    async function resetBudget() {
      await pool.query('DELETE FROM customer_auth.mfa_attempts WHERE user_id=ANY($1)', [users])
    }
    try {
      for (const user of users) {
        await pool.query(
          'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,$2,$3,true,$4,$5)',
          [user, 'Synthetic MFA', `${user}@example.test`, 'Synthetic', 'MFA'],
        )
        await pool.query(
          'INSERT INTO customer_auth.customer_accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,\'credential\',$2,$3,now())',
          [randomUUID(), user, await hashPassword(password)],
        )
      }
      assert.throws(() => requireUserVerification(false))
      assert.throws(() => requireUserVerification(undefined))
      assert.doesNotThrow(() => requireUserVerification(true))
      const current = jar(),
        old = jar(),
        outsider = jar()
      assert.equal((await login(current)).status, 200)
      assert.equal((await login(old)).status, 200)
      assert.equal((await login(outsider, users[1])).status, 200)
      assert.equal((await request(current, '/passkey/generate-register-options')).status, 403)
      assert.equal(
        (await request(current, '/two-factor/enable', { password: 'incorrect' })).status,
        400,
      )
      const setup = await request(current, '/two-factor/enable', { password })
      assert.equal(setup.status, 200)
      assert.equal(setup.body.method, 'totp')
      assert.equal(setup.body.backupCodes.length, 10)
      const secret = new URL(setup.body.totpURI).searchParams.get('secret')!
      const stored = await pool.query(
        'SELECT secret,"backupCodes",verified FROM customer_auth.customer_two_factors WHERE "userId"=$1',
        [users[0]],
      )
      assert.notEqual(stored.rows[0].secret, secret)
      assert.ok(!stored.rows[0].backupCodes.includes(setup.body.backupCodes[0]))
      assert.equal(stored.rows[0].verified, false)
      assert.equal((await request(current, '/two-factor/get-totp-uri', { password })).status, 403)
      assert.equal(
        (await request(current, '/two-factor/verify-totp', { code: '000000', trustDevice: true }))
          .status,
        403,
      )
      const rawSecret = await symmetricDecrypt({
        key: process.env.BETTER_AUTH_SECRET!,
        data: stored.rows[0].secret,
      })
      const code = (await auth.api.generateTOTP({ body: { secret: rawSecret } })).code
      const activation = await request(current, '/two-factor/verify-totp', { code })
      assert.equal(activation.status, 200, activation.body.code || activation.body.message)
      assert.equal(
        (await request(old, '/get-session')).body,
        null,
        'Enrollment must invalidate older sessions',
      )
      const session = (await request(current, '/get-session')).body
      assert.equal(session.user.twoFactorEnabled, true)
      const proof = await pool.query(
        'SELECT "securityVerifiedAt" FROM customer_auth.customer_sessions WHERE id=$1',
        [session.session.id],
      )
      assert.ok(proof.rows[0].securityVerifiedAt)
      for (const verified of [null, new Date(Date.now() - 6 * 60_000)]) {
        await pool.query(
          'UPDATE customer_auth.customer_sessions SET "securityVerifiedAt"=$2 WHERE id=$1',
          [session.session.id, verified],
        )
        const denied = await request(current, '/change-password', {
          currentPassword: password,
          newPassword: password + '-changed',
        })
        assert.equal(denied.status, 403)
        assert.equal(denied.body.code, 'SECURITY_VERIFICATION_REQUIRED')
      }
      await pool.query(
        'UPDATE customer_auth.customer_sessions SET "securityVerifiedAt"=now() WHERE id=$1',
        [session.session.id],
      )
      assert.equal(
        (
          await request(current, '/change-password', {
            currentPassword: 'incorrect',
            newPassword: password + '-changed',
          })
        ).status,
        400,
      )
      assert.equal(
        (await request(current, '/two-factor/verify-totp', { code })).status,
        401,
        'TOTP must not replay',
      )
      const options = await request(current, '/passkey/generate-register-options')
      assert.equal(options.status, 200)
      assert.equal(options.body.authenticatorSelection.userVerification, 'required')
      assert.equal(options.body.authenticatorSelection.residentKey, 'required')
      assert.equal(
        (await request(jar(), '/passkey/generate-authenticate-options')).body.userVerification,
        'required',
      )
      assert.equal(
        (await request(current, '/two-factor/disable', { password }, 'https://attacker.example'))
          .status,
        403,
      )
      const pending = jar()
      const challenge = await login(pending)
      assert.equal(challenge.body.twoFactorRedirect, true)
      assert.equal(
        (await request(pending, '/get-session')).body,
        null,
        'Password alone must not yield a session',
      )
      assert.notEqual((await request(pending, '/organization/list')).status, 200)
      assert.equal(
        (await request(pending, '/two-factor/verify-totp', { code: 'invalid' })).status,
        400,
      )
      assert.equal(
        (
          await request(outsider, '/two-factor/verify-backup-code', {
            code: setup.body.backupCodes[0],
          })
        ).status,
        400,
      )
      await resetBudget()
      const recovery = await request(pending, '/two-factor/verify-backup-code', {
        code: setup.body.backupCodes[0],
      })
      assert.equal(recovery.status, 200)
      assert.equal((await request(pending, '/get-session')).body.user.id, users[0])
      assert.equal(
        (
          await request(pending, '/two-factor/verify-backup-code', {
            code: setup.body.backupCodes[0],
          })
        ).status,
        401,
      )
      await pool.query(
        'UPDATE customer_auth.customer_sessions SET "securityVerifiedAt"=now()-interval \'10 minutes\' WHERE "userId"=$1',
        [users[0]],
      )
      assert.equal(
        (await request(pending, '/two-factor/generate-backup-codes', { password })).status,
        403,
      )
      assert.equal((await request(pending, '/passkey/generate-register-options')).status, 403)
      assert.equal(
        (
          await request(pending, '/two-factor/verify-backup-code', {
            code: setup.body.backupCodes[1],
          })
        ).status,
        200,
      )
      const replacement = await request(pending, '/two-factor/generate-backup-codes', { password })
      assert.equal(replacement.status, 200)
      assert.equal(
        (
          await request(pending, '/two-factor/verify-backup-code', {
            code: setup.body.backupCodes[2],
          })
        ).status,
        401,
      )
      await resetBudget()
      const race = await Promise.all(
        [1, 2].map(() =>
          request(pending, '/two-factor/verify-backup-code', {
            code: replacement.body.backupCodes[0],
          }),
        ),
      )
      assert.equal(
        race.filter((r) => r.status === 200).length,
        1,
        'Concurrent recovery code use must succeed exactly once',
      )
      await resetBudget()
      const suspendedChallenge = jar()
      assert.equal((await login(suspendedChallenge)).body.twoFactorRedirect, true)
      await pool.query('UPDATE customer_auth.customer_users SET suspended=true WHERE id=$1', [
        users[0],
      ])
      assert.equal(
        (
          await request(suspendedChallenge, '/two-factor/verify-backup-code', {
            code: replacement.body.backupCodes[1],
          })
        ).status,
        401,
        'Suspension must invalidate pending MFA access',
      )
      await pool.query('UPDATE customer_auth.customer_users SET suspended=false WHERE id=$1', [
        users[0],
      ])

      const resetChallenge = jar()
      assert.equal((await login(resetChallenge)).body.twoFactorRedirect, true)
      // Seed only this synthetic user's reset token; never read a real reset link.
      const resetToken = randomUUID()
      await pool.query(
        `INSERT INTO customer_auth.customer_verifications(id,identifier,value,"expiresAt","createdAt","updatedAt")
         VALUES($1,$2,$3,now()+interval '5 minutes',now(),now())`,
        [randomUUID(), `reset-password:${resetToken}`, users[0]],
      )
      assert.equal(
        (await request(jar(), '/reset-password', { token: resetToken, newPassword: password }))
          .status,
        200,
      )
      assert.equal(
        (
          await request(resetChallenge, '/two-factor/verify-backup-code', {
            code: replacement.body.backupCodes[1],
          })
        ).status,
        401,
        'Password reset must invalidate a pending MFA challenge',
      )
      assert.equal(
        (await request(pending, '/get-session')).body,
        null,
        'Password reset revokes sessions',
      )
      assert.equal(
        (await login(pending)).body.twoFactorRedirect,
        true,
        'Password reset must not remove MFA',
      )
      assert.equal(
        (
          await request(pending, '/two-factor/verify-backup-code', {
            code: replacement.body.backupCodes[1],
          })
        ).status,
        200,
      )
      assert.equal((await request(pending, '/two-factor/disable', { password })).status, 200)
      assert.equal((await request(current, '/get-session')).body, null)
      const audit = await pool.query(
        'SELECT event FROM customer_auth.security_events WHERE user_id=$1',
        [users[0]],
      )
      for (const event of ['mfaEnabled', 'recoveryUsed', 'recoveryRegenerated', 'mfaDisabled'])
        assert.ok(audit.rows.some((r) => r.event === event))
    } finally {
      await pool.query('DELETE FROM customer_auth.customer_verifications WHERE value=ANY($1)', [
        users,
      ])
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=ANY($1)', [users])
      await pool.end()
      await cleanupCorpus()
    }
  },
)
