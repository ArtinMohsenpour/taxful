import { createHmac } from 'node:crypto'
import { customerPool } from './database'

const attemptWindowHours = 24

function identityHash(email: string) {
  return createHmac('sha256', process.env.BETTER_AUTH_SECRET!)
    .update(email.trim().toLowerCase())
    .digest('hex')
}

export function loginIdentity(value: unknown) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length > 3 && email.length <= 254 && email.includes('@') ? identityHash(email) : null
}

export async function loginAllowed(hash: string) {
  const result = await customerPool.query<{ locked: boolean; retry_after: number }>(
    `SELECT locked_until>now() AS locked,
      GREATEST(1,CEIL(EXTRACT(EPOCH FROM (locked_until-now()))))::integer AS retry_after
     FROM customer_auth.login_attempts WHERE identity_hash=$1`,
    [hash],
  )
  return result.rows[0]?.locked
    ? { allowed: false as const, retryAfter: result.rows[0].retry_after }
    : { allowed: true as const }
}

export async function recordLoginFailure(hash: string) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [hash])
    const current = await client.query<{ failure_count: number; first_failed_at: Date }>(
      'SELECT failure_count,first_failed_at FROM customer_auth.login_attempts WHERE identity_hash=$1 FOR UPDATE',
      [hash],
    )
    const previous = current.rows[0]
    const freshWindow =
      !previous || Date.now() - previous.first_failed_at.getTime() > attemptWindowHours * 3600000
    const failures = freshWindow ? 1 : previous.failure_count + 1
    const lockMinutes = failures >= 10 ? 60 : failures >= 8 ? 15 : failures >= 5 ? 5 : 0
    await client.query(
      `INSERT INTO customer_auth.login_attempts(identity_hash,failure_count,first_failed_at,last_failed_at,locked_until)
       VALUES($1,$2,now(),now(),CASE WHEN $3>0 THEN now()+($3::text||' minutes')::interval END)
       ON CONFLICT(identity_hash) DO UPDATE SET failure_count=$2,
        first_failed_at=CASE WHEN $4 THEN now() ELSE login_attempts.first_failed_at END,
        last_failed_at=now(),locked_until=CASE WHEN $3>0 THEN now()+($3::text||' minutes')::interval END`,
      [hash, failures, lockMinutes, freshWindow],
    )
    await client.query(
      "DELETE FROM customer_auth.login_attempts WHERE last_failed_at<now()-interval '7 days'",
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function clearLoginFailures(hash: string) {
  await customerPool.query('DELETE FROM customer_auth.login_attempts WHERE identity_hash=$1', [
    hash,
  ])
}

export function lockedResponse(retryAfter: number) {
  return Response.json(
    { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}
