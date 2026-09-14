import 'server-only'
import { cookies } from 'next/headers'
import { isAPIError } from 'better-auth/api'
import { auth } from '@/lib/customer-auth/auth'

export function isSessionNotFresh(error: unknown) {
  return isAPIError(error) && error.body?.code === 'SESSION_NOT_FRESH'
}

// Better Auth lists signed-in devices only while the session is younger than `freshAge`.
export async function sessionFreshness(createdAt: Date) {
  const { sessionConfig, authCookies } = await auth.$context
  const freshUntil = new Date(createdAt).getTime() + sessionConfig.freshAge * 1000
  return {
    // A freshAge of 0 turns the check off.
    remainingMs: sessionConfig.freshAge ? Math.max(0, freshUntil - Date.now()) : null,
    minutes: Math.round(sessionConfig.freshAge / 60),
    // Signing in again keeps this device's "remember me" choice.
    rememberMe: !(await cookies()).has(authCookies.dontRememberToken.name),
  }
}
