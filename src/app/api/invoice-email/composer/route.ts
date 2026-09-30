import { checkOrigin, documentContext } from '@/lib/documents/access'
import { boundedBody, failure, json } from '@/lib/documents/http'
import { DocumentError } from '@/lib/documents/config'
import {
  emailTemplates,
  previewEmailContent,
  saveEmailTemplate,
  uploadEmailLogo,
} from '@/lib/invoice-email/templates'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    return json(await emailTemplates(await documentContext(request.headers)))
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const context = await documentContext(request.headers)
    const action = new URL(request.url).searchParams.get('action')
    if (action === 'logo')
      return json(await uploadEmailLogo(context, await boundedBody(request, 512000)), 201)
    let input: unknown
    try {
      input = JSON.parse((await boundedBody(request, 100000)).toString())
    } catch {
      throw new DocumentError('invalidRequest')
    }
    if (action === 'template') return json(await saveEmailTemplate(context, input))
    if (action === 'preview') return json(await previewEmailContent(context, input))
    throw new DocumentError('invalidRequest')
  } catch (error) {
    return failure(error)
  }
}
