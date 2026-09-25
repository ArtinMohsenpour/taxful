import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextResponse, type NextRequest } from 'next/server'

const localize = createMiddleware(routing)
export default function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/(de|en)\/portal(?:\/|$)/)
  // Optimistic routing only. Every private page/action still verifies the DB session and role.
  if (
    match &&
    !request.cookies.has('taxful-customer.session_token') &&
    !request.cookies.has('__Secure-taxful-customer.session_token')
  ) {
    const url = new URL(`/${match[1]}/login`, request.url)
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  const response = localize(request)
  if (match) {
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
  }
  return response
}

export const config = {
  // Payload, framework assets, and the starter API example are not localized.
  matcher: ['/((?!admin(?:/|$)|api(?:/|$)|my-route(?:/|$)|_next|_vercel|.*\\..*).*)'],
}
