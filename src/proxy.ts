import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextResponse, NextRequest } from 'next/server'
import { enforceSecurityRate } from './lib/security/rate-limit'
import { DocumentError } from './lib/documents/config'
import { pageSecurityPolicy } from './lib/security/headers'

const localize = createMiddleware(routing)
export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/')) {
    // Signed provider webhooks and authenticated monitoring must stay available
    // when a shared NAT client exceeds its interactive request budget.
    if (!['/api/billing/webhook', '/api/security/health'].includes(path)) {
      try {
        await enforceSecurityRate(request, 'api', 600, 60)
        if (/^\/api\/users\/(login|forgot-password|reset-password|first-register)\/?$/.test(path))
          await enforceSecurityRate(request, 'staff-auth', 10, 60)
        if (path === '/api/graphql') await enforceSecurityRate(request, 'staff-graphql', 30, 60)
      } catch (error) {
        const status = error instanceof DocumentError ? error.status : 503
        return NextResponse.json(
          { error: status === 429 ? 'rateLimited' : 'securityUnavailable' },
          { status, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '60' } },
        )
      }
    }
    return NextResponse.next()
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  // Only the public home preview is embedded by Payload; private pages stay unframeable.
  const preview =
    /^\/(de|en)\/?$/.test(request.nextUrl.pathname) &&
    request.nextUrl.searchParams.get('preview') === 'true'
  const policy = pageSecurityPolicy(nonce, preview, process.env.NODE_ENV === 'development')
  const requestHeaders = new Headers(request.headers)
  // Always replace client-supplied nonce/CSP headers.
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', policy)
  request = new NextRequest(request, { headers: requestHeaders })
  const secure = (response: NextResponse) => {
    response.headers.set('Content-Security-Policy', policy)
    response.headers.set('X-Frame-Options', preview ? 'SAMEORIGIN' : 'DENY')
    response.headers.set('Referrer-Policy', 'no-referrer')
    // Nonces must never be reused by an intermediary cache.
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }
  if (/^\/admin(?:\/|$)/.test(request.nextUrl.pathname))
    return secure(NextResponse.next({ request: { headers: requestHeaders } }))
  const match = request.nextUrl.pathname.match(/^\/(de|en)\/portal(?:\/|$)/)
  // Optimistic routing only. Every private page/action still verifies the DB session and role.
  if (
    match &&
    !request.cookies.has('taxful-customer.session_token') &&
    !request.cookies.has('__Secure-taxful-customer.session_token')
  ) {
    const url = new URL(`/${match[1]}/login`, request.url)
    url.searchParams.set('next', request.nextUrl.pathname)
    return secure(NextResponse.redirect(url))
  }
  const response = localize(request)
  if (match) {
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
  }
  return secure(response)
}

export const config = {
  // Admin gets CSP without localization; APIs retain their own response policies.
  matcher: ['/api/:path*', '/((?!api(?:/|$)|my-route(?:/|$)|_next|_vercel|.*\\..*).*)'],
}
