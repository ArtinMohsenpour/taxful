import { customerPool } from '@/lib/customer-auth/database'
import type { DocumentContext } from './access'

export type WorkspaceOverview = {
  stats: {
    documents: number
    thisMonth: number
    outgoing: number
    incoming: number
    drafts: number
    customers: number
    exportFiles: number
    exportedInvoices: number
    needsAttention: number
  }
  recent: {
    id: string
    name: string
    workflow: 'incoming' | 'outgoing' | 'unclassified'
    invoiceState: 'draft' | 'issued' | 'sent' | 'paid'
    status:
      'queued' | 'processing' | 'needs_review' | 'approved' | 'failed' | 'rejected' | 'unsupported'
    createdAt: string
  }[]
}

export async function workspaceOverview(context: DocumentContext): Promise<WorkspaceOverview> {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const counts = await client.query(
      `SELECT
        (SELECT count(*)::int FROM customer_auth.documents WHERE organization_id=$1) AS documents,
        (SELECT count(*)::int FROM customer_auth.documents WHERE organization_id=$1
          AND created_at >= date_trunc('month', now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin') AS this_month,
        (SELECT count(*)::int FROM customer_auth.documents WHERE organization_id=$1 AND workflow='outgoing') AS outgoing,
        (SELECT count(*)::int FROM customer_auth.documents WHERE organization_id=$1 AND workflow='incoming') AS incoming,
        (SELECT count(*)::int FROM customer_auth.documents WHERE organization_id=$1 AND workflow='outgoing' AND invoice_state='draft') AS drafts,
        (SELECT count(*)::int FROM customer_auth.invoice_customers WHERE organization_id=$1 AND NOT archived) AS customers,
        (SELECT count(*)::int FROM customer_auth.document_exports e
          JOIN customer_auth.documents d ON d.id=e.document_id WHERE d.organization_id=$1) AS export_files,
        (SELECT count(DISTINCT e.document_id)::int FROM customer_auth.document_exports e
          JOIN customer_auth.documents d ON d.id=e.document_id WHERE d.organization_id=$1) AS exported_invoices,
        (SELECT count(*)::int FROM customer_auth.documents WHERE organization_id=$1 AND
          (status IN ('needs_review','failed','rejected','unsupported') OR export_state='failed'
            OR (export_state='generating' AND export_started_at<=now()-interval '120 seconds'))) AS needs_attention`,
      [context.organizationId],
    )
    const recent = await client.query(
      `SELECT id,original_name,workflow,invoice_state,status,created_at
       FROM customer_auth.documents WHERE organization_id=$1
       ORDER BY created_at DESC,id DESC LIMIT 5`,
      [context.organizationId],
    )
    await client.query('COMMIT')
    const row = counts.rows[0]
    return {
      stats: {
        documents: row.documents,
        thisMonth: row.this_month,
        outgoing: row.outgoing,
        incoming: row.incoming,
        drafts: row.drafts,
        customers: row.customers,
        exportFiles: row.export_files,
        exportedInvoices: row.exported_invoices,
        needsAttention: row.needs_attention,
      },
      recent: recent.rows.map((item) => ({
        id: item.id,
        name: item.original_name,
        workflow: item.workflow,
        invoiceState: item.invoice_state,
        status: item.status,
        createdAt: new Date(item.created_at).toISOString(),
      })),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
