import { enforceSecurityRate } from '@/lib/security/rate-limit'
import { DocumentError } from '@/lib/documents/config'
import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/customer-auth/auth'
import { boundedBody } from '@/lib/documents/http'
import { countsAsPasswordFailure } from '@/lib/customer-auth/proxy-config'
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
  try {
    const path = new URL(request.url).pathname.replace(/\/+$/, '')
    const sensitive = [
      '/sign-in/email',
      '/sign-up/email',
      '/request-password-reset',
      '/reset-password',
    ].find((value) => path.endsWith(value))
    await enforceSecurityRate(request, sensitive || 'customer-auth', sensitive ? 10 : 120, 60)
  } catch (error) {
    const status = error instanceof DocumentError ? error.status : 503
    return privateResponse(
      Response.json(
        {
          code: status === 429 ? 'RATE_LIMITED' : 'SECURITY_UNAVAILABLE',
          message: 'Please try again later.',
        },
        { status, headers: { 'Retry-After': '60' } },
      ),
    )
  }
  // Bound every auth body before either our JSON parser or Better Auth consumes it.
  {
    try {
      const bytes = await boundedBody(request, 64 * 1024)
      request = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: new Uint8Array(bytes),
      })
    } catch {
      return privateResponse(
        Response.json({ code: 'INVALID_REQUEST', message: 'Invalid request.' }, { status: 413 }),
      )
    }
  }
  const isPasswordLogin = new URL(request.url).pathname
    .replace(/\/+$/, '')
    .endsWith('/sign-in/email')
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
    if (countsAsPasswordFailure(response.status, error?.code)) await recordLoginFailure(identity)
  }
  return privateResponse(response)
}
