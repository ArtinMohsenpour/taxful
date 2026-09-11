import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Payload, framework assets, and the starter API example are not localized.
  matcher: ['/((?!admin(?:/|$)|api(?:/|$)|my-route(?:/|$)|_next|_vercel|.*\\..*).*)'],
}
