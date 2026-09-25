import { getPayload } from 'payload'
import config from '@payload-config'
import { isSuperAdmin } from '@/access/cms-users'
import {
  adminAction,
  adminActionSchema,
  adminBillingDetails,
  adminSnapshot,
} from '@/lib/billing/admin'
import { boundedBody, failure, json } from '@/lib/documents/http'
import { checkOrigin } from '@/lib/documents/access'
import { DocumentError } from '@/lib/documents/config'

export const runtime = 'nodejs'
async function staff(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!isSuperAdmin(user)) throw new DocumentError('forbidden', 403)
  // Re-read the staff record: a stale JWT must not preserve a revoked owner role.
  const current = await payload.findByID({
    collection: 'users',
    id: user!.id,
    user,
    overrideAccess: false,
    depth: 0,
  })
  if (current.role !== 'super-admin') throw new DocumentError('forbidden', 403)
  return String(current.id)
}
export async function GET(request: Request) {
  try {
    await staff(request)
    const url = new URL(request.url)
    const query = (url.searchParams.get('q') || '').slice(0, 100)
    const organizationId = url.searchParams.get('organizationId')
    if (organizationId) {
      if (organizationId.length > 200) throw new DocumentError('invalidRequest')
      return json({ billingDetails: await adminBillingDetails(organizationId) })
    }
    const offset = Number(url.searchParams.get('offset') || 0)
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000)
      throw new DocumentError('invalidRequest')
    return json(await adminSnapshot(query, offset))
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const id = await staff(request)
    const parsed = adminActionSchema.safeParse(
      JSON.parse((await boundedBody(request, 20000)).toString()),
    )
    if (!parsed.success) throw new DocumentError('invalidRequest')
    await adminAction(id, parsed.data)
    return json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
