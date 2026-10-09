import { stat } from 'node:fs/promises'
import { customerPool } from '../customer-auth/database'
import { staffPool } from '../staff-auth/database'
import { securityClientIP } from './rate-limit'
export async function securityHealth() {
  const customer = await customerPool.query(`SELECT
    (SELECT heartbeat_at>now()-interval '90 seconds' FROM customer_auth.security_worker_health WHERE id='notifications') AS worker,
    count(*) FILTER(WHERE status='failed')::integer AS failed,
    count(*) FILTER(WHERE status IN ('pending','sending') AND created_at<now()-interval '10 minutes')::integer AS delayed
    FROM customer_auth.security_notifications`)
  const staff = await staffPool.query(`SELECT
    count(*) FILTER(WHERE status='failed')::integer AS failed,
    count(*) FILTER(WHERE status IN ('pending','sending') AND created_at<now()-interval '10 minutes')::integer AS delayed
    FROM public.staff_security_notifications`)
  const signals = await customerPool.query<{ event: string; count: string }>(
    "SELECT event,sum(count)::text AS count FROM customer_auth.security_signals WHERE hour>=date_trunc('hour',now())-interval '1 hour' GROUP BY event",
  )
  const staffFailures = await staffPool.query(
    "SELECT count(*)::integer AS count FROM public.staff_security_events WHERE event='mfaRejected' AND created_at>now()-interval '15 minutes'",
  )
  let screening = false,
    proxy = false
  if (process.env.PASSWORD_SCREENING_MODE === 'hibp') screening = true
  else if (
    (!process.env.PASSWORD_SCREENING_MODE || process.env.PASSWORD_SCREENING_MODE === 'local') &&
    process.env.PASSWORD_BLOCKLIST_PATH
  ) {
    try {
      const file = await stat(process.env.PASSWORD_BLOCKLIST_PATH)
      screening =
        file.isFile() &&
        file.size > 0 &&
        file.size % 41 === 0 &&
        file.mtimeMs > Date.now() - 30 * 86400000
    } catch {
      /* Fail readiness when the corpus is missing, invalid or stale. */
    }
  }
  try {
    securityClientIP(new Headers())
    proxy = true
  } catch {
    /* Deployment contract is missing. */
  }
  const smtp = !!process.env.CUSTOMER_SMTP_HOST && !!process.env.CUSTOMER_EMAIL_FROM
  const state = customer.rows[0],
    staffState = staff.rows[0]
  return {
    healthy:
      state.worker === true &&
      state.failed === 0 &&
      state.delayed === 0 &&
      staffState.failed === 0 &&
      staffState.delayed === 0 &&
      screening &&
      proxy &&
      smtp,
    configuration: { screening, proxy, smtp },
    notifications: {
      worker: state.worker === true,
      customer: { failed: state.failed, delayed: state.delayed },
      staff: staffState,
    },
    signals: Object.fromEntries(signals.rows.map((row) => [row.event, Number(row.count)])),
    staffMfaRejectionsLast15Minutes: staffFailures.rows[0].count,
  }
}
