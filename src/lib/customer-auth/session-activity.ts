import { createAuthMiddleware } from 'better-auth/api'
import { customerPool } from './database'
import { sessionActivitySeconds, sessionIdleSeconds } from './session-timeout'

// Runs before every Better Auth endpoint, including server-side `auth.api` calls. Better Auth only
// extends sessions for users who chose "Remember me", so "updatedAt" records activity instead: a
// session without requests for longer than the idle limit is deleted before it can be used, and
// activity is written at most once per interval.
export const trackSessionActivity = createAuthMiddleware(async (ctx) => {
  const token = await ctx.getSignedCookie(
    ctx.context.authCookies.sessionToken.name,
    ctx.context.secret,
  )
  if (!token) return
  await customerPool.query(
    `WITH target AS (
      SELECT id, "updatedAt" < now() - $2::int * interval '1 second' AS idle
      FROM customer_auth.customer_sessions WHERE token = $1
    ), removed AS (
      DELETE FROM customer_auth.customer_sessions s USING target
      WHERE s.id = target.id AND target.idle
    )
    UPDATE customer_auth.customer_sessions s SET "updatedAt" = now() FROM target
    WHERE s.id = target.id AND NOT target.idle
      AND s."updatedAt" < now() - $3::int * interval '1 second'`,
    [token, sessionIdleSeconds, sessionActivitySeconds],
  )
})
