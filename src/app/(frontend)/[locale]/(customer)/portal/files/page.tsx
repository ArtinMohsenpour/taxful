import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { requireCustomer } from '@/lib/customer-auth/session'
import { documentContext } from '@/lib/documents/access'
import { DocumentError } from '@/lib/documents/config'
import { WorkspaceForm } from '@/components/customer-auth/workspace-form'
import { DocumentList } from '@/components/documents/document-list'

export default async function Page() {
  await requireCustomer(await getLocale())
  const t = await getTranslations('Documents')
  let organizationId: string | undefined
  try {
    organizationId = (await documentContext(await headers())).organizationId
  } catch (error) {
    if (!(error instanceof DocumentError && error.code === 'companyRequired')) throw error
  }
  return (
    <div>
      <h1 className="mb-3 text-3xl font-medium tracking-tight">{t('files')}</h1>
      <p className="mb-8 text-muted-foreground">{t('filesIntro')}</p>
      {organizationId ? (
        <DocumentList key={organizationId} upload={false} />
      ) : (
        <section className="rounded-3xl border border-border bg-surface p-6">
          <p className="mb-6 text-muted-foreground">{t('workspaceRequired')}</p>
          <WorkspaceForm />
        </section>
      )}
    </div>
  )
}
