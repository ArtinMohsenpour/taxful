import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { requireCustomer } from '@/lib/customer-auth/session'
import { documentContext } from '@/lib/documents/access'
import { canManageCompany } from '@/lib/documents/company-profile'
import { DocumentError } from '@/lib/documents/config'
import { WorkspaceForm } from '@/components/customer-auth/workspace-form'
import { DocumentList } from '@/components/documents/document-list'
import { InvoiceDirectory } from '@/components/invoices/directory'
import { CreateInvoiceDraft } from '@/components/invoices/create-draft'
import { directory } from '@/lib/invoices/service'
import { Link } from '@/i18n/navigation'
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  await requireCustomer(await getLocale())
  const { section } = await params
  if (!['new', 'incoming', 'outgoing', 'customers', 'products'].includes(section)) notFound()
  const selected = section as 'new' | 'incoming' | 'outgoing' | 'customers' | 'products'
  const t = await getTranslations('Invoices')
  let context
  try {
    context = await documentContext(await headers())
  } catch (error) {
    if (!(error instanceof DocumentError && error.code === 'companyRequired')) throw error
  }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-medium tracking-tight">{t(selected)}</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">{t(`${selected}Intro`)}</p>
      </header>
      {!context ? (
        <WorkspaceForm />
      ) : selected === 'new' ? (
        <CreateInvoiceDraft
          key={context.organizationId}
          organizationId={context.organizationId}
          customers={await directory(context, 'customers')}
          products={await directory(context, 'products')}
        />
      ) : selected === 'customers' || selected === 'products' ? (
        <InvoiceDirectory
          key={context.organizationId + selected}
          organizationId={context.organizationId}
          kind={selected}
          items={await directory(context, selected)}
          canManage={canManageCompany(context.role)}
        />
      ) : (
        <>
          {selected === 'outgoing' && (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/portal/invoices/new"
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                {t('new')}
              </Link>
              <Link
                href="/portal/converter"
                className="rounded-full border border-border px-5 py-3 text-sm"
              >
                {t('importDraft')}
              </Link>
            </div>
          )}
          <DocumentList
            key={context.organizationId + selected}
            upload={selected === 'incoming'}
            workflow={selected}
          />
        </>
      )}
    </div>
  )
}
