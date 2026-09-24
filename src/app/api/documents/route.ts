import { checkOrigin, documentContext } from '@/lib/documents/access'
import { boundedBody, failure, json } from '@/lib/documents/http'
import { entitlements, documentLibrary, uploadDocuments } from '@/lib/documents/service'
import { documentFilters } from '@/lib/documents/listing'
import { documentLimits, DocumentError, extractionReady } from '@/lib/documents/config'
import { processingHealth } from '@/lib/documents/diagnostics'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const context = await documentContext(request.headers)
    return json({
      ...(await documentLibrary(context, documentFilters(new URL(request.url).searchParams))),
      limits: await entitlements(context),
      aiReady: extractionReady(),
      health: await processingHealth(),
    })
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const context = await documentContext(request.headers)
    const bytes = await boundedBody(request, documentLimits().maxRequestBytes)
    const type = request.headers.get('content-type') || ''
    if (!type.startsWith('multipart/form-data;')) throw new DocumentError('invalidRequest')
    const form = await new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': type },
    }).formData()
    const files = form.getAll('files')
    const workflow = form.get('workflow')
    if (workflow !== 'incoming' && workflow !== 'outgoing')
      throw new DocumentError('workflowRequired')
    if (files.some((file) => !(file instanceof File))) throw new DocumentError('invalidRequest')
    return json(
      {
        ids: await uploadDocuments(
          context,
          files as File[],
          request.headers.get('idempotency-key') || '',
          workflow,
        ),
      },
      201,
    )
  } catch (error) {
    return failure(error)
  }
}
