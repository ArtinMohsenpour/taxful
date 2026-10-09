import { securitySignal } from './signals'
import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { customerPool } from '../customer-auth/database'
import { DocumentError } from '../documents/config'

export function securityClientIP(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
) {
  if (!env.BETTER_AUTH_URL) throw new DocumentError('securityUnavailable', 503)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.BETTER_AUTH_URL).hostname)
  if (!local && env.SECURITY_PROXY_CONTRACT !== 'overwrite-single-ip')
    throw new DocumentError('securityUnavailable', 503)
  const header = (env.CUSTOMER_IP_HEADER || 'x-forwarded-for').toLowerCase()
  const ip = (headers.get(header) || '').trim()
  // Missing or ambiguous attribution shares a bucket; it must never disable limits.
  if (ip.length > 64 || !isIP(ip)) return 'unattributed'
  if (isIP(ip) === 4) return ip
  const canonical = new URL(`http://[${ip}]`).hostname.slice(1, -1)
  if (canonical.startsWith('::ffff:')) {
    const tail = canonical.slice(7).split(':')
    if (tail.length === 2)
      return tail
        .flatMap((group) => {
          const value = parseInt(group, 16)
          return [value >>> 8, value & 255]
        })
        .join('.')
  }
  const halves = canonical.split('::'),
    left = halves[0] ? halves[0].split(':') : [],
    right = halves[1] ? halves[1].split(':') : []
  const groups =
    halves.length === 2
      ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
      : left
  return (
    groups
      .slice(0, 4)
      .map((v) => v.padStart(4, '0'))
      .join(':') + '::/64'
  )
}
export async function consumeSecurityRate(
  identity: string,
  purpose: string,
  maximum: number,
  seconds: number,
) {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new DocumentError('securityUnavailable', 503)
  const key = createHmac('sha256', secret)
    .update(purpose + '\0' + identity)
    .digest('hex')
  const result = await customerPool.query<{ attempts: number; retry: number }>(
    `INSERT INTO customer_auth.security_rate_buckets(key,expires_at) VALUES($1,now()+($2::text||' seconds')::interval)
   ON CONFLICT(key) DO UPDATE SET
    attempts=CASE WHEN security_rate_buckets.expires_at<=now() THEN 1 ELSE LEAST(security_rate_buckets.attempts+1,1000000) END,
    window_started_at=CASE WHEN security_rate_buckets.expires_at<=now() THEN now() ELSE security_rate_buckets.window_started_at END,
    expires_at=CASE WHEN security_rate_buckets.expires_at<=now() THEN now()+($2::text||' seconds')::interval ELSE security_rate_buckets.expires_at END
   RETURNING attempts,GREATEST(1,ceil(extract(epoch FROM (expires_at-now()))))::integer AS retry`,
    [key, seconds],
  )
  return { allowed: result.rows[0].attempts <= maximum, retryAfter: result.rows[0].retry }
}
export async function enforceSecurityRate(
  request: Request,
  purpose: string,
  maximum: number,
  seconds: number,
) {
  let result
  try {
    result = await consumeSecurityRate(securityClientIP(request.headers), purpose, maximum, seconds)
  } catch (error) {
    await securitySignal('rate_limit_unavailable')
    if (error instanceof DocumentError) throw error
    throw new DocumentError('securityUnavailable', 503)
  }
  if (!result.allowed) {
    await securitySignal('rate_limited')
    throw new DocumentError('rateLimited', 429)
  }
}
