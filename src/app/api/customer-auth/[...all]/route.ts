import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/customer-auth/auth'
import {
  clearLoginFailures,
  lockedResponse,
  loginAllowed,
  loginIdentity,
  recordLoginFailure,
} from '@/lib/customer-auth/login-protection'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const handlers = toNextJsHandler(auth)

function privateResponse(response: Response) {
  response.headers.set('Cache-Control', 'no-store, private')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}
export async function GET(request: Request) {
  return privateResponse(await handlers.GET(request))
}
export async function POST(request: Request) {
  const isPasswordLogin = new URL(request.url).pathname.endsWith('/sign-in/email')
  if (!isPasswordLogin) return privateResponse(await handlers.POST(request))
  const input = await request
    .clone()
    .json()
    .catch(() => null)
  const identity = loginIdentity(input?.email)
  if (!identity) return privateResponse(await handlers.POST(request))
  const availability = await loginAllowed(identity)
  if (!availability.allowed) return privateResponse(lockedResponse(availability.retryAfter))
  const response = await handlers.POST(request)
  if (response.ok) await clearLoginFailures(identity)
  else {
    const error = await response
      .clone()
      .json()
      .catch(() => null)
    if (
      response.status === 401 ||
      response.status === 429 ||
      error?.code === 'INVALID_EMAIL_OR_PASSWORD'
    )
      await recordLoginFailure(identity)
  }
  return privateResponse(response)
}
