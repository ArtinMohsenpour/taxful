'use client'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { DocumentActions } from '@/components/documents/document-actions'
import { InvoiceEmailPanel } from './email'
import { InvoiceDeliverySteps } from './delivery-steps'

export function InvoiceDeliveryWorkspace({
  id,
  organizationId,
  number,
  recipient,
  recipientEmail,
  canSend,
  pdf,
  xml,
  preferredFormat,
}: {
  id: string
  organizationId: string
  number: string
  recipient: string
  recipientEmail: string
  canSend: boolean
  pdf: boolean
  xml: boolean
  preferredFormat?: 'zugferd' | 'xrechnung'
}) {
  const t = useTranslations('InvoiceEmail'),
    router = useRouter()
  return (
    <div className="space-y-6">
      <Link href="/portal/files?workflow=outgoing" className="text-sm text-brand-ink underline">
        {t('backFiles')}
      </Link>
      <header className="space-y-3">
        <h1 className="text-3xl font-medium">{t('deliveryTitle')}</h1>
        <p className="text-muted-foreground">{t('deliveryIntro')}</p>
      </header>
      <InvoiceDeliverySteps step={3} />
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold break-words">{number}</h2>
            <p className="text-sm break-words text-muted-foreground">{recipient}</p>
          </div>
          <Link href={'/portal/files/' + id} className="text-sm text-brand-ink underline">
            {t('viewInvoice')}
          </Link>
        </div>
        <DocumentActions
          wrap
          id={id}
          name={number}
          sourceAvailable={false}
          exportAvailable={xml}
          zugferdAvailable={pdf}
          canDelete={false}
          busy={false}
          onDeleted={() => {}}
        />
        <InvoiceEmailPanel
          key={`${organizationId}:${id}`}
          documentId={id}
          organizationId={organizationId}
          recipientEmail={recipientEmail}
          number={number}
          canSend={canSend}
          preferredFormat={preferredFormat}
          onAccepted={async () => router.refresh()}
        />
      </section>
    </div>
  )
}
