import { randomUUID } from 'node:crypto'
import { staffPool } from '../staff-auth/database'
import { customerPool } from './database'
import { sendCustomerEmail } from './email'

type Delivery = {
  id: string
  recipient: string
  locale: 'de' | 'en'
  kind: 'security' | 'passwordChanged' | 'passwordReset'
  attempts: number
}
// Stable Message-ID helps providers deduplicate. SMTP cannot guarantee exactly-once
// delivery after a connection loss; security notices may be repeated, never lost silently.
export async function deliverSecurityNotification(
  send = sendCustomerEmail,
  staff = false,
  eventId?: string,
) {
  // Table names are selected only from these constants, never request input.
  const table = staff
    ? 'public.staff_security_notifications'
    : 'customer_auth.security_notifications'
  const pool = staff ? staffPool : customerPool
  await pool.query(
    `UPDATE ${table} SET status='failed',lease_until=NULL WHERE ($1::bigint IS NULL OR event_id=$1) AND attempts>=8 AND ((status='sending' AND lease_until<now()) OR status='pending')`,
    [eventId || null],
  )
  const lease = randomUUID()
  const claimed = await pool.query<Delivery>(
    `WITH candidate AS (
      SELECT id FROM ${table}
      WHERE ($2::bigint IS NULL OR event_id=$2) AND ((status='pending' AND available_at<=now()) OR (status='sending' AND lease_until<now()))
      ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1
    ) UPDATE ${table} n SET status='sending',attempts=attempts+1,
      lease_token=$1,lease_until=now()+interval '2 minutes'
      FROM candidate c WHERE n.id=c.id RETURNING n.*`,
    [lease, eventId || null],
  )
  const job = claimed.rows[0]
  if (!job) return false
  try {
    const origin = new URL(process.env.BETTER_AUTH_URL!)
    const url = new URL(
      staff
        ? '/admin/login'
        : `/${job.locale}/${job.kind === 'security' ? 'portal/security' : 'forgot-password'}`,
      origin,
    )
    await send(
      job.recipient,
      url.href,
      job.kind,
      job.locale,
      `<security-${staff ? 'staff-' : ''}${job.id}@${origin.hostname}>`,
    )
    await pool.query(
      `UPDATE ${table} SET status='sent',sent_at=now(),lease_until=NULL WHERE id=$1 AND lease_token=$2`,
      [job.id, lease],
    )
  } catch {
    await pool.query(
      `UPDATE ${table} SET status=CASE WHEN attempts>=8 THEN 'failed' ELSE 'pending' END,
        available_at=now()+($3::text||' seconds')::interval,lease_until=NULL
        WHERE id=$1 AND lease_token=$2`,
      [job.id, lease, Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7))],
    )
    console.error(JSON.stringify({ event: 'security_notification_retry', attempt: job.attempts }))
  }
  return true
}
