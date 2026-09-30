import { auth } from '@/lib/customer-auth/auth'
import { checkOrigin, documentContext } from '@/lib/documents/access'
import { boundedBody, documentId, failure, json } from '@/lib/documents/http'
import { DocumentError } from '@/lib/documents/config'
import { simulateDeliveryEvent } from '@/lib/invoice-email/events'
import {
  emailHistory,
  emailSettings,
  queueInvoiceEmail,
  saveEmailSettings,
} from '@/lib/invoice-email/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function PATCH(request: Request) {
  try {
    checkOrigin(request)
    const context = await documentContext(request.headers)
    let input: unknown
    try {
      input = JSON.parse((await boundedBody(request, 2000)).toString())
    } catch {
      throw new DocumentError('invalidRequest')
    }
    return json(await simulateDeliveryEvent(context, input))
  } catch (error) {
    return failure(error)
  }
}
export async function GET(request: Request) {
  try {
    const context = await documentContext(request.headers)
    const id = new URL(request.url).searchParams.get('documentId')
    return json(id ? await emailHistory(context, documentId(id)) : await emailSettings(context))
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const context = await documentContext(request.headers)
    let input: unknown
    try {
      input = JSON.parse((await boundedBody(request, 100_000)).toString())
    } catch {
      throw new DocumentError('invalidRequest')
    }
    return json(await queueInvoiceEmail(context, input), 201)
  } catch (error) {
    return failure(error)
  }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request)
    const context = await documentContext(request.headers)
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new DocumentError('unauthorized', 401)
    let input: unknown
    try {
      input = JSON.parse((await boundedBody(request, 2000)).toString())
    } catch {
      throw new DocumentError('invalidRequest')
    }
    return json(await saveEmailSettings(context, input, session.session.id))
  } catch (error) {
    return failure(error)
  }
}
