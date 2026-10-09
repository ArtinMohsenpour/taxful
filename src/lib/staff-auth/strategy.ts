import { JWTAuthentication, type Payload } from 'payload'
import { staffPool } from './database'
import { staffDigest } from './crypto'
export const staffCookie = 'taxful-staff-mfa'
export function cookieValue(headers: Headers) {
  const values = (headers.get('cookie') || '')
    .split(';')
    .map((v) => v.trim())
    .filter((v) => v.startsWith(staffCookie + '='))
  if (values.length !== 1) return ''
  const token = values[0].slice(staffCookie.length + 1)
  return /^[a-f0-9]{64}$/.test(token) ? token : ''
}
export async function installStaffMfa(payload: Payload) {
  // Replace, do not append: the built-in JWT strategy must not become an MFA bypass.
  const native = payload.authStrategies.find((strategy) => strategy.name === 'local-jwt')
  if (!native) throw new Error('Staff MFA requires the Payload JWT strategy')
  native.authenticate = async (args) => {
    const result = await JWTAuthentication(args)
    const user = result.user
    if (!user || user.collection !== 'users') return result
    const token = cookieValue(args.headers)
    if (!token || !('_sid' in user) || typeof user._sid !== 'string') return { user: null }
    const proof = await staffPool.query(
      `SELECT 1 FROM public.staff_mfa_proofs p JOIN public.staff_mfa f ON f.user_id=p.user_id
       JOIN public.users_sessions s ON s.id=p.session_id AND s._parent_id=p.user_id
       LEFT JOIN public.staff_session_revocations r ON r.user_id=p.user_id
       WHERE s.expires_at>now() AND (r.revoked_at IS NULL OR s.created_at>r.revoked_at) AND p.token_hash=$1 AND p.user_id=$2 AND p.session_id=$3 AND p.expires_at>now() AND f.verified`,
      [staffDigest(token), user.id, user._sid],
    )
    return proof.rowCount ? result : { user: null }
  }
}
