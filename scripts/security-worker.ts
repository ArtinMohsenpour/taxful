import { config } from 'dotenv'
import { setTimeout } from 'node:timers/promises'
config({ path: ['.env.local', '.env'] })
const { staffPool } = await import('../src/lib/staff-auth/database')
const { customerPool } = await import('../src/lib/customer-auth/database')
const { deliverSecurityNotification } =
  await import('../src/lib/customer-auth/security-notifications')
let stopped = false
process.on('SIGTERM', () => {
  stopped = true
})
process.on('SIGINT', () => {
  stopped = true
})
try {
  while (!stopped) {
    try {
      await customerPool.query(
        "INSERT INTO customer_auth.security_worker_health(id) VALUES('notifications') ON CONFLICT(id) DO UPDATE SET heartbeat_at=now()",
      )
      for (let i = 0; i < 20 && !stopped; i++) if (!(await deliverSecurityNotification())) break
      for (let i = 0; i < 20 && !stopped; i++)
        if (!(await deliverSecurityNotification(undefined, true))) break
      await staffPool.query('DELETE FROM public.staff_mfa_proofs WHERE expires_at<now()')
      await staffPool.query(
        "DELETE FROM public.staff_security_notifications WHERE status='sent' AND sent_at<now()-interval '30 days'",
      )
      await customerPool.query(
        "DELETE FROM customer_auth.security_signals WHERE hour<now()-interval '30 days'",
      )
      await customerPool.query(
        "DELETE FROM customer_auth.security_rate_buckets WHERE expires_at<now()-interval '1 day'",
      )
      await customerPool.query(
        "DELETE FROM customer_auth.security_notifications WHERE status='sent' AND sent_at<now()-interval '30 days'",
      )
    } catch {
      console.error(JSON.stringify({ event: 'security_worker_failure' }))
    }
    if (!stopped) await setTimeout(5000)
  }
} finally {
  await customerPool.end()
  await staffPool.end()
}
