import { auth } from '@/lib/customer-auth/auth'
import {
  teamActionSchema,
  teamRateLimit,
  teamSnapshot,
  manageTeam,
  respondToInvitation,
} from '@/lib/customer-auth/team'
import { checkOrigin, documentContext } from '@/lib/documents/access'
import { DocumentError } from '@/lib/documents/config'
import { boundedBody, failure, json } from '@/lib/documents/http'

export const runtime = 'nodejs'
export async function GET(request: Request) {
  try {
    const context = await documentContext(request.headers)
    const before = new URL(request.url).searchParams.get('before') || undefined
    if (before && !/^[1-9][0-9]{0,17}$/.test(before)) throw new DocumentError('invalidRequest')
    return json(await teamSnapshot(context, before))
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session || !session.user.emailVerified) throw new DocumentError('unauthorized', 401)
    const parsed = teamActionSchema.safeParse(
      JSON.parse((await boundedBody(request, 4096)).toString()),
    )
    if (!parsed.success) throw new DocumentError('invalidRequest')
    await teamRateLimit(session.user.id)
    const input = parsed.data
    if (!('organizationId' in input))
      return json(await respondToInvitation(session.user.id, input.invitationId, input.action))
    return json(await manageTeam(await documentContext(request.headers), input))
  } catch (error) {
    return failure(error)
  }
}
