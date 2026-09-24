'use client'
import {
  adjustedLineNet,
  priceForLineNet,
  netFromGrossLine,
  lineAmounts,
  netFromGrossPrice,
  normalizeDecimalInput,
} from '@/lib/documents/invoice-calculation'
import Decimal from 'decimal.js'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { inputClass, buttonClass } from '@/components/customer-auth/auth-form'
import { WorkspaceSelect } from '@/components/customer-auth/workspace-select'
import { Icon } from '@/components/customer-auth/icon'
import { DocumentProgress } from './document-progress'
import { ProcessingNotice, type ProcessingHealth } from './processing-notice'
import { DocumentActions } from './document-actions'
import {
  recordSchema,
  validateRecord,
  reviewWarnings,
  type DocumentRecord,
  type Evidence,
} from '@/lib/documents/schema'
import {
  fillCompanyDetails,
  matchingCompanySide,
  type CompanyInvoiceProfile,
} from '@/lib/documents/company-profile-schema'
import { calculateInvoice } from '@/lib/documents/invoice-calculation'
import { applyReviewDefaults } from '@/lib/documents/review-defaults'
import { invoiceRequirements } from '@/lib/documents/invoice-requirements'
import type { documentMessages } from '../../../messages/documents'
import { InvoiceWorkflowPanel } from '@/components/invoices/workflow-panel'
import {
  InvoiceCoverageFields,
  LineCoverageFields,
  AdjustmentFields,
} from '@/components/invoices/coverage-fields'
import type { invoiceMessages } from '../../../messages/invoices'
import type { InputValidation } from '@/lib/documents/import-validation'
import { InvoiceCustomerPicker } from '@/components/invoices/customer-picker'
type Key = keyof typeof documentMessages.en
type Detail = {
  inputValidation: InputValidation | null
  canManageCustomers: boolean
  savedCustomerId: string | null
  organizationId: string
  workflow: 'incoming' | 'outgoing' | 'unclassified'
  sourceKind: 'manual' | 'upload'
  invoiceState: 'draft' | 'issued' | 'sent' | 'paid'
  companyProfile: CompanyInvoiceProfile | null
  health: ProcessingHealth
  activity: { event: string; createdAt: string; stage: string | null; code: string | null }[]
  id: string
  name: string
  mime: string
  status: Key
  error: string
  text: string | null
  pages: number | null
  data: DocumentRecord | null
  evidence: Evidence
  warnings: string[]
  revision: number
  scanned: boolean
  attempts: number
  approvedAt: string | null
  stage: string
  method: string | null
  exportState: string
  zugferdAvailable: boolean
  classification: { kind: string; confidence: string } | null
  exportIssues: { code: string; message: string; field?: string }[]
  exportAvailable: boolean
  canDelete: boolean
}
const blankConfirm = { identity: false, dates: false, amounts: false, completeness: false }
const partyFields = ['companyName', 'address', 'postalCode', 'city', 'country'] as const
const lineFields = ['description', 'quantity', 'unitCode', 'unitPrice', 'taxRate'] as const

export function DocumentReview({ id }: { id: string }) {
  const router = useRouter()
  const t = useTranslations('Documents')
  const invoices = useTranslations('Invoices')
  const [doc, setDoc] = useState<Detail | null>(null),
    [data, setData] = useState<DocumentRecord | null>(null)
  const [canApprove, setCanApprove] = useState(false),
    [pending, setPending] = useState(false),
    [dirty, setDirty] = useState(false)
  const [format, setFormat] = useState<'zugferd' | 'xrechnung'>('zugferd')
  const [busyAction, setBusyAction] = useState('')
  const [defaulted, setDefaulted] = useState<string[]>([])
  const [prefilled, setPrefilled] = useState<string[]>([])
  const [approvalAttempted, setApprovalAttempted] = useState(false)
  const [saveCustomer, setSaveCustomer] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState(blankConfirm),
    [exportIssues, setExportIssues] = useState<{ code: string; message: string; field?: string }[]>(
      [],
    )
  const load = useCallback(
    async (signal?: AbortSignal, preserveDraft = false) => {
      const response = await fetch('/api/documents/' + id + '/detail', {
        cache: 'no-store',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
          : AbortSignal.timeout(10000),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setDoc(body.document)
      setExportIssues(body.document.exportIssues || [])
      if (!preserveDraft) {
        let next = body.document.data ? recordSchema.parse(body.document.data) : null
        let filled: string[] = []
        const profile = body.document.companyProfile as CompanyInvoiceProfile | null
        if (
          next &&
          profile &&
          body.document.status === 'needs_review' &&
          body.document.workflow === 'outgoing'
        ) {
          const side = matchingCompanySide(next, profile)
          if (side) {
            const result = fillCompanyDetails(next, profile, side)
            next = result.data
            filled = result.filled
          }
        }
        const defaults =
          next && body.document.status === 'needs_review' && body.document.workflow === 'outgoing'
            ? applyReviewDefaults(next)
            : null
        if (defaults) next = defaults.data
        setDefaulted(defaults?.fields || [])
        setData(next)
        setPrefilled(filled)
        setDirty(filled.length > 0 || !!defaults?.fields.length)
      }
      setCanApprove(body.canApprove)
    },
    [id],
  )
  useEffect(() => {
    const controller = new AbortController()
    // State changes only after the asynchronous network request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal).catch((error) => {
      if (error.name !== 'AbortError') setError(error.message)
    })
    return () => controller.abort()
  }, [load])
  const status = doc?.status
  const exportState = doc?.exportState
  useEffect(() => {
    if (!status || (!['queued', 'processing'].includes(status) && exportState !== 'generating'))
      return
    const controller = new AbortController()
    const timer = setInterval(
      () =>
        void load(controller.signal, status === 'approved').catch((error) => {
          if (error.name !== 'AbortError') setError('genericError')
        }),
      4000,
    )
    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [status, exportState, load])
  const edit = (next: DocumentRecord) => {
    if (doc?.invoiceState !== 'draft' || doc.workflow !== 'outgoing') return
    const amounts = doc.sourceKind === 'manual' ? calculateInvoice(next) : null
    setData(
      amounts
        ? { ...next, netAmount: amounts.net, taxAmount: amounts.tax, grossAmount: amounts.gross }
        : next,
    )
    setDirty(true)
    setConfirm(blankConfirm)
    setApprovalAttempted(false)
    setMessage('')
    setExportIssues([])
  }
  async function action(kind: 'review' | 'retry' | 'export' | 'zugferd', approve = false) {
    if (approve) {
      setApprovalAttempted(true)
      if (missingFields.length) {
        focusField(missingFields[0])
        return
      }
      if (!Object.values(confirm).every(Boolean)) {
        document.getElementById('review-confirmations')?.scrollIntoView({ block: 'center' })
        return
      }
    }
    setBusyAction(kind === 'review' ? (approve ? 'approving' : 'savingReview') : kind)
    setPending(true)
    setError('')
    setMessage('')
    setExportIssues([])
    if (kind === 'export' || kind === 'zugferd') setExporting(true)
    try {
      const response = await fetch('/api/documents/' + id + '/' + kind, {
        method: 'POST',
        signal: AbortSignal.timeout(kind === 'review' ? 15000 : 90000),
        headers: { 'Content-Type': 'application/json' },
        body:
          kind === 'review'
            ? JSON.stringify({
                data,
                revision: doc?.revision,
                approve,
                confirmations: confirm,
                saveCustomer: approve && saveCustomer,
              })
            : undefined,
      })
      const body = await response.json()
      if (!response.ok) {
        if (body.issues) {
          setExportIssues(body.issues)
          if (kind === 'export' || kind === 'zugferd') await load()
          return
        }
        throw new Error(body.error)
      }
      if (kind === 'export' || kind === 'zugferd') {
        const download = document.createElement('a')
        download.href = '/api/documents/' + id + '/' + kind
        download.download = kind === 'zugferd' ? 'zugferd.pdf' : 'xrechnung.xml'
        document.body.appendChild(download)
        download.click()
        download.remove()
        await load()
        return
      }
      await load()
      setDirty(false)
      setConfirm(blankConfirm)
      setApprovalAttempted(false)
      setSaveCustomer(false)
      setMessage(kind === 'review' ? (approve ? 'reviewApproved' : 'saved') : '')
    } catch (error) {
      setError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'requestTimedOut'
          : error instanceof Error
            ? error.message
            : 'genericError',
      )
    } finally {
      setPending(false)
      setBusyAction('')
      setExporting(false)
    }
  }
  function field(label: Key, value: string, path: string, onChange: (value: string) => void) {
    const evidence = doc?.evidence.find((item) => item.field === path)
    const invalid = missingFields.includes(path)
    const reverseCharge = [
      ...(data?.lines || []),
      ...(data?.allowances || []),
      ...(data?.charges || []),
    ].some((line) => line.taxCategory === 'AE')
    const oneOf = [
      'issuer.vatId',
      'issuer.taxNumber',
      'paymentTerms',
      'dueDate',
      'supplyDate',
    ].includes(path)
    const required =
      !oneOf &&
      !['netAmount', 'taxAmount', 'unitPrice'].includes(label) &&
      ([
        'documentNumber',
        'documentDate',
        'supplyDate',
        'currency',
        'netAmount',
        'taxAmount',
        'grossAmount',
        'bankAccount',
      ].includes(path) ||
        /^lines\./.test(path) ||
        (path === 'recipient.vatId' && reverseCharge) ||
        /^(issuer|recipient)\.(companyName|address|postalCode|city|country)$/.test(path) ||
        (format === 'xrechnung' &&
          [
            'buyerReference',
            'issuer.name',
            'issuer.email',
            'issuer.phone',
            'recipient.email',
          ].includes(path)))
    return (
      <div className="block space-y-2 text-sm font-medium" key={path}>
        <span className="flex items-center justify-between gap-2">
          <span>
            <label htmlFor={'field-' + path}>{t(label)}</label>{' '}
            <span className="text-xs text-muted-foreground">
              {t(
                ['netAmount', 'taxAmount', 'unitPrice'].includes(label)
                  ? 'calculatedMark'
                  : oneOf
                    ? 'oneOfMark'
                    : required
                      ? 'requiredMark'
                      : 'optionalMark',
              )}
            </span>
          </span>
          {evidence?.confidence === 'low' && (
            <span className="text-xs text-muted-foreground">{t('low')}</span>
          )}
        </span>
        {label === 'unitCode' ? (
          <WorkspaceSelect
            triggerId={'field-' + path}
            label={t('unitCode')}
            hideLabel
            value={value}
            invalid={invalid}
            disabled={
              pending ||
              doc?.invoiceState !== 'draft' ||
              (path === 'documentNumber' && doc?.sourceKind === 'manual')
            }
            options={[
              { value: '', label: t('chooseUnit') },
              ...['C62', 'H87', 'HUR', 'DAY', 'MON', 'KGM', 'MTR', 'LTR', 'MTK'].map((code) => ({
                value: code,
                label: t(('unit' + code) as Key),
              })),
              ...(value &&
              !['C62', 'H87', 'HUR', 'DAY', 'MON', 'KGM', 'MTR', 'LTR', 'MTK'].includes(value)
                ? [{ value, label: value }]
                : []),
            ]}
            onChange={onChange}
          />
        ) : (
          <input
            id={'field-' + path}
            aria-invalid={invalid}
            aria-required={required}
            aria-describedby={invalid ? 'error-' + path : undefined}
            type={['documentDate', 'supplyDate', 'dueDate'].includes(label) ? 'date' : 'text'}
            value={value}
            maxLength={
              [
                'quantity',
                'unitPrice',
                'netAmount',
                'taxAmount',
                'grossAmount',
                'taxRate',
                'documentDate',
              ].includes(label)
                ? 30
                : label === 'currency'
                  ? 10
                  : label === 'country'
                    ? 100
                    : label === 'label'
                      ? 150
                      : 1000
            }
            onChange={(event) =>
              onChange(
                [
                  'quantity',
                  'unitPrice',
                  'netAmount',
                  'taxAmount',
                  'grossAmount',
                  'taxRate',
                ].includes(label)
                  ? normalizeDecimalInput(event.target.value)
                  : event.target.value,
              )
            }
            disabled={pending || (path === 'documentNumber' && doc?.sourceKind === 'manual')}
            className={`${inputClass} ${invalid ? 'border-error focus:border-error' : ''}`}
          />
        )}
        {invalid && (
          <span id={'error-' + path} className="block text-xs text-error">
            {issues.find((issue) => issue.field === path)
              ? issueMessage(issues.find((issue) => issue.field === path)!.code)
              : path === 'supplyDate'
                ? invoices('serviceDateHelp')
                : t(
                    oneOf
                      ? path.startsWith('issuer.')
                        ? 'supplierIdHint'
                        : 'paymentEither'
                      : 'fieldMissing',
                  )}
          </span>
        )}
        {defaulted.includes(path) && (
          <span className="block text-xs text-brand-ink">{t('fromDefaults')}</span>
        )}
        {prefilled.includes(path) && (
          <span className="block text-xs text-brand-ink">{t('fromCompany')}</span>
        )}
        {evidence && (
          <span className="block text-xs font-normal text-muted-foreground">
            {evidence.page ? t('page', { page: evidence.page }) + ' · ' : ''}
            {evidence.quote}
          </span>
        )}
      </div>
    )
  }
  const fieldName = (path: string) =>
    path
      .split('.')
      .map((part) =>
        /^\d+$/.test(part)
          ? String(Number(part) + 1)
          : t.has(part as Key)
            ? t(part as Key)
            : invoices.has(part as never)
              ? invoices(part as never)
              : part,
      )
      .join(' · ')
  const issues = data ? validateRecord(data) : []
  const profileIssues = data
    ? invoiceRequirements(data, format).filter(
        (field) => !issues.some((issue) => issue.field === field),
      )
    : []
  const calculated = data ? calculateInvoice(data) : null
  const rows = data ? lineAmounts(data) : []
  const missingFields = [...new Set([...issues.map((issue) => issue.field), ...profileIssues])]
  function focusField(path: string) {
    const element =
      document.getElementById('field-' + path) ||
      (path === 'paymentMeansCode'
        ? document.querySelector<HTMLElement>('[data-payment-method] button')
        : document.getElementById('review-missing'))
    if (!element) return
    if (element instanceof HTMLDetailsElement) element.open = true
    let parent = element.parentElement
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true
      parent = parent.parentElement
    }
    element.scrollIntoView({ block: 'center' })
    element.focus()
  }
  function prefill(side: 'issuer' | 'recipient') {
    if (!data || !doc?.companyProfile) return
    const profile = doc.companyProfile
    if (
      data[side].vatId &&
      profile.vatId &&
      data[side].vatId.replace(/\s/g, '').toUpperCase() !==
        profile.vatId.replace(/\s/g, '').toUpperCase()
    ) {
      setError('companyMismatch')
      return
    }
    const result = fillCompanyDetails(data, profile, side)
    edit(result.data)
    setPrefilled([...new Set([...prefilled, ...result.filled])])
    setMessage(result.filled.length ? 'companyApplied' : 'companyNothingToFill')
  }
  const warningCodes = data ? reviewWarnings(data) : []
  const issueMessage = (code: string) =>
    t(
      (
        { currency: 'currencyError', taxId: 'taxIdError', vatId: 'vatIdError' } as Record<
          string,
          Key
        >
      )[code] || (t.has(code as Key) ? (code as Key) : 'genericError'),
    )
  return (
    <div className="review-sections space-y-4">
      <Link href="/portal/files" className="text-sm text-brand-ink underline">
        {t('back')}
      </Link>
      {error && (
        <p role="alert" className="rounded-2xl bg-error/5 p-4 text-sm text-error">
          {invoices.has(error as keyof typeof invoiceMessages.en)
            ? invoices(error as keyof typeof invoiceMessages.en)
            : t(t.has(error as Key) ? (error as Key) : 'genericError')}
        </p>
      )}
      {!doc ? (
        <p>{t('loading')}</p>
      ) : (
        <>
          <header>
            <p className="mb-3 text-xs font-semibold text-brand-ink">{t(doc.status)}</p>
            <h1 className="text-2xl font-medium break-words">{doc.name}</h1>
          </header>
          <section className="relative rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="pr-10">
              <DocumentProgress
                manual={doc.sourceKind === 'manual'}
                incoming={doc.workflow === 'incoming'}
                status={doc.status}
                stage={doc.stage}
                exported={(doc.exportAvailable || doc.zugferdAvailable) && !exporting}
                exportState={exporting ? 'generating' : doc.exportState}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-brand-ink">
              <DocumentActions
                id={id}
                name={doc.name}
                sourceAvailable={doc.scanned && doc.status !== 'rejected'}
                exportAvailable={doc.exportAvailable}
                zugferdAvailable={doc.zugferdAvailable}
                canDelete={doc.canDelete}
                busy={pending || doc.status === 'processing' || doc.exportState === 'generating'}
                onDeleted={() => router.replace('/portal/files')}
              />
            </div>
          </section>
          <InvoiceWorkflowPanel
            id={id}
            organizationId={doc.organizationId}
            workflow={doc.workflow}
            state={doc.invoiceState}
            status={doc.status}
            data={data}
            validation={doc.inputValidation}
            canApprove={canApprove}
            onChanged={load}
          />
          {doc.sourceKind === 'manual' && (
            <p className="text-xs text-muted-foreground">{invoices('numberHint')}</p>
          )}
          {['queued', 'processing'].includes(doc.status) && (
            <ProcessingNotice health={doc.health} />
          )}
          {doc.activity?.length > 0 && (
            <details className="rounded-2xl border border-border bg-surface p-5">
              <summary className="cursor-pointer text-sm font-semibold">
                {t('processingActivity')}
              </summary>
              <ol className="mt-4 space-y-3 text-sm">
                {doc.activity.map((item, index) => (
                  <li
                    key={index}
                    className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"
                  >
                    <span>
                      {t(
                        item.event === 'processing_failed'
                          ? 'failed'
                          : item.event === 'extracted'
                            ? 'needs_review'
                            : item.event === 'classified_unsupported'
                              ? 'unsupported'
                              : item.stage === 'extracting'
                                ? 'processing'
                                : t.has(item.stage as Key)
                                  ? (item.stage as Key)
                                  : 'processing',
                      )}
                      {item.code && (
                        <span className="ml-2 text-error">
                          {invoices.has(item.code as keyof typeof invoiceMessages.en)
                            ? invoices(item.code as keyof typeof invoiceMessages.en)
                            : t(t.has(item.code as Key) ? (item.code as Key) : 'genericError')}
                        </span>
                      )}
                    </span>
                    <time dateTime={item.createdAt} className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: 'Europe/Berlin',
                      }).format(new Date(item.createdAt))}
                    </time>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {['queued', 'processing'].includes(doc.status) && (
            <p role="status" className="rounded-2xl bg-primary/10 p-6">
              {t('waiting')}
            </p>
          )}
          {['failed', 'rejected'].includes(doc.status) && (
            <section className="rounded-2xl border border-border p-6">
              <p className="mb-4">
                {invoices.has(doc.error as keyof typeof invoiceMessages.en)
                  ? invoices(doc.error as keyof typeof invoiceMessages.en)
                  : t(t.has(doc.error as Key) ? (doc.error as Key) : 'extractionFailed')}
              </p>
              {doc.status === 'failed' && doc.attempts < 3 && (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">{t('retryHint')}</p>
                  <button
                    disabled={pending}
                    aria-busy={pending}
                    className={`${buttonClass.replace('disabled:cursor-wait', pending ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed')} ${pending ? 'cursor-wait' : 'cursor-pointer'}`}
                    onClick={() => action('retry')}
                  >
                    {t('retry')}
                  </button>
                </>
              )}
            </section>
          )}
          {(doc.status === 'unsupported' || (data && data.documentType !== 'invoice')) && (
            <section className="space-y-4 rounded-3xl border border-primary/30 bg-primary/10 p-6">
              <h2 className="text-xl font-semibold">{t('notInvoiceTitle')}</h2>
              <p className="text-sm leading-relaxed">
                {t(
                  data?.documentType === 'wage_tax_certificate' ||
                    doc.classification?.kind === 'wage_tax_certificate'
                    ? 'wageHint'
                    : 'nonInvoiceHint',
                )}
              </p>
              <p className="text-xs text-muted-foreground">{t('originalKept')}</p>
              {doc.status === 'unsupported' && doc.attempts < 3 && (
                <button
                  disabled={pending}
                  aria-busy={pending}
                  className={`${buttonClass.replace('disabled:cursor-wait', pending ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed')} ${pending ? 'cursor-wait' : 'cursor-pointer'}`}
                  onClick={() => action('retry')}
                >
                  {t('recheck')}
                </button>
              )}
            </section>
          )}
          {data &&
            doc.workflow === 'outgoing' &&
            data.documentType === 'invoice' &&
            ['needs_review', 'approved'].includes(doc.status) && (
              <div className="review-sections space-y-4">
                {doc.sourceKind === 'upload' && (
                  <details
                    open
                    className="rounded-3xl border border-border bg-surface p-5 [&[open]>summary>.section-chevron]:rotate-180"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                      <h2 className="font-semibold">{t('original')}</h2>
                      <Icon
                        name="chevron"
                        className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                      />
                    </summary>
                    <div className="mt-4 flex justify-end">
                      {doc.scanned && (
                        <a
                          href={'/api/documents/' + id + '/source'}
                          className="text-sm text-brand-ink underline"
                        >
                          {t('downloadSource')}
                        </a>
                      )}
                    </div>
                    {doc.scanned && doc.mime.startsWith('image/') && (
                      <div className="mt-5 overflow-auto rounded-xl bg-background">
                        {/* Original bytes are never embedded. This is a scanned, normalized raster preview. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={'/api/documents/' + id + '/preview'}
                          alt={doc.name}
                          className="mx-auto max-h-96 max-w-full object-contain"
                        />
                      </div>
                    )}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-brand-ink">
                        {t('sourceText')}
                      </summary>
                      <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-background p-4 text-xs leading-relaxed whitespace-pre-wrap">
                        {doc.text || t('noText')}
                      </pre>
                    </details>
                  </details>
                )}
                <fieldset
                  disabled={doc.invoiceState !== 'draft'}
                  className="review-sections min-w-0 space-y-4"
                >
                  {(doc.warnings.length > 0 || warningCodes.length > 0) && (
                    <details
                      open
                      className="rounded-2xl border border-primary/30 bg-primary/10 p-5 [&[open]>summary>.section-chevron]:rotate-180"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                        <h2 className="font-semibold">{t('warnings')}</h2>
                        <Icon
                          name="chevron"
                          className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                        />
                      </summary>
                      <ul className="list-inside list-disc space-y-2 text-sm">
                        {doc.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                        {warningCodes.map((code) => (
                          <li key={code}>{t(code as Key)}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <header>
                    <h2 className="text-xl font-semibold">{t('review')}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {doc.sourceKind === 'manual' ? invoices('manualReview') : t('reviewIntro')}
                    </p>
                  </header>
                  <details
                    open
                    className="space-y-3 rounded-2xl border border-primary/30 bg-primary/10 p-5 [&[open]>summary>.section-chevron]:rotate-180"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                      <h3 className="font-semibold">{t('useCompany')}</h3>
                      <Icon
                        name="chevron"
                        className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                      />
                    </summary>
                    <p className="text-sm text-muted-foreground">{t('prefillHint')}</p>
                    {doc.companyProfile && (
                      <dl className="grid gap-x-5 gap-y-3 rounded-xl bg-surface p-4 text-sm sm:grid-cols-2">
                        {Object.entries(doc.companyProfile)
                          .filter(([, value]) => value)
                          .map(([key, value]) => (
                            <div key={key}>
                              <dt className="text-xs text-muted-foreground">{t(key as Key)}</dt>
                              <dd className="mt-1 font-medium break-words">{value}</dd>
                            </div>
                          ))}
                      </dl>
                    )}
                    {doc.companyProfile && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          disabled={pending}
                          className="rounded-full border border-border px-4 py-2 text-sm"
                          onClick={() => prefill('issuer')}
                        >
                          {t('companyIsSupplier')}
                        </button>
                        <button
                          disabled={pending}
                          className="rounded-full border border-border px-4 py-2 text-sm"
                          onClick={() => prefill('recipient')}
                        >
                          {t('companyIsBuyer')}
                        </button>
                      </div>
                    )}
                    <Link
                      href="/portal/profile#company"
                      className="text-sm text-brand-ink underline"
                    >
                      {t('companySettings')}
                    </Link>
                    {prefilled.length > 0 && (
                      <p className="text-sm text-brand-ink">{t('companyApplied')}</p>
                    )}
                  </details>
                  {missingFields.length > 0 && (
                    <details
                      open
                      id="review-missing"
                      tabIndex={-1}
                      className="rounded-2xl border border-error/30 bg-error/5 p-5 [&[open]>summary>.section-chevron]:rotate-180"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                        <h3 className="font-semibold">
                          {t('missingCount', { count: missingFields.length })}
                        </h3>
                        <Icon
                          name="chevron"
                          className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                        />
                      </summary>
                      <p className="my-2 text-sm">{t('missingHint')}</p>
                      <ul className="flex flex-wrap gap-2">
                        {missingFields.map((path) => (
                          <li key={path}>
                            <button
                              type="button"
                              className="rounded-full border border-error/20 px-3 py-2 text-sm underline"
                              onClick={() => focusField(path)}
                            >
                              {fieldName(path)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <details
                    open
                    className="space-y-5 rounded-3xl border border-border bg-surface p-5 sm:p-6 [&[open]>summary>.section-chevron]:rotate-180"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                      <h3 className="font-semibold">{t('details')}</h3>
                      <Icon
                        name="chevron"
                        className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                      />
                    </summary>
                    <div className="grid gap-5 sm:grid-cols-3">
                      {(['documentNumber', 'documentDate', 'currency'] as const).map((key) =>
                        field(key, data[key], key, (value) =>
                          edit({
                            ...data,
                            [key]: value,
                            ...(key === 'documentDate' &&
                            (!data.supplyDate || data.supplyDate === data.documentDate)
                              ? { supplyDate: value }
                              : {}),
                          }),
                        ),
                      )}
                    </div>
                    <InvoiceCoverageFields data={data} onChange={edit} missing={missingFields} />
                    <WorkspaceSelect
                      label={t('targetFormat')}
                      value={format}
                      disabled={pending}
                      options={[
                        { value: 'zugferd', label: 'ZUGFeRD · PDF + XML' },
                        { value: 'xrechnung', label: 'XRechnung · XML' },
                      ]}
                      onChange={(value) => setFormat(value as typeof format)}
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(format === 'zugferd' ? 'zugferdHint' : 'xrechnungHint')}
                    </p>
                  </details>
                  {(['issuer', 'recipient'] as const).map((side) => (
                    <details
                      open
                      key={side}
                      className="rounded-3xl border border-border bg-surface p-5 sm:p-6 [&[open]>summary>.section-chevron]:rotate-180"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                        <h3 className="font-semibold">{t(side)}</h3>
                        <Icon
                          name="chevron"
                          className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                        />
                      </summary>
                      {side === 'recipient' && doc.invoiceState === 'draft' && (
                        <InvoiceCustomerPicker
                          key={doc.organizationId}
                          organizationId={doc.organizationId}
                          disabled={pending}
                          onSelect={(recipient) => {
                            edit({ ...data, recipient })
                            setSaveCustomer(false)
                          }}
                        />
                      )}
                      <div className="grid gap-5 sm:grid-cols-2">
                        {partyFields.map((key) =>
                          field(key, data[side][key], side + '.' + key, (value) =>
                            edit({ ...data, [side]: { ...data[side], [key]: value } }),
                          ),
                        )}
                      </div>
                      {side === 'issuer' ? (
                        <div className="mt-5 space-y-3">
                          <p className="text-xs text-muted-foreground">{t('supplierIdHint')}</p>
                          <div className="grid gap-5 sm:grid-cols-2">
                            {(['vatId', 'taxNumber'] as const).map((key) =>
                              field(key, data[side][key], side + '.' + key, (value) =>
                                edit({ ...data, [side]: { ...data[side], [key]: value } }),
                              ),
                            )}
                          </div>
                        </div>
                      ) : (
                        <details
                          open={
                            [
                              ...data.lines,
                              ...(data.allowances || []),
                              ...(data.charges || []),
                            ].some((line) => line.taxCategory === 'AE') || undefined
                          }
                          className="mt-5"
                        >
                          <summary className="cursor-pointer text-sm text-brand-ink">
                            {[
                              ...data.lines,
                              ...(data.allowances || []),
                              ...(data.charges || []),
                            ].some((line) => line.taxCategory === 'AE')
                              ? t('vatId')
                              : t('optionalBuyerVat')}
                          </summary>
                          <div className="mt-4">
                            {field('vatId', data.recipient.vatId, 'recipient.vatId', (value) =>
                              edit({ ...data, recipient: { ...data.recipient, vatId: value } }),
                            )}
                          </div>
                        </details>
                      )}
                      {side === 'recipient' &&
                        doc.canManageCustomers &&
                        doc.invoiceState === 'draft' && (
                          <label className="mt-4 flex items-start gap-3 rounded-xl bg-primary/10 p-4 text-sm">
                            <input
                              type="checkbox"
                              className="mt-1 size-4 shrink-0 accent-primary"
                              checked={saveCustomer}
                              disabled={pending}
                              onChange={(event) => {
                                setSaveCustomer(event.target.checked)
                                setDirty(true)
                              }}
                            />
                            {invoices('saveCustomer')}
                          </label>
                        )}
                      {side === 'recipient' && doc.savedCustomerId && !dirty && (
                        <p className="mt-3 text-xs text-brand-ink">{invoices('customerSaved')}</p>
                      )}
                    </details>
                  ))}
                  <details
                    open
                    className="space-y-5 rounded-3xl border border-border bg-surface p-5 sm:p-6 [&[open]>summary>.section-chevron]:rotate-180"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                      <h3 className="font-semibold">{t('amounts')}</h3>
                      <Icon
                        name="chevron"
                        className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                      />
                    </summary>
                    <div className="grid grid-cols-3 gap-3">
                      {(['netAmount', 'taxAmount', 'grossAmount'] as const).map((key) =>
                        field(key, data[key], key, (value) => {
                          const rates = [...new Set(data.lines.map((line) => line.taxRate))]
                          const derived =
                            key === 'grossAmount' && rates.length === 1
                              ? netFromGrossLine('1', value, rates[0])
                              : null
                          edit({
                            ...data,
                            [key]: value,
                            ...(derived
                              ? {
                                  netAmount: derived.netAmount,
                                  taxAmount: new Decimal(value).minus(derived.netAmount).toFixed(2),
                                }
                              : {}),
                          })
                        }),
                      )}
                    </div>
                    {calculated && (
                      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
                        <h4 className="font-semibold">{t('calculatedTotals')}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{t('calculatedHint')}</p>
                        <ul className="my-3 space-y-1">
                          {calculated.breakdown.map((group) => (
                            <li key={group.category + ':' + group.rate}>
                              {invoices(group.category as 'S' | 'Z' | 'E' | 'AE')} · {group.net} ×{' '}
                              {group.rate}% = {group.tax} {data.currency}
                            </li>
                          ))}
                        </ul>
                        <p>
                          {t('taxAmount')}:{' '}
                          <strong>
                            {calculated.tax} {data.currency}
                          </strong>{' '}
                          · {t('grossAmount')}:{' '}
                          <strong>
                            {calculated.gross} {data.currency}
                          </strong>
                        </p>
                        {missingFields.includes('taxAmount') && (
                          <p className="mt-2 text-error">{t('taxMismatchHint')}</p>
                        )}
                        <p>
                          {invoices(
                            data.invoiceKind === 'credit_note' ? 'creditAmount' : 'payableAmount',
                          )}
                          :{' '}
                          <strong>
                            {calculated.payable} {data.currency}
                          </strong>
                        </p>
                        {doc.sourceKind !== 'manual' && (
                          <>
                            <p className="text-xs text-muted-foreground">
                              {invoices('importedTotalsHelp')}
                            </p>
                            <button
                              type="button"
                              disabled={pending}
                              className="rounded-xl border border-border px-3 py-2 text-xs font-medium"
                              onClick={() =>
                                edit({
                                  ...data,
                                  netAmount: calculated.net,
                                  taxAmount: calculated.tax,
                                  grossAmount: calculated.gross,
                                })
                              }
                            >
                              {invoices('calculateTotals')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {data.lines.map((line, index) => (
                      <div key={index} className="space-y-4 rounded-2xl border border-border p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {lineFields.map((key) =>
                            field(key, line[key], 'lines.' + index + '.' + key, (value) =>
                              edit({
                                ...data,
                                lines: data.lines.map((row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        [key]: value,
                                        ...(['quantity', 'unitPrice'].includes(key)
                                          ? {
                                              netAmount:
                                                adjustedLineNet({ ...row, [key]: value }) ??
                                                row.netAmount,
                                            }
                                          : {}),
                                      }
                                    : row,
                                ),
                              }),
                            ),
                          )}
                        </div>
                        <LineCoverageFields
                          line={line}
                          index={index}
                          missing={missingFields}
                          onChange={(next) =>
                            edit({
                              ...data,
                              lines: data.lines.map((row, i) => (i === index ? next : row)),
                            })
                          }
                        />
                        <div className="grid grid-cols-3 gap-3">
                          {field(
                            'netAmount',
                            line.netAmount,
                            'lines.' + index + '.netAmount',
                            (value) =>
                              edit({
                                ...data,
                                lines: data.lines.map((row, i) =>
                                  i === index ? { ...row, netAmount: value } : row,
                                ),
                              }),
                          )}
                          <div className="space-y-2 text-sm font-medium">
                            <span>
                              {t('taxAmount')}{' '}
                              <span className="text-xs text-muted-foreground">
                                {t('calculatedMark')}
                              </span>
                            </span>
                            <input
                              readOnly
                              aria-label={t('taxAmount')}
                              value={rows[index]?.tax || ''}
                              className={inputClass + ' w-full min-w-0'}
                            />
                          </div>
                          <div className="space-y-2 text-sm font-medium">
                            <label htmlFor={'line-gross-' + index}>
                              {t('grossAmount')}{' '}
                              <span className="text-xs text-muted-foreground">
                                {t('requiredMark')}
                              </span>
                            </label>
                            <input
                              id={'line-gross-' + index}
                              key={rows[index]?.gross || 'empty'}
                              defaultValue={rows[index]?.gross || ''}
                              inputMode="decimal"
                              aria-required="true"
                              disabled={pending}
                              className={inputClass + ' w-full min-w-0'}
                              onBlur={(event) => {
                                const value = normalizeDecimalInput(event.target.value)
                                const next = netFromGrossLine(line.quantity, value, line.taxRate)
                                if (!next) {
                                  edit({
                                    ...data,
                                    lines: data.lines.map((row, i) =>
                                      i === index ? { ...row, netAmount: '', unitPrice: '' } : row,
                                    ),
                                  })
                                  return
                                }
                                if (next)
                                  edit({
                                    ...data,
                                    lines: data.lines.map((row, i) =>
                                      i === index
                                        ? {
                                            ...row,
                                            ...next,
                                            unitPrice:
                                              priceForLineNet(row, next.netAmount) ??
                                              next.unitPrice,
                                          }
                                        : row,
                                    ),
                                  })
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('unitHelp')}</p>
                        <p className="text-xs text-muted-foreground">{t('netPriceHelp')}</p>
                        <button
                          type="button"
                          disabled={
                            pending ||
                            !!line.allowances?.length ||
                            !!line.charges?.length ||
                            (!!line.priceBaseQuantity && line.priceBaseQuantity !== '1') ||
                            !netFromGrossPrice(line.quantity, line.unitPrice, line.taxRate)
                          }
                          className="rounded-xl border border-border px-3 py-2 text-sm text-brand-ink disabled:opacity-40"
                          onClick={() => {
                            const converted = netFromGrossPrice(
                              line.quantity,
                              line.unitPrice,
                              line.taxRate,
                            )
                            if (converted)
                              edit({
                                ...data,
                                lines: data.lines.map((row, i) =>
                                  i === index ? { ...row, ...converted } : row,
                                ),
                              })
                          }}
                        >
                          {t('convertGrossPrice')}
                        </button>
                        <button
                          disabled={pending}
                          onClick={() =>
                            edit({ ...data, lines: data.lines.filter((_, i) => i !== index) })
                          }
                          className="text-xs text-muted-foreground underline"
                        >
                          {t('remove')} {index + 1}
                        </button>
                      </div>
                    ))}
                    <button
                      disabled={pending || data.lines.length >= 200}
                      onClick={() =>
                        edit({
                          ...data,
                          lines: [
                            ...data.lines,
                            {
                              description: '',
                              quantity: '',
                              unitCode: '',
                              unitPrice: '',
                              netAmount: '',
                              taxRate: '',
                            },
                          ],
                        })
                      }
                      className="text-sm font-semibold text-brand-ink"
                    >
                      {t('addLine')}
                    </button>
                    <div className="space-y-4 border-t border-border pt-5">
                      <h3 className="font-semibold">{invoices('allowances')}</h3>
                      <p className="text-xs text-muted-foreground">{invoices('adjustmentHelp')}</p>
                      <AdjustmentFields
                        items={data.allowances || []}
                        path="allowances"
                        document
                        missing={missingFields}
                        onChange={(allowances) => edit({ ...data, allowances })}
                      />
                      <h3 className="font-semibold">{invoices('charges')}</h3>
                      <AdjustmentFields
                        items={data.charges || []}
                        path="charges"
                        document
                        missing={missingFields}
                        onChange={(charges) => edit({ ...data, charges })}
                      />
                    </div>
                  </details>
                  <details
                    open
                    className="space-y-5 rounded-3xl border border-border bg-surface p-5 sm:p-6 [&[open]>summary>.section-chevron]:rotate-180"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                      <h3 className="font-semibold">{t('paymentDetails')}</h3>
                      <Icon
                        name="chevron"
                        className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                      />
                    </summary>
                    <p className="text-xs text-muted-foreground">{t('paymentHint')}</p>
                    <div data-payment-method>
                      <WorkspaceSelect
                        label={t('paymentMeansCode') + ' ' + t('requiredMark')}
                        value={data.paymentMeansCode}
                        disabled={pending}
                        options={[
                          { value: '', label: t('selectPayment') },
                          { value: '10', label: t('cash') },
                          { value: '58', label: t('bankTransfer') },
                        ]}
                        onChange={(value) => edit({ ...data, paymentMeansCode: value })}
                      />
                      {missingFields.includes('paymentMeansCode') && (
                        <p className="mt-2 text-xs text-error">{t('fieldMissing')}</p>
                      )}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {field('paymentTerms', data.paymentTerms, 'paymentTerms', (value) =>
                        edit({ ...data, paymentTerms: value }),
                      )}
                      {field('dueDate', data.dueDate, 'dueDate', (value) =>
                        edit({ ...data, dueDate: value }),
                      )}
                      {data.paymentMeansCode === '58' &&
                        field('bankAccount', data.bankAccount, 'bankAccount', (value) =>
                          edit({ ...data, bankAccount: value }),
                        )}
                    </div>
                  </details>
                  {format === 'xrechnung' && (
                    <details
                      open
                      className="space-y-5 rounded-3xl border border-primary/30 bg-surface p-5 sm:p-6 [&[open]>summary>.section-chevron]:rotate-180"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                        <h3 className="font-semibold">{t('xrechnungDetails')}</h3>
                        <Icon
                          name="chevron"
                          className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                        />
                      </summary>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t('routingHint')}
                      </p>
                      <WorkspaceSelect
                        label={t('buyerType')}
                        value={data.buyerType}
                        disabled={pending}
                        options={[
                          { value: 'business', label: t('business') },
                          { value: 'public', label: t('public') },
                        ]}
                        onChange={(value) =>
                          edit({ ...data, buyerType: value as DocumentRecord['buyerType'] })
                        }
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        {field(
                          data.buyerType === 'public' ? 'leitwegId' : 'buyerReference',
                          data.buyerReference,
                          'buyerReference',
                          (value) => edit({ ...data, buyerReference: value }),
                        )}
                        {field('supplierContact', data.issuer.name, 'issuer.name', (value) =>
                          edit({ ...data, issuer: { ...data.issuer, name: value } }),
                        )}
                        {field('supplierEmail', data.issuer.email, 'issuer.email', (value) =>
                          edit({ ...data, issuer: { ...data.issuer, email: value } }),
                        )}
                        {field('supplierPhone', data.issuer.phone, 'issuer.phone', (value) =>
                          edit({ ...data, issuer: { ...data.issuer, phone: value } }),
                        )}
                        {field('buyerEmail', data.recipient.email, 'recipient.email', (value) =>
                          edit({ ...data, recipient: { ...data.recipient, email: value } }),
                        )}
                      </div>
                    </details>
                  )}
                  <details className="rounded-2xl border border-border p-5">
                    <summary className="cursor-pointer font-semibold">
                      <span>{t('evidence')}</span>
                      <Icon
                        name="chevron"
                        className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                      />
                    </summary>
                    <p className="my-4 text-xs text-muted-foreground">{t('evidenceHint')}</p>
                    <ul className="max-h-80 space-y-3 overflow-auto text-xs">
                      {doc.evidence
                        .filter(
                          (item) =>
                            !item.field.includes('taxId') &&
                            !item.field.includes('additionalFields'),
                        )
                        .map((item, index) => (
                          <li key={index}>
                            <strong>{fieldName(item.field)}</strong> · {t(item.confidence)}
                            {item.page ? ' · ' + t('page', { page: item.page }) : ''}
                            <p className="mt-1 text-muted-foreground">{item.quote}</p>
                          </li>
                        ))}
                    </ul>
                  </details>
                  {(issues.length > 0 || profileIssues.length > 0) && (
                    <details
                      open
                      className="rounded-2xl border border-error/20 p-5 [&[open]>summary>.section-chevron]:rotate-180"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                        <h3 className="font-medium">{t('validation')}</h3>
                        <Icon
                          name="chevron"
                          className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                        />
                      </summary>
                      <ul className="space-y-2 text-sm">
                        {profileIssues.map((path) => (
                          <li key={path}>
                            {fieldName(path)}: {t('exportIncomplete')}
                          </li>
                        ))}
                        {issues.map((issue, index) => (
                          <li key={index}>
                            {fieldName(issue.field)}: {issueMessage(issue.code)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <details
                    open
                    id="review-confirmations"
                    className="space-y-5 rounded-3xl border border-border bg-surface p-6 [&[open]>summary>.section-chevron]:rotate-180"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                      <h3 className="font-semibold">{t('confirmTitle')}</h3>
                      <Icon
                        name="chevron"
                        className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                      />
                    </summary>
                    {(Object.keys(confirm) as (keyof typeof confirm)[]).map((key) => (
                      <label key={key} className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={confirm[key]}
                          disabled={pending || !canApprove}
                          onChange={(event) =>
                            setConfirm({ ...confirm, [key]: event.target.checked })
                          }
                          className="mt-1 size-4 shrink-0 accent-primary"
                        />
                        {key === 'completeness' && doc.sourceKind === 'manual'
                          ? invoices('manualConfirm')
                          : t(key === 'amounts' ? 'amountsConfirm' : key)}
                      </label>
                    ))}
                    {missingFields.length > 0 && (
                      <p className="text-sm text-error">
                        {t('missingCount', { count: missingFields.length })}
                      </p>
                    )}
                    {approvalAttempted &&
                      (dirty || doc.status !== 'approved') &&
                      !Object.values(confirm).every(Boolean) && (
                        <p role="alert" className="text-sm text-error">
                          {t('confirmMissing')}
                        </p>
                      )}
                    {!canApprove && (
                      <p className="text-xs text-muted-foreground">{t('approvalRole')}</p>
                    )}
                    {message && (
                      <p
                        role="status"
                        className="rounded-xl border border-primary/30 bg-primary/15 px-4 py-3 text-sm font-medium text-brand-ink"
                      >
                        {t(message as Key)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        disabled={pending}
                        onClick={() => action('review')}
                        className="rounded-full border border-border px-5 py-3 text-sm font-semibold disabled:opacity-50"
                      >
                        {t(busyAction === 'savingReview' ? 'savingReview' : 'save')}
                      </button>
                      <button
                        disabled={pending || !canApprove || (doc.status === 'approved' && !dirty)}
                        onClick={() => action('review', true)}
                        aria-busy={pending}
                        className={`${buttonClass.replace('disabled:cursor-wait', pending ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed')} ${pending ? 'cursor-wait' : 'cursor-pointer'}`}
                      >
                        {t(
                          busyAction === 'approving'
                            ? 'approving'
                            : doc.status === 'approved' && !dirty
                              ? 'approved'
                              : 'approve',
                        )}
                      </button>
                    </div>
                  </details>
                </fieldset>
                <details
                  open
                  className="space-y-4 rounded-3xl border border-primary/20 bg-primary/10 p-6 [&[open]>summary>.section-chevron]:rotate-180"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink [&::-webkit-details-marker]:hidden">
                    <h3 className="flex items-center gap-3 font-semibold">
                      <Icon name="converter" />
                      {t('exportTitle')}
                    </h3>
                    <Icon
                      name="chevron"
                      className="section-chevron transition-transform duration-200 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t('exportHint')}</p>
                  {doc.invoiceState === 'draft' && (
                    <p className="rounded-xl border border-primary/30 bg-surface/50 p-3 text-sm text-brand-ink">
                      {invoices('issueNotice')}
                    </p>
                  )}
                  {doc.invoiceState !== 'draft' && (
                    <WorkspaceSelect
                      label={t('targetFormat')}
                      value={format}
                      disabled={pending}
                      options={[
                        { value: 'zugferd', label: 'ZUGFeRD · PDF + XML' },
                        { value: 'xrechnung', label: 'XRechnung · XML' },
                      ]}
                      onChange={(value) => setFormat(value as typeof format)}
                    />
                  )}
                  {exportIssues.length > 0 && (
                    <ul role="alert" className="space-y-2 text-sm">
                      {exportIssues.map((issue, index) => (
                        <li key={index}>
                          {fieldName(issue.code)}:{' '}
                          {t.has(issue.message as Key) ? t(issue.message as Key) : issue.message}
                          {issue.field && (
                            <button
                              onClick={() => focusField(issue.field!)}
                              className="ml-2 underline"
                            >
                              {fieldName(issue.field)}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    disabled={pending || dirty || doc.status !== 'approved' || !canApprove}
                    onClick={() => action(format === 'zugferd' ? 'zugferd' : 'export')}
                    aria-busy={pending}
                    className={`${buttonClass.replace('disabled:cursor-wait', pending ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed')} ${pending ? 'cursor-wait' : 'cursor-pointer'}`}
                  >
                    {t(exporting ? 'working' : format === 'zugferd' ? 'exportZugferd' : 'export')}
                  </button>
                  {(dirty || doc.status !== 'approved') && (
                    <p className="text-xs">{t('exportPending')}</p>
                  )}
                  <p className="text-xs leading-relaxed text-muted-foreground">{t('exportNote')}</p>
                </details>
              </div>
            )}
        </>
      )}
    </div>
  )
}
