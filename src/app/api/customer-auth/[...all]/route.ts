import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/customer-auth/auth'

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
  return privateResponse(await handlers.POST(request))
}
