import { headers } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { requireCustomer } from '@/lib/customer-auth/session'
import { documentContext } from '@/lib/documents/access'
import { getDocument } from '@/lib/documents/service'
import { documentId } from '@/lib/documents/http'
import { DocumentError } from '@/lib/documents/config'
import { DocumentReview } from '@/components/documents/document-review'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireCustomer(await getLocale())
  const { id } = await params
  try {
    await getDocument(await documentContext(await headers()), documentId(id))
  } catch (error) {
    if (error instanceof DocumentError && [403, 404].includes(error.status)) notFound()
    throw error
  }
  return <DocumentReview id={id} />
}
