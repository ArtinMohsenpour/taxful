import { createHmac } from 'node:crypto'
import { customerPool } from './database'

export function emailLimitKey(email: string, purpose: 'verify' | 'reset') {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('Customer authentication is not configured')
  return createHmac('sha256', secret)
    .update(`email:${purpose}:${email.trim().toLowerCase()}`)
    .digest('hex')
}

export async function reserveCustomerEmail(email: string, purpose: 'verify' | 'reset') {
  // Separate purpose budgets prevent verification spam from consuming reset delivery.
  // Reserve before SMTP, including failed delivery, so outages cannot amplify retries.
  const key = emailLimitKey(email, purpose)
  await customerPool.query(
    "DELETE FROM customer_auth.email_delivery_limits WHERE updated_at < now() - interval '7 days'",
  )
  const result = await customerPool.query(
    `
    INSERT INTO customer_auth.email_delivery_limits(recipient_key) VALUES($1)
    ON CONFLICT(recipient_key) DO UPDATE SET
      hour_count=CASE WHEN email_delivery_limits.hour_started_at <= now()-interval '1 hour' THEN 1 ELSE email_delivery_limits.hour_count+1 END,
      day_count=CASE WHEN email_delivery_limits.day_started_at <= now()-interval '24 hours' THEN 1 ELSE email_delivery_limits.day_count+1 END,
      hour_started_at=CASE WHEN email_delivery_limits.hour_started_at <= now()-interval '1 hour' THEN now() ELSE email_delivery_limits.hour_started_at END,
      day_started_at=CASE WHEN email_delivery_limits.day_started_at <= now()-interval '24 hours' THEN now() ELSE email_delivery_limits.day_started_at END,
      updated_at=now()
    WHERE (email_delivery_limits.hour_count < 5 OR email_delivery_limits.hour_started_at <= now()-interval '1 hour')
      AND (email_delivery_limits.day_count < 10 OR email_delivery_limits.day_started_at <= now()-interval '24 hours')
    RETURNING recipient_key`,
    [key],
  )
  return result.rowCount === 1
}
