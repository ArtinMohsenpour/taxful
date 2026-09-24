import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { requireCustomer } from '@/lib/customer-auth/session'
import { documentContext } from '@/lib/documents/access'
import { DocumentError } from '@/lib/documents/config'
import { WorkspaceForm } from '@/components/customer-auth/workspace-form'
import { DocumentList } from '@/components/documents/document-list'
import { Link } from '@/i18n/navigation'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ workflow?: string }>
}) {
  await requireCustomer(await getLocale())
  const t = await getTranslations('Documents')
  const invoices = await getTranslations('Invoices')
  const requested = (await searchParams).workflow
  const workflow = requested === 'incoming' || requested === 'unclassified' ? requested : 'outgoing'
  let organizationId: string | undefined
  try {
    organizationId = (await documentContext(await headers())).organizationId
  } catch (error) {
    if (!(error instanceof DocumentError && error.code === 'companyRequired')) throw error
  }
  return (
    <div>
      <h1 className="mb-3 text-3xl font-medium tracking-tight">{t('files')}</h1>
      <p className="mb-6 text-muted-foreground">{invoices('filesIntro')}</p>
      <nav
        aria-label={invoices('fileSections')}
        className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-2"
      >
        {(['outgoing', 'incoming', 'unclassified'] as const).map((direction) => (
          <Link
            key={direction}
            href={'/portal/files?workflow=' + direction}
            aria-current={workflow === direction ? 'page' : undefined}
            className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium transition-colors ${workflow === direction ? 'bg-primary/20 text-brand-ink' : 'text-muted-foreground hover:bg-accent'}`}
          >
            {invoices(direction === 'unclassified' ? 'unassigned' : direction)}
          </Link>
        ))}
      </nav>
      {organizationId ? (
        <DocumentList key={organizationId + workflow} upload={false} workflow={workflow} />
      ) : (
        <section className="rounded-3xl border border-border bg-surface p-6">
          <p className="mb-6 text-muted-foreground">{t('workspaceRequired')}</p>
          <WorkspaceForm />
        </section>
      )}
    </div>
  )
}
