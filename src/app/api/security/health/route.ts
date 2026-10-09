import { timingSafeEqual } from 'node:crypto'
import { securityHealth } from '@/lib/security/health'
import { json } from '@/lib/documents/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const expected = process.env.SECURITY_MONITOR_TOKEN
  const actual = request.headers.get('authorization') || ''
  const want = Buffer.from(`Bearer ${expected || ''}`),
    got = Buffer.from(actual)
  if (
    !expected ||
    expected.length < 32 ||
    want.length !== got.length ||
    !timingSafeEqual(want, got)
  )
    return json({ error: 'notFound' }, 404)
  try {
    const state = await securityHealth()
    return json(state, state.healthy ? 200 : 503)
  } catch {
    return json({ healthy: false }, 503)
  }
}
