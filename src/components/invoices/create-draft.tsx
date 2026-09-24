'use client'
import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { buttonClass } from '@/components/customer-auth/auth-form'
import { WorkspaceSelect } from '@/components/customer-auth/workspace-select'
import type { DirectoryEntry, InvoiceCustomer, InvoiceProduct } from '@/lib/invoices/schema'
import type { invoiceMessages } from '../../../messages/invoices'
import { invoiceKinds } from '@/lib/documents/invoice-types'
export function CreateInvoiceDraft({
  organizationId,
  customers,
  products,
}: {
  organizationId: string
  customers: DirectoryEntry<InvoiceCustomer>[]
  products: DirectoryEntry<InvoiceProduct>[]
}) {
  const t = useTranslations('Invoices'),
    router = useRouter()
  const [customerId, setCustomer] = useState(''),
    [productIds, setProducts] = useState<string[]>([]),
    [pending, setPending] = useState(false),
    [error, setError] = useState('')
  const key = useRef(crypto.randomUUID())
  const [invoiceKind, setInvoiceKind] = useState<(typeof invoiceKinds)[number]>('standard')
  async function create() {
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/invoices/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          requestKey: key.current,
          customerId: customerId || undefined,
          productIds,
          invoiceKind,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      router.push('/portal/files/' + body.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'genericError')
      setPending(false)
    }
  }
  return (
    <section className="space-y-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <WorkspaceSelect
        disabled={pending}
        label={t('invoiceKind')}
        value={invoiceKind}
        options={invoiceKinds.map((value) => ({ value, label: t(value) }))}
        onChange={(value) => {
          setInvoiceKind(value as typeof invoiceKind)
          key.current = crypto.randomUUID()
        }}
      />
      <WorkspaceSelect
        disabled={pending}
        label={t('customer')}
        value={customerId}
        onChange={(value) => {
          setCustomer(value)
          key.current = crypto.randomUUID()
        }}
        options={[
          { value: '', label: t('noCustomer') },
          ...customers.map((item) => ({ value: item.id, label: item.data.companyName })),
        ]}
      />
      <fieldset disabled={pending} className="space-y-3">
        <legend className="mb-3 text-sm font-semibold">{t('chooseProducts')}</legend>
        {products.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm"
          >
            <input
              type="checkbox"
              className="size-4 accent-brand-ink"
              checked={productIds.includes(item.id)}
              onChange={(e) => {
                setProducts(
                  e.target.checked
                    ? [...productIds, item.id]
                    : productIds.filter((id) => id !== item.id),
                )
                key.current = crypto.randomUUID()
              }}
            />
            <span className="flex-1">{item.data.description}</span>
            <span className="text-muted-foreground">{item.data.unitPrice} EUR</span>
          </label>
        ))}
      </fieldset>
      <p className="text-sm leading-relaxed text-muted-foreground">{t('draftHint')}</p>
      {error && (
        <p role="alert" className="rounded-xl bg-error/5 p-4 text-error">
          {t(
            t.has(error as keyof typeof invoiceMessages.en)
              ? (error as keyof typeof invoiceMessages.en)
              : 'genericError',
          )}
        </p>
      )}
      <div className="space-y-3 border-t border-border pt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <button disabled={pending} onClick={create} className={`${buttonClass} min-h-16 w-full`}>
            {t(pending ? 'saving' : 'create')}
          </button>
          <Link
            href="/portal/converter"
            aria-disabled={pending}
            tabIndex={pending ? -1 : undefined}
            onClick={(event) => {
              if (pending) event.preventDefault()
            }}
            className={`flex min-h-16 items-center justify-center gap-3 rounded-2xl border border-primary/50 bg-primary/10 px-5 py-4 text-center text-sm font-semibold text-brand-ink transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink motion-reduce:transition-none ${pending ? 'pointer-events-none opacity-50' : ''}`}
          >
            <span>{t('importDraft')}</span>
            <span className="rounded-full bg-primary/20 px-2.5 py-1 text-xs">
              {t('recommended')}
            </span>
          </Link>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('importRecommendedHint')}
        </p>
      </div>
      <div className="flex flex-wrap gap-5 text-sm text-brand-ink">
        <Link href="/portal/profile#company" className="underline">
          {t('profileLink')}
        </Link>
        <Link href="/portal/invoices/customers" className="underline">
          {t('directoryLink')}
        </Link>
        <Link href="/portal/invoices/outgoing" className="underline">
          {t('viewOutgoing')}
        </Link>
      </div>
    </section>
  )
}
