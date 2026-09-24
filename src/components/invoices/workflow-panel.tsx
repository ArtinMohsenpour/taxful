'use client'
import { useRef, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { buttonClass } from '@/components/customer-auth/auth-form'
import type { DocumentRecord } from '@/lib/documents/schema'
import type { invoiceMessages } from '../../../messages/invoices'
import type { InputValidation } from '@/lib/documents/import-validation'
type Key = keyof typeof invoiceMessages.en
export function InvoiceWorkflowPanel({
  id,
  organizationId,
  workflow,
  state,
  status,
  data,
  canApprove,
  onChanged,
  validation,
}: {
  id: string
  organizationId: string
  workflow: string
  state: string
  status: string
  data: DocumentRecord | null
  canApprove: boolean
  onChanged: () => Promise<void>
  validation?: InputValidation | null
}) {
  const t = useTranslations('Invoices'),
    d = useTranslations('Documents')
  const router = useRouter()
  const creationKeys = useRef<Record<string, string>>({})
  async function createRelated(invoiceKind: 'credit_note' | 'correction' | 'final') {
    setPending(true)
    setError('')
    try {
      const requestKey = (creationKeys.current[invoiceKind] ||= crypto.randomUUID())
      const response = await fetch('/api/invoices/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, requestKey, invoiceKind, sourceInvoiceId: id }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      router.push('/portal/files/' + body.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'genericError')
      setPending(false)
    }
  }
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [checked, setChecked] = useState(false)
  async function update(action: string) {
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/invoices/' + id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, action }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      await onChanged()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'genericError')
    } finally {
      setPending(false)
    }
  }
  if (workflow === 'outgoing' && state === 'draft') return null
  return (
    <section className="space-y-4 rounded-3xl border border-primary/30 bg-primary/10 p-6">
      {error && (
        <p role="alert" className="text-error">
          {t(t.has(error as Key) ? (error as Key) : 'genericError')}
        </p>
      )}
      {workflow === 'unclassified' ? (
        <>
          <h2 className="font-semibold">{t('unclassified')}</h2>
          <p className="text-sm text-muted-foreground">{t('classifyHint')}</p>
          <div className="flex flex-wrap gap-3">
            {(['incoming', 'outgoing'] as const).map((action) => (
              <button
                key={action}
                disabled={pending || !canApprove}
                onClick={() => void update(action)}
                className={buttonClass}
              >
                {t(action === 'incoming' ? 'classifyIncoming' : 'classifyOutgoing')}
              </button>
            ))}
          </div>
        </>
      ) : workflow === 'incoming' ? (
        <>
          <p className="text-sm leading-relaxed">{t('incomingHint')}</p>
          {validation && (
            <div
              className={`space-y-3 rounded-2xl border p-4 ${validation.valid ? 'border-primary/40 bg-surface' : 'border-error/30 bg-error/5'}`}
            >
              <p role="status" className="font-semibold">
                {t(validation.valid ? 'structuredValid' : 'structuredInvalid')}
              </p>
              <p className="text-xs text-muted-foreground">
                {validation.format} · {validation.validator}
              </p>
              <p className="text-sm leading-relaxed">{t('structuredHint')}</p>
              {!validation.valid && (
                <p className="text-sm text-error">{t('inputInvoiceInvalid')}</p>
              )}
              {validation.issues.length > 0 && (
                <ul className="list-inside list-disc space-y-2 text-xs break-words">
                  {validation.issues.map((issue, i) => (
                    <li key={i}>
                      {issue.code}:{' '}
                      {t.has(issue.message as Key) ? t(issue.message as Key) : issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <h2 className="font-semibold">{t('summary')}</h2>
          {data && <p className="text-sm font-medium">{t(data.invoiceKind || 'standard')}</p>}
          {data ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ['documentNumber', data.documentNumber],
                ['documentDate', data.documentDate],
                ['issuer', data.issuer.companyName || data.issuer.name],
                ['grossAmount', data.grossAmount + ' ' + data.currency],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground">
                    {d(key as 'documentNumber' | 'documentDate' | 'issuer' | 'grossAmount')}
                  </dt>
                  <dd className="mt-1 break-words">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>{t('noData')}</p>
          )}
          {data && (
            <details className="rounded-xl border border-border bg-surface p-4">
              <summary className="cursor-pointer text-sm font-semibold">{d('details')}</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(['issuer', 'recipient'] as const).map((side) => (
                  <div key={side} className="text-sm">
                    <h3 className="mb-2 font-semibold">{d(side)}</h3>
                    {[
                      data[side].companyName,
                      data[side].name,
                      data[side].address,
                      [data[side].postalCode, data[side].city, data[side].country]
                        .filter(Boolean)
                        .join(' '),
                      data[side].vatId,
                      data[side].taxNumber,
                    ]
                      .filter(Boolean)
                      .map((value, i) => (
                        <p key={i} className="break-words">
                          {value}
                        </p>
                      ))}
                  </div>
                ))}
              </div>
              <div className="mt-5 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">{d('description')}</th>
                      <th className="p-2">{d('quantity')}</th>
                      <th className="p-2 text-right">{d('netAmount')}</th>
                      <th className="p-2">{t('taxCategory')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2">
                          {line.description}
                          {(['allowances', 'charges'] as const).map((kind) =>
                            line[kind]?.map((item, n) => (
                              <p key={kind + n} className="mt-1 text-xs text-muted-foreground">
                                {t(kind)}: {item.amount} {data.currency} · {item.reason}
                              </p>
                            )),
                          )}
                        </td>
                        <td className="p-2">
                          {line.quantity} {line.unitCode}
                        </td>
                        <td className="p-2 text-right tabular-nums">{line.netAmount}</td>
                        <td className="p-2">
                          {t(line.taxCategory || 'S')} · {line.taxRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                {(['netAmount', 'taxAmount', 'grossAmount'] as const).map((key) => (
                  <div key={key}>
                    <dt className="text-xs text-muted-foreground">{d(key)}</dt>
                    <dd className="text-sm font-medium">
                      {data[key]} {data.currency}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 space-y-3 text-sm">
                {data.periodStart && (
                  <p>
                    {t('periodStart')}: {data.periodStart} · {data.periodEnd}
                  </p>
                )}
                {data.precedingInvoices?.map((ref, i) => (
                  <p key={i}>
                    {t('precedingInvoices')}: {ref.number} · {ref.date}
                  </p>
                ))}
                {(['allowances', 'charges'] as const).map((kind) =>
                  data[kind]?.map((item, i) => (
                    <p key={kind + i}>
                      {t(kind)}: {item.amount} {data.currency} · {item.reason} ·{' '}
                      {t(item.taxCategory || 'S')} {item.taxRate}%
                    </p>
                  )),
                )}
                {data.prepaidAmount && (
                  <p>
                    {t('prepaidAmount')}: {data.prepaidAmount} {data.currency}
                  </p>
                )}
                {data.taxExemptionReason && (
                  <p>
                    {t('taxExemptionReason')}: {data.taxExemptionReason}
                  </p>
                )}
                {data.reverseChargeReason && (
                  <p>
                    {t('reverseChargeReason')}: {data.reverseChargeReason}
                  </p>
                )}
                {data.invoiceNote && (
                  <p className="break-words whitespace-pre-wrap">{data.invoiceNote}</p>
                )}
              </div>
            </details>
          )}
          {status === 'approved' ? (
            <p role="status" className="font-semibold text-brand-ink">
              {t('receivedReviewed')}
            </p>
          ) : (
            ['needs_review', 'unsupported'].includes(status) &&
            (!validation || validation.valid) && (
              <>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="size-4 accent-brand-ink"
                  />
                  {t('checkOriginal')}
                </label>
                <button
                  disabled={pending || !checked || !canApprove}
                  className={buttonClass}
                  onClick={() => void update('received_reviewed')}
                >
                  {t('markReviewed')}
                </button>
              </>
            )
          )}
        </>
      ) : (
        <>
          <h2 className="font-semibold">{t(state as 'issued' | 'sent' | 'paid')}</h2>
          <p className="text-sm">{t('issuedHint')}</p>
          {data?.invoiceKind !== 'credit_note' && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">{t('relatedHelp')}</p>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    'credit_note',
                    'correction',
                    ...(['partial', 'prepayment'].includes(data?.invoiceKind || '')
                      ? ['final' as const]
                      : []),
                  ] as const
                ).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={pending}
                    className="rounded-xl border border-border bg-surface px-4 py-2 text-sm"
                    onClick={() => void createRelated(kind)}
                  >
                    {t(
                      kind === 'credit_note'
                        ? 'createCredit'
                        : kind === 'correction'
                          ? 'createCorrection'
                          : 'createFinal',
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {state !== 'paid' && (
            <>
              <p className="text-xs text-muted-foreground">{t('trackingHint')}</p>
              <div className="flex flex-wrap gap-3">
                {state === 'issued' && (
                  <button
                    disabled={pending || !canApprove}
                    onClick={() => void update('sent')}
                    className={buttonClass}
                  >
                    {t('markSent')}
                  </button>
                )}
                <button
                  disabled={pending || !canApprove}
                  onClick={() => void update('paid')}
                  className="rounded-full border border-border px-5 py-3 text-sm"
                >
                  {t('markPaid')}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
