'use client'
import { useTranslations } from 'next-intl'
import Decimal from 'decimal.js'
import type { DocumentRecord } from '@/lib/documents/schema'
import { invoiceKinds, taxCategories, type InvoiceAdjustment } from '@/lib/documents/invoice-types'
import {
  normalizeDecimalInput,
  numericAmount,
  adjustedLineNet,
} from '@/lib/documents/invoice-calculation'
import { WorkspaceSelect } from '@/components/customer-auth/workspace-select'
import { inputClass } from '@/components/customer-auth/auth-form'
import type { coverageMessages } from '../../../messages/invoice-coverage'
type Key = keyof typeof coverageMessages.en
const smallButton =
  'rounded-xl border border-border px-3 py-2 text-xs font-medium text-brand-ink transition-colors hover:bg-primary/10 disabled:opacity-50'

function Input({
  label,
  path,
  value,
  onChange,
  missing,
  type = 'text',
}: {
  label: string
  path: string
  value: string
  onChange: (value: string) => void
  missing: string[]
  type?: string
}) {
  const t = useTranslations('Invoices')
  const invalid = missing.includes(path)
  return (
    <label className="block space-y-2 text-sm">
      <span>{label}</span>
      <input
        id={'field-' + path}
        value={value}
        type={type}
        maxLength={type === 'date' ? 10 : 1000}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'error-' + path : undefined}
        className={`${inputClass} w-full min-w-0 ${invalid ? 'border-error' : ''}`}
      />
      {invalid && (
        <span id={'error-' + path} className="block text-xs text-error">
          {t('coverageRequired')}
        </span>
      )}
    </label>
  )
}
export function AdjustmentFields({
  items,
  onChange,
  path,
  document,
  missing,
}: {
  items: InvoiceAdjustment[]
  onChange: (items: InvoiceAdjustment[]) => void
  path: string
  document: boolean
  missing: string[]
}) {
  const t = useTranslations('Invoices')
  const charge = path.endsWith('charges')
  function update(index: number, key: keyof InvoiceAdjustment, value: string) {
    onChange(
      items.map((item, i) => {
        if (i !== index) return item
        const next = { ...item, [key]: value }
        if (key === 'taxCategory' && value !== 'S') next.taxRate = '0'
        if (
          (key === 'baseAmount' || key === 'percentage') &&
          numericAmount(next.baseAmount) &&
          numericAmount(next.percentage)
        )
          next.amount = new Decimal(next.baseAmount).times(next.percentage).div(100).toFixed(2)
        return next
      }),
    )
  }
  return (
    <div id={'field-' + path} className="space-y-3" tabIndex={-1}>
      {items.map((item, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(['reason', 'amount', 'percentage', 'baseAmount'] as const).map((key) => (
              <Input
                key={key}
                label={t(
                  (
                    {
                      reason: 'adjustmentReason',
                      amount: 'adjustmentAmount',
                      percentage: 'percentage',
                      baseAmount: 'baseAmount',
                    } as const
                  )[key],
                )}
                path={`${path}.${i}.${key}`}
                value={item[key] || ''}
                missing={missing}
                onChange={(v) => update(i, key, key === 'reason' ? v : normalizeDecimalInput(v))}
              />
            ))}
            {document && (
              <>
                <WorkspaceSelect
                  label={t('taxCategory')}
                  value={item.taxCategory || 'S'}
                  options={taxCategories.map((value) => ({ value, label: t(value) }))}
                  onChange={(v) => update(i, 'taxCategory', v)}
                />
                <Input
                  label={t('taxRate')}
                  path={`${path}.${i}.taxRate`}
                  value={item.taxRate || ''}
                  missing={missing}
                  onChange={(v) => update(i, 'taxRate', normalizeDecimalInput(v))}
                />
              </>
            )}
          </div>
          <button
            type="button"
            className={smallButton}
            onClick={() => onChange(items.filter((_, n) => n !== i))}
          >
            {t('remove')}
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={items.length >= (document ? 50 : 20)}
        className={smallButton}
        onClick={() =>
          onChange([
            ...items,
            {
              amount: '',
              reason: '',
              ...(document ? { taxCategory: 'S' as const, taxRate: '19' } : {}),
            },
          ])
        }
      >
        {t(charge ? 'addCharge' : 'addAllowance')}
      </button>
      {missing.includes(path) && <p className="text-xs text-error">{t('coverageRequired')}</p>}
    </div>
  )
}
export function InvoiceCoverageFields({
  data,
  onChange,
  missing,
}: {
  data: DocumentRecord
  onChange: (data: DocumentRecord) => void
  missing: string[]
}) {
  const t = useTranslations('Invoices')
  const kinds = data.invoiceKind || 'standard'
  const hasCustomServiceDate =
    !!data.periodStart ||
    !!data.periodEnd ||
    (!!data.supplyDate && data.supplyDate !== data.documentDate)
  const showReferences =
    ['credit_note', 'correction', 'final'].includes(kinds) || !!data.precedingInvoices?.length
  const showPayments =
    kinds === 'final' ||
    !!data.advancePayments?.length ||
    (numericAmount(data.prepaidAmount) && new Decimal(data.prepaidAmount).gt(0))
  const input = (key: Key & keyof DocumentRecord, type = 'text') => (
    <Input
      key={key}
      label={t(key)}
      path={key}
      value={String(data[key] || '')}
      missing={missing}
      type={type}
      onChange={(value) =>
        onChange({ ...data, [key]: key === 'prepaidAmount' ? normalizeDecimalInput(value) : value })
      }
    />
  )
  const updatePayments = (advancePayments: NonNullable<DocumentRecord['advancePayments']>) =>
    onChange({
      ...data,
      advancePayments,
      prepaidAmount: advancePayments.every((p) => numericAmount(p.grossAmount))
        ? advancePayments.reduce((sum, p) => sum.plus(p.grossAmount), new Decimal(0)).toFixed(2)
        : data.prepaidAmount,
    })
  return (
    <div className="space-y-5">
      <div id="field-invoiceKind" tabIndex={-1}>
        <WorkspaceSelect
          label={t('invoiceKind')}
          value={kinds}
          options={invoiceKinds.map((value) => ({ value, label: t(value) }))}
          onChange={(value) =>
            onChange({
              ...data,
              invoiceKind: value as DocumentRecord['invoiceKind'],
            })
          }
        />
      </div>
      {['credit_note', 'correction'].includes(kinds) && (
        <p className="text-xs leading-relaxed text-muted-foreground">{t('typeHelp')}</p>
      )}
      {['credit_note', 'correction', 'final'].includes(kinds) && (
        <p className="rounded-xl bg-primary/10 p-3 text-sm">{t('sourceCopyHelp')}</p>
      )}
      {missing.includes('invoiceKind') && (
        <p className="text-xs text-error">{t('coverageRequired')}</p>
      )}
      {kinds === 'prepayment' && (
        <p className="rounded-xl bg-primary/10 p-3 text-sm">{t('prepaymentHelp')}</p>
      )}
      {['credit_note', 'correction'].includes(kinds) && (
        <>
          <Input
            label={t(kinds === 'credit_note' ? 'creditReason' : 'correctionReason')}
            path="invoiceNote"
            value={data.invoiceNote || ''}
            missing={missing}
            onChange={(invoiceNote) => onChange({ ...data, invoiceNote })}
          />
          <p className="text-xs text-muted-foreground">{t('noteHelp')}</p>
        </>
      )}
      <details
        open={
          hasCustomServiceDate ||
          missing.some((path) => ['supplyDate', 'periodStart', 'periodEnd'].includes(path)) ||
          undefined
        }
        className="rounded-xl border border-border p-4"
      >
        <summary className="cursor-pointer text-sm font-medium">
          {t('differentServiceDate')}
        </summary>
        <div className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">{t('serviceDateDefault')}</p>
          <Input
            label={t('serviceDate')}
            path="supplyDate"
            value={data.supplyDate}
            type="date"
            missing={missing}
            onChange={(supplyDate) => onChange({ ...data, supplyDate })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {input('periodStart', 'date')}
            {input('periodEnd', 'date')}
          </div>
          <p className="text-xs text-muted-foreground">{t('serviceDateHelp')}</p>
        </div>
      </details>
      {showReferences && (
        <div
          id="field-precedingInvoices"
          tabIndex={-1}
          className="space-y-3 rounded-xl border border-border p-4"
        >
          <p className="text-sm font-semibold">{t('precedingInvoices')}</p>
          {(data.precedingInvoices || []).map((ref, i) => (
            <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                label={t('referenceNumber')}
                path={`precedingInvoices.${i}.number`}
                value={ref.number}
                missing={missing}
                onChange={(number) =>
                  onChange({
                    ...data,
                    precedingInvoices: data.precedingInvoices!.map((r, n) =>
                      n === i ? { ...r, number } : r,
                    ),
                  })
                }
              />
              <Input
                label={t('referenceDate')}
                path={`precedingInvoices.${i}.date`}
                value={ref.date}
                missing={missing}
                type="date"
                onChange={(date) =>
                  onChange({
                    ...data,
                    precedingInvoices: data.precedingInvoices!.map((r, n) =>
                      n === i ? { ...r, date } : r,
                    ),
                  })
                }
              />
              <button
                type="button"
                className={smallButton}
                onClick={() =>
                  onChange({
                    ...data,
                    precedingInvoices: data.precedingInvoices!.filter((_, n) => n !== i),
                  })
                }
              >
                {t('remove')}
              </button>
            </div>
          ))}
          <button
            type="button"
            className={smallButton}
            disabled={(data.precedingInvoices?.length || 0) >= 50}
            onClick={() =>
              onChange({
                ...data,
                precedingInvoices: [...(data.precedingInvoices || []), { number: '', date: '' }],
              })
            }
          >
            {t('addReference')}
          </button>
          {missing.includes('precedingInvoices') && (
            <p className="text-xs text-error">{t('coverageRequired')}</p>
          )}
        </div>
      )}
      {showPayments && (
        <div
          id="field-advancePayments"
          tabIndex={-1}
          className="space-y-4 rounded-xl border border-border p-4"
        >
          <h4 className="text-sm font-semibold">{t('advancePayments')}</h4>
          <p className="text-xs text-muted-foreground">{t('paymentHelp')}</p>
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium">
            {t('prepaidAmount')}: {data.prepaidAmount || '0.00'} {data.currency}
          </p>
          {(data.advancePayments || []).map((payment, i) => (
            <div key={i} className="space-y-3 rounded-xl bg-background p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  ['invoiceNumber', 'paymentDate', 'netAmount', 'taxAmount', 'grossAmount'] as const
                ).map((key) => (
                  <Input
                    key={key}
                    label={t(
                      (
                        {
                          invoiceNumber: 'referenceNumber',
                          paymentDate: 'paymentDate',
                          netAmount: 'paymentNet',
                          taxAmount: 'paymentTax',
                          grossAmount: 'paymentGross',
                        } as const
                      )[key],
                    )}
                    path={`advancePayments.${i}.${key}`}
                    value={payment[key]}
                    type={key === 'paymentDate' ? 'date' : 'text'}
                    missing={missing}
                    onChange={(value) =>
                      updatePayments(
                        data.advancePayments!.map((p, n) =>
                          n === i
                            ? {
                                ...p,
                                [key]: key.endsWith('Amount')
                                  ? normalizeDecimalInput(value)
                                  : value,
                              }
                            : p,
                        ),
                      )
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                className={smallButton}
                onClick={() => updatePayments(data.advancePayments!.filter((_, n) => n !== i))}
              >
                {t('remove')}
              </button>
            </div>
          ))}
          <button
            type="button"
            className={smallButton}
            disabled={(data.advancePayments?.length || 0) >= 50}
            onClick={() =>
              updatePayments([
                ...(data.advancePayments || []),
                {
                  invoiceNumber: '',
                  paymentDate: '',
                  netAmount: '',
                  taxAmount: '',
                  grossAmount: '',
                },
              ])
            }
          >
            {t('addPayment')}
          </button>
          {missing.includes('advancePayments') && (
            <p className="text-xs text-error">{t('coverageRequired')}</p>
          )}
        </div>
      )}
      {[...data.lines, ...(data.allowances || []), ...(data.charges || [])].some(
        (line) => line.taxCategory === 'E',
      ) && input('taxExemptionReason')}
      {[...data.lines, ...(data.allowances || []), ...(data.charges || [])].some(
        (line) => line.taxCategory === 'AE',
      ) && input('reverseChargeReason')}
    </div>
  )
}
export function LineCoverageFields({
  line,
  index,
  onChange,
  missing,
}: {
  line: DocumentRecord['lines'][number]
  index: number
  onChange: (line: DocumentRecord['lines'][number]) => void
  missing: string[]
}) {
  const t = useTranslations('Invoices')
  const update = (next: typeof line) =>
    onChange({ ...next, netAmount: adjustedLineNet(next) ?? next.netAmount })
  return (
    <details
      open={
        missing.some(
          (path) =>
            path.startsWith(`lines.${index}.allowances`) ||
            path.startsWith(`lines.${index}.charges`) ||
            path === `lines.${index}.priceBaseQuantity`,
        ) || undefined
      }
      className="rounded-xl border border-border p-4"
    >
      <summary className="cursor-pointer text-sm font-medium">{t('advancedLine')}</summary>
      <div className="mt-4 space-y-4">
        <WorkspaceSelect
          label={t('taxCategory')}
          value={line.taxCategory || 'S'}
          options={taxCategories.map((value) => ({ value, label: t(value) }))}
          onChange={(value) =>
            update({
              ...line,
              taxCategory: value as typeof line.taxCategory,
              taxRate: value === 'S' ? (line.taxRate === '0' ? '19' : line.taxRate) : '0',
            })
          }
        />
        <p className="text-xs text-muted-foreground">{t('taxTreatmentHelp')}</p>
        <Input
          label={t('priceBaseQuantity')}
          path={`lines.${index}.priceBaseQuantity`}
          value={line.priceBaseQuantity || '1'}
          missing={missing}
          onChange={(value) => update({ ...line, priceBaseQuantity: normalizeDecimalInput(value) })}
        />
        <p className="text-xs text-muted-foreground">{t('adjustmentHelp')}</p>
        <AdjustmentFields
          items={line.allowances || []}
          path={`lines.${index}.allowances`}
          document={false}
          missing={missing}
          onChange={(allowances) => update({ ...line, allowances })}
        />
        <AdjustmentFields
          items={line.charges || []}
          path={`lines.${index}.charges`}
          document={false}
          missing={missing}
          onChange={(charges) => update({ ...line, charges })}
        />
      </div>
    </details>
  )
}
