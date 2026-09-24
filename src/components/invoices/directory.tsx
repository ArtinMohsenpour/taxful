'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { inputClass, buttonClass } from '@/components/customer-auth/auth-form'
import { WorkspaceSelect } from '@/components/customer-auth/workspace-select'
import { blankCompanyProfile } from '@/lib/documents/company-profile-schema'
import { normalizeDecimalInput } from '@/lib/documents/invoice-calculation'
import type { DirectoryEntry, InvoiceCustomer, InvoiceProduct } from '@/lib/invoices/schema'
import type { invoiceMessages } from '../../../messages/invoices'
type Key = keyof typeof invoiceMessages.en
type Entry = DirectoryEntry<InvoiceCustomer | InvoiceProduct>
export function InvoiceDirectory({
  kind,
  organizationId,
  items: initial,
  canManage,
}: {
  kind: 'customers' | 'products'
  organizationId: string
  items: Entry[]
  canManage: boolean
}) {
  const t = useTranslations('Invoices')
  const [items, setItems] = useState(initial),
    [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Entry | null>(null),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const fresh = () =>
    ({
      id: '',
      revision: 0,
      archived: false,
      data:
        kind === 'customers'
          ? { ...blankCompanyProfile }
          : { description: '', unitCode: 'C62', unitPrice: '', taxRate: '19', currency: 'EUR' },
    }) as Entry
  async function search() {
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/invoices/' + kind + '?q=' + encodeURIComponent(query), {
        cache: 'no-store',
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setItems(body.items)
    } catch {
      setError('genericError')
    } finally {
      setPending(false)
    }
  }
  async function save(entry: Entry, archived = false) {
    setPending(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/invoices/' + kind, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          id: entry.id || undefined,
          revision: entry.revision,
          data: entry.data,
          archived,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setEditing(null)
      setMessage(archived ? 'archived' : 'saved')
      await search()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'genericError')
    } finally {
      setPending(false)
    }
  }
  const fields =
    kind === 'customers'
      ? Object.keys(blankCompanyProfile)
      : ['description', 'unitCode', 'unitPrice', 'taxCategory', 'taxRate']
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void search()
          }}
        >
          <input
            aria-label={t('search')}
            placeholder={t('search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={120}
            className={inputClass}
          />
          <button disabled={pending} className="rounded-xl border border-border px-4 text-sm">
            {t('search')}
          </button>
        </form>
        {canManage && (
          <button
            className={buttonClass}
            onClick={() => {
              setEditing(fresh())
              setMessage('')
            }}
          >
            {t('add')}
          </button>
        )}
      </div>
      {!canManage && <p className="text-sm text-muted-foreground">{t('readonly')}</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-error/5 p-4 text-error">
          {t(t.has(error as Key) ? (error as Key) : 'genericError')}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-primary/15 p-4 text-brand-ink">
          {t(message as Key)}
        </p>
      )}
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void save(editing)
          }}
          className="rounded-3xl border border-border bg-surface p-6"
        >
          <h2 className="mb-5 text-lg font-semibold">{t(editing.id ? 'edit' : 'add')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((key) => {
              const value = String(
                (editing.data as unknown as Record<string, string>)[key] ||
                  (key === 'taxCategory' ? 'S' : ''),
              )
              const update = (value: string) =>
                setEditing({
                  ...editing,
                  data: {
                    ...editing.data,
                    [key]: value,
                    ...(key === 'taxCategory' ? { taxRate: value === 'S' ? '19' : '0' } : {}),
                  },
                })
              if (key === 'unitCode' || key === 'taxRate' || key === 'taxCategory')
                return (
                  <WorkspaceSelect
                    key={key}
                    label={t(key)}
                    value={value}
                    onChange={update}
                    options={
                      key === 'taxCategory'
                        ? (['S', 'Z', 'E', 'AE'] as const).map((value) => ({
                            value,
                            label: t(value),
                          }))
                        : key === 'taxRate'
                          ? [
                              { value: '19', label: '19 %' },
                              { value: '7', label: '7 %' },
                              { value: '0', label: '0 %' },
                            ]
                          : [
                              { value: 'C62', label: t('unit') },
                              { value: 'H87', label: t('piece') },
                              { value: 'HUR', label: t('hour') },
                              { value: 'DAY', label: t('day') },
                              { value: 'MON', label: t('month') },
                            ]
                    }
                  />
                )
              return (
                <label key={key} className="space-y-2 text-sm">
                  <span>
                    {t(key as Key)}
                    {['companyName', 'description', 'unitPrice'].includes(key) ? ' *' : ''}
                  </span>
                  <input
                    className={inputClass}
                    required={['companyName', 'description', 'unitPrice'].includes(key)}
                    type={key === 'email' ? 'email' : 'text'}
                    inputMode={key === 'unitPrice' ? 'decimal' : undefined}
                    maxLength={key === 'description' ? 1000 : 300}
                    value={value}
                    onChange={(e) =>
                      update(
                        key === 'unitPrice'
                          ? normalizeDecimalInput(e.target.value)
                          : e.target.value,
                      )
                    }
                  />
                </label>
              )
            })}
          </div>
          <div className="mt-6 flex gap-3">
            <button disabled={pending} className={buttonClass}>
              {t(pending ? 'saving' : 'save')}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setEditing(null)}
              className="rounded-full border border-border px-5"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
      {!items.length ? (
        <p className="rounded-3xl border border-border bg-surface p-8 text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5"
            >
              <div className="min-w-0">
                <h2 className="font-medium break-words">
                  {'companyName' in entry.data ? entry.data.companyName : entry.data.description}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {'city' in entry.data
                    ? [entry.data.postalCode, entry.data.city].filter(Boolean).join(' ')
                    : `${entry.data.unitPrice} EUR · ${entry.data.taxRate}%`}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-3 text-sm">
                  <button
                    disabled={pending}
                    onClick={() => setEditing(entry)}
                    className="rounded-xl border border-border px-4 py-2"
                  >
                    {t('edit')}
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => void save(entry, true)}
                    className="text-muted-foreground underline"
                  >
                    {t('archive')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{t('limitHint')}</p>
    </div>
  )
}
