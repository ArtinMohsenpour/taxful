import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'
import { JWTAuthentication } from 'payload'
import { staffPool } from './database'
import { newTotpSecret, seal, unseal, staffDigest, totp, safeEqual } from './crypto'
import { DocumentError } from '../documents/config'
export async function staffFirstFactor(payload: Payload, headers: Headers) {
  const { user } = await JWTAuthentication({ payload, headers })
  if (user?.collection !== 'users' || !('_sid' in user) || typeof user._sid !== 'string')
    throw new DocumentError('unauthorized', 401)
  const session = await staffPool.query(
    `SELECT s.created_at FROM public.users_sessions s LEFT JOIN public.staff_session_revocations r ON r.user_id=s._parent_id WHERE s.id=$1 AND s._parent_id=$2 AND s.expires_at>now() AND (r.revoked_at IS NULL OR s.created_at>r.revoked_at)`,
    [user._sid, user.id],
  )
  if (!session.rowCount || new Date(session.rows[0].created_at).getTime() < Date.now() - 5 * 60_000)
    throw new DocumentError('signInAgain', 401)
  return { id: user.id, email: user.email, sessionId: user._sid }
}
export async function staffMfaState(id: number) {
  const r = await staffPool.query('SELECT verified FROM public.staff_mfa WHERE user_id=$1', [id])
  return r.rows[0]?.verified ? 'verify' : 'enroll'
}
export async function beginStaffMfa(user: { id: number; email: string }) {
  const secret = newTotpSecret()
  const r = await staffPool.query(
    `INSERT INTO public.staff_mfa(user_id,secret) VALUES($1,$2)
    ON CONFLICT(user_id) DO UPDATE SET secret=CASE WHEN NOT staff_mfa.verified AND staff_mfa.created_at<now()-interval '5 minutes' THEN EXCLUDED.secret ELSE staff_mfa.secret END,
    created_at=CASE WHEN NOT staff_mfa.verified AND staff_mfa.created_at<now()-interval '5 minutes' THEN now() ELSE staff_mfa.created_at END
    RETURNING secret,verified`,
    [user.id, seal(secret, user.id)],
  )
  if (r.rows[0].verified) throw new DocumentError('alreadyEnabled', 409)
  const key = unseal(r.rows[0].secret, user.id)
  return {
    secret: key,
    uri: `otpauth://totp/${encodeURIComponent('Taxful Staff:' + user.email)}?secret=${key}&issuer=Taxful%20Staff&algorithm=SHA1&digits=6&period=30`,
  }
}
export async function verifyStaffMfa(user: { id: number; sessionId: string }, code: string) {
  const client = await staffPool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT id FROM public.users WHERE id=$1 FOR SHARE', [user.id])
    const session = await client.query(
      `SELECT s.id FROM public.users_sessions s LEFT JOIN public.staff_session_revocations r ON r.user_id=s._parent_id WHERE s.id=$1 AND s._parent_id=$2 AND s.expires_at>now() AND s.created_at>now()-interval '5 minutes' AND (r.revoked_at IS NULL OR s.created_at>r.revoked_at) FOR SHARE OF s`,
      [user.sessionId, user.id],
    )
    if (!session.rowCount) throw new DocumentError('signInAgain', 401)
    const r = await client.query('SELECT * FROM public.staff_mfa WHERE user_id=$1 FOR UPDATE', [
      user.id,
    ])
    const factor = r.rows[0]
    if (!factor) throw new DocumentError('enrollmentRequired', 400)
    if (factor.locked_until && new Date(factor.locked_until).getTime() > Date.now())
      throw new DocumentError('rateLimited', 429)
    const hashes = factor.recovery_hashes as string[]
    const recovered =
      factor.verified && /^[A-Fa-f0-9]{16}$/.test(code)
        ? hashes.findIndex((h) => safeEqual(h, staffDigest(code.toLowerCase())))
        : -1
    const now = Math.floor(Date.now() / 30000)
    const counter = /^\d{6}$/.test(code)
      ? [now - 1, now, now + 1].find(
          (c) =>
            c > Number(factor.last_counter) &&
            safeEqual(totp(unseal(factor.secret, user.id), c), code),
        )
      : undefined
    if (counter === undefined && recovered < 0) {
      await client.query(
        `UPDATE public.staff_mfa SET failures=CASE WHEN locked_until<now() THEN 1 ELSE failures+1 END,
    locked_until=CASE WHEN (CASE WHEN locked_until<now() THEN 1 ELSE failures+1 END)>=10 THEN now()+interval '15 minutes' ELSE NULL END WHERE user_id=$1`,
        [user.id],
      )
      await client.query(
        "INSERT INTO public.staff_security_events(user_id,event) VALUES($1,'mfaRejected')",
        [user.id],
      )
      await client.query('COMMIT')
      throw new DocumentError('invalidCode', 400)
    }
    const codes = !factor.verified
      ? Array.from({ length: 10 }, () => randomBytes(8).toString('hex'))
      : undefined
    const remaining = codes ? codes.map(staffDigest) : hashes.filter((_, i) => i !== recovered)
    await client.query(
      'UPDATE public.staff_mfa SET verified=true,last_counter=$2,recovery_hashes=$3,failures=0,locked_until=NULL WHERE user_id=$1',
      [user.id, counter ?? factor.last_counter, JSON.stringify(remaining)],
    )
    const token = randomBytes(32).toString('hex')
    await client.query(
      'DELETE FROM public.staff_mfa_proofs WHERE expires_at<now() OR (user_id=$1 AND session_id=$2)',
      [user.id, user.sessionId],
    )
    await client.query(
      "INSERT INTO public.staff_mfa_proofs(token_hash,user_id,session_id,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",
      [staffDigest(token), user.id, user.sessionId],
    )
    await client.query('INSERT INTO public.staff_security_events(user_id,event) VALUES($1,$2)', [
      user.id,
      !factor.verified ? 'mfaEnabled' : recovered >= 0 ? 'recoveryUsed' : 'mfaVerified',
    ])
    await client.query('COMMIT')
    return { token, codes }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
