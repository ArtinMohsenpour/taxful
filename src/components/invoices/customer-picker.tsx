'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { WorkspaceSelect } from '@/components/customer-auth/workspace-select'
import type { DirectoryEntry, InvoiceCustomer } from '@/lib/invoices/schema'
import type { DocumentRecord } from '@/lib/documents/schema'
import { Link } from '@/i18n/navigation'
export function InvoiceCustomerPicker({
  organizationId,
  disabled,
  onSelect,
}: {
  organizationId: string
  disabled: boolean
  onSelect: (party: DocumentRecord['recipient']) => void
}) {
  const t = useTranslations('Invoices')
  const [items, setItems] = useState<DirectoryEntry<InvoiceCustomer>[]>([]),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/invoices/customers', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error()
        const body = await response.json()
        setItems(body.items)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
    return () => controller.abort()
  }, [organizationId])
  return (
    <div className="mb-5 space-y-2 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <WorkspaceSelect
        label={t('selectCustomer')}
        disabled={disabled}
        value={selected}
        options={[
          { value: '', label: t('customerManual') },
          ...items.map((item) => ({ value: item.id, label: item.data.companyName })),
        ]}
        onChange={(id) => {
          setSelected(id)
          const item = items.find((item) => item.id === id)
          if (item) onSelect({ ...item.data, taxId: '', country: item.data.country || 'DE' })
        }}
      />
      <p className="text-xs text-muted-foreground">{t('customerReplaceHint')}</p>
      {error && (
        <p role="alert" className="text-xs text-error">
          {t('genericError')}
        </p>
      )}
      <Link href="/portal/invoices/customers" className="text-xs text-brand-ink underline">
        {t('directoryLink')}
      </Link>
    </div>
  )
}
