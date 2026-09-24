import { checkOrigin, documentContext } from '@/lib/documents/access'
import { boundedBody, documentId, failure, json } from '@/lib/documents/http'
import { DocumentError } from '@/lib/documents/config'
import {
  createInvoiceDraft,
  directory,
  saveDirectory,
  updateInvoiceWorkflow,
} from '@/lib/invoices/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Params = { params: Promise<{ action: string }> }
export async function GET(request: Request, { params }: Params) {
  try {
    const context = await documentContext(request.headers)
    const { action } = await params
    if (action !== 'customers' && action !== 'products') throw new DocumentError('notFound', 404)
    return json({
      items: await directory(context, action, new URL(request.url).searchParams.get('q') || ''),
    })
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request, { params }: Params) {
  try {
    checkOrigin(request)
    const context = await documentContext(request.headers)
    const { action } = await params
    let input: unknown
    try {
      input = JSON.parse((await boundedBody(request, 30_000)).toString())
    } catch {
      throw new DocumentError('invalidRequest')
    }
    if (action === 'drafts') return json(await createInvoiceDraft(context, input), 201)
    if (action === 'customers' || action === 'products')
      return json(await saveDirectory(context, action, input))
    return json(await updateInvoiceWorkflow(context, documentId(action), input))
  } catch (error) {
    return failure(error)
  }
}
