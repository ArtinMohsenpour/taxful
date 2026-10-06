import { createHmac } from 'node:crypto'
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api'
import { customerPool } from './database'
import { sendCustomerEmail, notifyPasswordSecurity } from './email'

export const securityFreshSeconds = 5 * 60
const management = new Set([
  '/change-password',
  '/two-factor/enable',
  '/two-factor/disable',
  '/two-factor/generate-backup-codes',
  '/passkey/generate-register-options',
  '/passkey/verify-registration',
  '/passkey/delete-passkey',
  '/passkey/update-passkey',
])

export function requireUserVerification(verified: boolean | undefined) {
  if (verified !== true)
    throw new APIError('UNAUTHORIZED', {
      code: 'USER_VERIFICATION_REQUIRED',
      message: 'Device verification required.',
    })
}

export const beforeMfa = createAuthMiddleware(async (ctx) => {
  const path = ctx.path || ''
  if (
    path !== '/change-password' &&
    !path.startsWith('/two-factor/') &&
    !path.startsWith('/passkey/')
  )
    return
  // Secrets are shown once during enrollment. No alternate OTP or trusted-device bypass.
  if (
    ['/two-factor/get-totp-uri', '/two-factor/send-otp', '/two-factor/verify-otp'].includes(path) ||
    ctx.body?.trustDevice ||
    ctx.body?.disableSession ||
    ctx.body?.createSession ||
    (path === '/two-factor/enable' && ctx.body?.method && ctx.body.method !== 'totp')
  )
    throw new APIError('FORBIDDEN', { message: 'Unsupported authentication operation.' })
  const session = await getSessionFromCtx(ctx)
  if (management.has(path)) {
    if (!session?.user.emailVerified)
      throw new APIError('UNAUTHORIZED', { message: 'Sign in again.' })
    const {
      rows: [current],
    } = await customerPool.query<{
      verified: Date | null
      created: Date
      enabled: boolean
      suspended: boolean
    }>(
      `SELECT s."securityVerifiedAt" AS verified,s."createdAt" AS created,
        u."twoFactorEnabled" AS enabled,u.suspended FROM customer_auth.customer_sessions s
        JOIN customer_auth.customer_users u ON u.id=s."userId" WHERE s.id=$1 AND s."expiresAt">now()`,
      [session.session.id],
    )
    const proof = current?.enabled ? current.verified : current?.created
    if (
      !current ||
      current.suspended ||
      ((path !== '/change-password' || current.enabled) &&
        (!proof || Date.now() - proof.getTime() >= securityFreshSeconds * 1000))
    )
      throw new APIError('FORBIDDEN', {
        code: 'SECURITY_VERIFICATION_REQUIRED',
        message: 'Verify your identity again.',
      })
    if (path.startsWith('/passkey/') && !current.enabled)
      throw new APIError('FORBIDDEN', {
        code: 'MFA_REQUIRED',
        message: 'Set up your authenticator first.',
      })
    if (path === '/two-factor/disable') {
      const keys = await customerPool.query(
        'SELECT 1 FROM customer_auth.customer_passkeys WHERE "userId"=$1 LIMIT 1',
        [session.user.id],
      )
      if (keys.rowCount)
        throw new APIError('BAD_REQUEST', {
          code: 'REMOVE_PASSKEYS_FIRST',
          message: 'Remove passkeys first.',
        })
    }
    if (path === '/passkey/generate-register-options') {
      const keys = await customerPool.query(
        'SELECT count(*)::int AS count FROM customer_auth.customer_passkeys WHERE "userId"=$1',
        [session.user.id],
      )
      if (keys.rows[0].count >= 10)
        throw new APIError('BAD_REQUEST', { message: 'Passkey limit reached.' })
    }
    const name: unknown = ctx.body?.name ?? ctx.query?.name
    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100))
      throw new APIError('BAD_REQUEST', { message: 'Invalid passkey name.' })
  }
  if (!['/two-factor/verify-totp', '/two-factor/verify-backup-code'].includes(path)) return
  let userId = session?.user.id
  if (!userId) {
    const cookie = ctx.context.createAuthCookie('two_factor')
    const challenge = await ctx.getSignedCookie(cookie.name, ctx.context.secret)
    if (challenge) {
      const record = await ctx.context.internalAdapter.findVerificationValue(challenge)
      if (record && record.expiresAt > new Date()) userId = record.value
    }
  }
  if (!userId) throw new APIError('UNAUTHORIZED', { message: 'Sign in again.' })
  const {
    rows: [user],
  } = await customerPool.query(
    'SELECT suspended,"emailVerified","twoFactorEnabled" FROM customer_auth.customer_users WHERE id=$1',
    [userId],
  )
  if (!user || user.suspended || !user.emailVerified)
    throw new APIError('UNAUTHORIZED', { message: 'Account unavailable.' })
  if (
    session &&
    !user.twoFactorEnabled &&
    Date.now() - new Date(session.session.createdAt).getTime() >= securityFreshSeconds * 1000
  )
    throw new APIError('FORBIDDEN', {
      code: 'SECURITY_VERIFICATION_REQUIRED',
      message: 'Sign in again.',
    })
  const {
    rows: [budget],
  } = await customerPool.query(
    `INSERT INTO customer_auth.mfa_attempts(user_id) VALUES($1)
    ON CONFLICT(user_id) DO UPDATE SET
      attempts=CASE WHEN mfa_attempts.window_start<now()-interval '1 minute' THEN 1 ELSE mfa_attempts.attempts+1 END,
      window_start=CASE WHEN mfa_attempts.window_start<now()-interval '1 minute' THEN now() ELSE mfa_attempts.window_start END
    RETURNING attempts`,
    [userId],
  )
  if (budget.attempts > 5) throw new APIError('TOO_MANY_REQUESTS', { message: 'Try again later.' })
  if (path === '/two-factor/verify-totp') {
    if (typeof ctx.body?.code !== 'string' || !/^\d{6}$/.test(ctx.body.code))
      throw new APIError('BAD_REQUEST', { message: 'Invalid code.' })
    // Reserve before verification, atomically across processes. Never store the OTP itself.
    const digest = createHmac('sha256', ctx.context.secret)
      .update(`${userId}:${ctx.body.code}`)
      .digest('hex')
    await customerPool.query(
      'DELETE FROM customer_auth.used_totp_codes WHERE user_id=$1 AND expires_at<now()',
      [userId],
    )
    const claimed = await customerPool.query(
      `INSERT INTO customer_auth.used_totp_codes(user_id,digest,expires_at)
      VALUES($1,$2,now()+interval '2 minutes') ON CONFLICT DO NOTHING`,
      [userId, digest],
    )
    if (!claimed.rowCount)
      throw new APIError('UNAUTHORIZED', {
        code: 'CODE_ALREADY_USED',
        message: 'Wait for a new code.',
      })
  }
})

export const afterMfa = createAuthMiddleware(async (ctx) => {
  const result: unknown = ctx.context.returned
  if (
    !result ||
    typeof result !== 'object' ||
    result instanceof APIError ||
    'error' in result ||
    'code' in result
  )
    return
  const path = ctx.path || ''
  if (path === '/passkey/generate-authenticate-options')
    return ctx.json({ ...result, userVerification: 'required' })
  if (
    [
      '/two-factor/verify-totp',
      '/two-factor/verify-backup-code',
      '/passkey/verify-authentication',
    ].includes(path)
  ) {
    const session = ctx.context.newSession || ctx.context.session
    if (session) {
      await customerPool.query(
        'UPDATE customer_auth.customer_sessions SET "securityVerifiedAt"=now() WHERE id=$1',
        [session.session.id],
      )
      if (path === '/two-factor/verify-backup-code')
        await customerPool.query(
          "INSERT INTO customer_auth.security_events(user_id,event) VALUES($1,'recoveryUsed')",
          [session.user.id],
        )
    }
  }
  if (path === '/two-factor/generate-backup-codes' && ctx.context.session)
    await customerPool.query(
      "INSERT INTO customer_auth.security_events(user_id,event) VALUES($1,'recoveryRegenerated')",
      [ctx.context.session.user.id],
    )
  const session = ctx.context.newSession || ctx.context.session
  if (path === '/change-password' && session)
    await notifyPasswordSecurity(session.user.id, 'passwordChanged')
  const activated =
    path === '/two-factor/verify-totp' &&
    ctx.context.newSession &&
    ctx.context.session?.user.twoFactorEnabled === false
  if (
    session &&
    (activated ||
      [
        '/two-factor/disable',
        '/two-factor/generate-backup-codes',
        '/two-factor/verify-backup-code',
        '/passkey/verify-registration',
        '/passkey/delete-passkey',
      ].includes(path))
  ) {
    const user = await customerPool.query<{ email: string; locale: string }>(
      'SELECT email,locale FROM customer_auth.customer_users WHERE id=$1',
      [session.user.id],
    )
    if (user.rows[0]) {
      const locale = user.rows[0].locale === 'en' ? 'en' : 'de'
      // Delivery failure must never roll back or misreport a completed security operation.
      await sendCustomerEmail(
        user.rows[0].email,
        new URL(`/${locale}/portal/security`, process.env.BETTER_AUTH_URL).href,
        'security',
        locale,
      ).catch(() => {
        console.error('Security notification delivery failed.')
      })
    }
  }
})
