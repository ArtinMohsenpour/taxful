import { customerPool } from '../customer-auth/database'
export async function securitySignal(
  event: 'rate_limited' | 'rate_limit_unavailable' | 'password_screening_unavailable',
) {
  console.warn(JSON.stringify({ event }))
  try {
    await customerPool.query(
      `INSERT INTO customer_auth.security_signals(event) VALUES($1)
    ON CONFLICT(event,hour) DO UPDATE SET count=security_signals.count+1`,
      [event],
    )
  } catch {
    // The structured log remains the fallback when the database itself is down.
    console.error(JSON.stringify({ event: 'security_signal_storage_unavailable' }))
  }
}
