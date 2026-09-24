import { checkOrigin, documentContext, canApprove, canDeleteDocument } from '@/lib/documents/access'
import { deleteDocument } from '@/lib/documents/deletion'
import { boundedBody, documentId, failure, json, privateHeaders } from '@/lib/documents/http'
import {
  getDocument,
  saveReview,
  retryDocument,
  exportDocument,
  downloadDocument,
} from '@/lib/documents/service'
import { DocumentError } from '@/lib/documents/config'
import { getCompanyProfile } from '@/lib/documents/company-profile'
import { canManageCompany } from '@/lib/documents/company-profile'
import { processingHealth, processingActivity } from '@/lib/documents/diagnostics'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Params = { params: Promise<{ id: string; action: string }> }
export async function GET(request: Request, { params }: Params) {
  try {
    const { id: raw, action } = await params
    const id = documentId(raw)
    const context = await documentContext(request.headers)
    if (action === 'detail') {
      const doc = await getDocument(context, id)
      return json({
        document: {
          id: doc.id,
          organizationId: context.organizationId,
          workflow: doc.workflow,
          sourceKind: doc.source_kind,
          invoiceState: doc.invoice_state,
          inputValidation: doc.input_validation,
          savedCustomerId: doc.saved_customer_id,
          canManageCustomers: canManageCompany(context.role),
          name: doc.original_name,
          mime: doc.mime_type,
          status: doc.status,
          error: doc.error_code,
          text: doc.source_text,
          pages: doc.page_count,
          data: doc.reviewed_data || doc.extracted_data,
          evidence: doc.evidence || [],
          warnings: doc.extraction_warnings || [],
          revision: doc.revision,
          scanned: Boolean(doc.scanned_at),
          attempts: doc.attempts,
          approvedAt: doc.approved_at,
          stage: doc.processing_stage,
          method: doc.extraction_method,
          exportState: doc.export_state,
          exportIssues: doc.export_issues,
          exportAvailable: doc.export_available && doc.status === 'approved',
          canDelete: doc.invoice_state === 'draft' && canDeleteDocument(context, doc.uploaded_by),
          zugferdAvailable: doc.zugferd_available && doc.status === 'approved',
          classification: doc.classification,
          companyProfile: (await getCompanyProfile(context))?.data || null,
          health: await processingHealth(),
          activity: await processingActivity(context, id),
        },
        canApprove: canApprove(context.role),
      })
    }
    if (!['source', 'preview', 'export', 'zugferd'].includes(action))
      throw new DocumentError('notFound', 404)
    const file = await downloadDocument(
      context,
      id,
      action as 'source' | 'preview' | 'export' | 'zugferd',
    )
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        ...privateHeaders,
        'Content-Type': file.mime,
        'Content-Disposition':
          action === 'preview'
            ? 'inline'
            : "attachment; filename*=UTF-8''" + encodeURIComponent(file.name),
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request, { params }: Params) {
  try {
    checkOrigin(request)
    const { id: raw, action } = await params
    const id = documentId(raw)
    const context = await documentContext(request.headers)
    if (action === 'delete') return json(await deleteDocument(context, id))
    if (action === 'review') {
      let input: unknown
      try {
        input = JSON.parse((await boundedBody(request, 300_000)).toString())
      } catch (error) {
        if (error instanceof DocumentError) throw error
        throw new DocumentError('invalidRequest')
      }
      return json(await saveReview(context, id, input))
    }
    if (action === 'retry') {
      await retryDocument(context, id)
      return json({ ok: true })
    }
    if (action === 'export' || action === 'zugferd') {
      const result = await exportDocument(
        context,
        id,
        action === 'export' ? 'xrechnung' : 'zugferd',
      )
      return typeof result === 'string'
        ? json({ download: '/api/documents/' + id + '/' + action })
        : json(result, 422)
    }
    throw new DocumentError('notFound', 404)
  } catch (error) {
    return failure(error)
  }
}
