import { headers } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { requireCustomer } from '@/lib/customer-auth/session'
import { canApprove, documentContext } from '@/lib/documents/access'
import { getDocument } from '@/lib/documents/service'
import { documentId } from '@/lib/documents/http'
import { DocumentError } from '@/lib/documents/config'
import { recordSchema } from '@/lib/documents/schema'
import { InvoiceDeliveryWorkspace } from '@/components/invoices/delivery-workspace'

async function deliveryDocument(id: string) {
  try {
    const context = await documentContext(await headers())
    const doc = await getDocument(context, documentId(id))
    if (
      doc.workflow !== 'outgoing' ||
      doc.status !== 'approved' ||
      doc.invoice_state === 'draft' ||
      (!doc.export_available && !doc.zugferd_available)
    )
      notFound()
    return { context, doc, data: recordSchema.parse(doc.reviewed_data) }
  } catch (error) {
    if (error instanceof DocumentError && [403, 404].includes(error.status)) notFound()
    throw error
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ format?: string }>
}) {
  await requireCustomer(await getLocale())
  const { id } = await params
  const { format } = await searchParams
  const { context, doc, data } = await deliveryDocument(id)
  return (
    <InvoiceDeliveryWorkspace
      key={`${context.organizationId}:${id}`}
      id={id}
      organizationId={context.organizationId}
      number={data.documentNumber}
      recipient={data.recipient.companyName || data.recipient.name}
      recipientEmail={data.recipient.email}
      canSend={canApprove(context.role)}
      pdf={doc.zugferd_available}
      xml={doc.export_available}
      preferredFormat={format === 'zugferd' || format === 'xrechnung' ? format : undefined}
    />
  )
}
