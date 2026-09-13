'use client'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { inputClass, buttonClass } from '@/components/customer-auth/auth-form'
import { WorkspaceSelect } from '@/components/customer-auth/workspace-select'
import { Icon } from '@/components/customer-auth/icon'
import { DocumentProgress } from './document-progress'
import { DocumentActions } from './document-actions'
import {
  recordSchema,
  validateRecord,
  reviewWarnings,
  type DocumentRecord,
  type Evidence,
} from '@/lib/documents/schema'
import type { documentMessages } from '../../../messages/documents'
type Key = keyof typeof documentMessages.en
type Detail = {
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
  exportAvailable: boolean
  canDelete: boolean
}
const blankConfirm = { identity: false, dates: false, amounts: false, completeness: false }
const partyFields = [
  'name',
  'companyName',
  'taxId',
  'taxNumber',
  'vatId',
  'address',
  'postalCode',
  'city',
  'country',
  'email',
  'phone',
] as const
const lineFields = [
  'description',
  'quantity',
  'unitCode',
  'unitPrice',
  'netAmount',
  'taxRate',
] as const

export function DocumentReview({ id }: { id: string }) {
  const router = useRouter()
  const t = useTranslations('Documents')
  const [doc, setDoc] = useState<Detail | null>(null),
    [data, setData] = useState<DocumentRecord | null>(null)
  const [canApprove, setCanApprove] = useState(false),
    [pending, setPending] = useState(false),
    [dirty, setDirty] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState(blankConfirm),
    [exportIssues, setExportIssues] = useState<{ code: string; message: string }[]>([])
  const load = useCallback(
    async (signal?: AbortSignal, preserveDraft = false) => {
      const response = await fetch('/api/documents/' + id + '/detail', {
        cache: 'no-store',
        signal,
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setDoc(body.document)
      if (!preserveDraft)
        setData(body.document.data ? recordSchema.parse(body.document.data) : null)
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
    setData(next)
    setDirty(true)
    setConfirm(blankConfirm)
    setMessage('')
    setExportIssues([])
  }
  async function action(kind: 'review' | 'retry' | 'export', approve = false) {
    setPending(true)
    setError('')
    setMessage('')
    setExportIssues([])
    if (kind === 'export') setExporting(true)
    try {
      const response = await fetch('/api/documents/' + id + '/' + kind, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:
          kind === 'review'
            ? JSON.stringify({ data, revision: doc?.revision, approve, confirmations: confirm })
            : undefined,
      })
      const body = await response.json()
      if (!response.ok) {
        if (body.issues) {
          setExportIssues(body.issues)
          if (kind === 'export') await load()
          return
        }
        throw new Error(body.error)
      }
      if (kind === 'export') {
        const download = document.createElement('a')
        download.href = '/api/documents/' + id + '/export'
        download.download = 'xrechnung.xml'
        document.body.appendChild(download)
        download.click()
        download.remove()
        await load()
        return
      }
      await load()
      setDirty(false)
      setConfirm(blankConfirm)
      setMessage(kind === 'review' ? 'saved' : '')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'genericError')
    } finally {
      setPending(false)
      setExporting(false)
    }
  }
  function field(label: Key, value: string, path: string, onChange: (value: string) => void) {
    const evidence = doc?.evidence.find((item) => item.field === path)
    return (
      <label className="block space-y-2 text-sm font-medium" key={path}>
        <span className="flex items-center justify-between gap-2">
          {t(label)}
          {evidence?.confidence === 'low' && (
            <span className="text-xs text-muted-foreground">{t('low')}</span>
          )}
        </span>
        <input
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
              : label === 'currency' || label === 'unitCode'
                ? 10
                : label === 'country'
                  ? 100
                  : label === 'label'
                    ? 150
                    : 1000
          }
          onChange={(event) => onChange(event.target.value)}
          disabled={pending}
          className={inputClass}
        />
        {evidence && (
          <span className="block text-xs font-normal text-muted-foreground">
            {evidence.page ? t('page', { page: evidence.page }) + ' · ' : ''}
            {evidence.quote}
          </span>
        )}
      </label>
    )
  }
  const issues = data ? validateRecord(data) : []
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
    <div className="space-y-6">
      <Link href="/portal/files" className="text-sm text-brand-ink underline">
        {t('back')}
      </Link>
      {error && (
        <p role="alert" className="rounded-2xl bg-error/5 p-4 text-sm text-error">
          {t(t.has(error as Key) ? (error as Key) : 'genericError')}
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
          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <DocumentProgress
              status={doc.status}
              stage={doc.stage}
              exported={doc.exportAvailable && !exporting}
              exportState={exporting ? 'generating' : doc.exportState}
            />
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-brand-ink">
              <DocumentActions
                id={id}
                name={doc.name}
                sourceAvailable={doc.scanned && doc.status !== 'rejected'}
                exportAvailable={doc.exportAvailable}
                canDelete={doc.canDelete}
                busy={pending || doc.status === 'processing' || doc.exportState === 'generating'}
                onDeleted={() => router.replace('/portal/files')}
              />
              {doc.scanned && doc.status !== 'rejected' && (
                <a
                  href={'/api/documents/' + id + '/source'}
                  download
                  className="underline underline-offset-4"
                >
                  {t('downloadSource')}
                </a>
              )}
              {doc.exportAvailable && (
                <a
                  href={'/api/documents/' + id + '/export'}
                  download
                  className="underline underline-offset-4"
                >
                  {t('downloadExport')}
                </a>
              )}
            </div>
          </section>
          {['queued', 'processing'].includes(doc.status) && (
            <p role="status" className="rounded-2xl bg-primary/10 p-6">
              {t('waiting')}
            </p>
          )}
          {['failed', 'rejected'].includes(doc.status) && (
            <section className="rounded-2xl border border-border p-6">
              <p className="mb-4">
                {t(t.has(doc.error as Key) ? (doc.error as Key) : 'extractionFailed')}
              </p>
              {doc.status === 'failed' && doc.attempts < 3 && (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">{t('retryHint')}</p>
                  <button
                    disabled={pending}
                    className={buttonClass}
                    onClick={() => action('retry')}
                  >
                    {t('retry')}
                  </button>
                </>
              )}
            </section>
          )}
          {data && (
            <div className="space-y-6">
              <section className="rounded-3xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-semibold">{t('original')}</h2>
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
              </section>
              {(doc.warnings.length > 0 || warningCodes.length > 0) && (
                <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
                  <h2 className="mb-3 font-semibold">{t('warnings')}</h2>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    {doc.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                    {warningCodes.map((code) => (
                      <li key={code}>{t(code as Key)}</li>
                    ))}
                  </ul>
                </section>
              )}
              <header>
                <h2 className="text-xl font-semibold">{t('review')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('reviewIntro')}</p>
              </header>
              <section className="space-y-5 rounded-3xl border border-border bg-surface p-5 sm:p-6">
                <h3 className="font-semibold">{t('details')}</h3>
                <WorkspaceSelect
                  label={t('documentType')}
                  value={data.documentType}
                  disabled={pending}
                  options={(['invoice', 'receipt', 'tax_notice', 'other'] as const).map(
                    (value) => ({ value, label: t(value) }),
                  )}
                  onChange={(value) =>
                    edit({ ...data, documentType: value as DocumentRecord['documentType'] })
                  }
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  {(
                    [
                      'documentNumber',
                      'documentDate',
                      'currency',
                      'buyerReference',
                      'paymentTerms',
                      'bankAccount',
                    ] as const
                  ).map((key) =>
                    field(key, data[key], key, (value) => edit({ ...data, [key]: value })),
                  )}
                </div>
              </section>
              {(['issuer', 'recipient'] as const).map((side) => (
                <section
                  key={side}
                  className="rounded-3xl border border-border bg-surface p-5 sm:p-6"
                >
                  <h3 className="mb-5 font-semibold">{t(side)}</h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {partyFields.map((key) =>
                      field(key, data[side][key], side + '.' + key, (value) =>
                        edit({ ...data, [side]: { ...data[side], [key]: value } }),
                      ),
                    )}
                  </div>
                  <p className="mt-5 text-xs text-muted-foreground">{t('identifierHint')}</p>
                </section>
              ))}
              <section className="space-y-5 rounded-3xl border border-border bg-surface p-5 sm:p-6">
                <h3 className="font-semibold">{t('amounts')}</h3>
                <WorkspaceSelect
                  label={t('paymentMeansCode')}
                  value={data.paymentMeansCode}
                  disabled={pending}
                  options={[
                    { value: '', label: t('selectPayment') },
                    { value: '10', label: t('cash') },
                    { value: '58', label: t('bankTransfer') },
                  ]}
                  onChange={(value) => edit({ ...data, paymentMeansCode: value })}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  {(['netAmount', 'taxAmount', 'grossAmount'] as const).map((key) =>
                    field(key, data[key], key, (value) => edit({ ...data, [key]: value })),
                  )}
                </div>
                {data.lines.map((line, index) => (
                  <div key={index} className="space-y-4 rounded-2xl border border-border p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {lineFields.map((key) =>
                        field(key, line[key], 'lines.' + index + '.' + key, (value) =>
                          edit({
                            ...data,
                            lines: data.lines.map((row, i) =>
                              i === index ? { ...row, [key]: value } : row,
                            ),
                          }),
                        ),
                      )}
                    </div>
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
              </section>
              <section className="space-y-5 rounded-3xl border border-border bg-surface p-5 sm:p-6">
                <h3 className="font-semibold">{t('extras')}</h3>
                {data.additionalFields.map((row, index) => (
                  <div key={index} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(['label', 'value'] as const).map((key) =>
                        field(key, row[key], 'additionalFields.' + index + '.' + key, (value) =>
                          edit({
                            ...data,
                            additionalFields: data.additionalFields.map((item, i) =>
                              i === index ? { ...item, [key]: value } : item,
                            ),
                          }),
                        ),
                      )}
                    </div>
                    <button
                      disabled={pending}
                      className="text-xs text-muted-foreground underline"
                      onClick={() =>
                        edit({
                          ...data,
                          additionalFields: data.additionalFields.filter((_, i) => i !== index),
                        })
                      }
                    >
                      {t('remove')} {index + 1}
                    </button>
                  </div>
                ))}
                <button
                  disabled={pending || data.additionalFields.length >= 100}
                  className="text-sm font-semibold text-brand-ink"
                  onClick={() =>
                    edit({
                      ...data,
                      additionalFields: [...data.additionalFields, { label: '', value: '' }],
                    })
                  }
                >
                  {t('addField')}
                </button>
              </section>
              <details className="rounded-2xl border border-border p-5">
                <summary className="cursor-pointer font-medium">{t('evidence')}</summary>
                <p className="my-4 text-xs text-muted-foreground">{t('evidenceHint')}</p>
                <ul className="max-h-80 space-y-3 overflow-auto text-xs">
                  {doc.evidence.map((item, index) => (
                    <li key={index}>
                      <strong>{item.field}</strong> · {t(item.confidence)}
                      {item.page ? ' · ' + t('page', { page: item.page }) : ''}
                      <p className="mt-1 text-muted-foreground">{item.quote}</p>
                    </li>
                  ))}
                </ul>
              </details>
              {issues.length > 0 && (
                <section className="rounded-2xl border border-error/20 p-5">
                  <h3 className="mb-3 font-medium">{t('validation')}</h3>
                  <ul className="space-y-2 text-sm">
                    {issues.map((issue, index) => (
                      <li key={index}>
                        {issue.field}: {issueMessage(issue.code)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="space-y-5 rounded-3xl border border-border bg-surface p-6">
                <h3 className="font-semibold">{t('confirmTitle')}</h3>
                {(Object.keys(confirm) as (keyof typeof confirm)[]).map((key) => (
                  <label key={key} className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={confirm[key]}
                      disabled={pending || !canApprove}
                      onChange={(event) => setConfirm({ ...confirm, [key]: event.target.checked })}
                      className="mt-1 size-4 shrink-0 accent-primary"
                    />
                    {t(key === 'amounts' ? 'amountsConfirm' : key)}
                  </label>
                ))}
                {!canApprove && (
                  <p className="text-xs text-muted-foreground">{t('approvalRole')}</p>
                )}
                {message && (
                  <p role="status" className="text-sm text-brand-ink">
                    {t(message as Key)}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={pending}
                    onClick={() => action('review')}
                    className="rounded-full border border-border px-5 py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {t('save')}
                  </button>
                  <button
                    disabled={
                      pending ||
                      !canApprove ||
                      issues.length > 0 ||
                      !Object.values(confirm).every(Boolean)
                    }
                    onClick={() => action('review', true)}
                    className={buttonClass}
                  >
                    {t('approve')}
                  </button>
                </div>
              </section>
              <section className="space-y-4 rounded-3xl border border-primary/20 bg-primary/10 p-6">
                <h3 className="flex items-center gap-3 font-semibold">
                  <Icon name="converter" />
                  {t('exportTitle')}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t('exportHint')}</p>
                {exportIssues.length > 0 && (
                  <ul role="alert" className="space-y-2 text-sm">
                    {exportIssues.map((issue, index) => (
                      <li key={index}>
                        {issue.code}:{' '}
                        {issue.message === 'exportIncomplete'
                          ? t('exportIncomplete')
                          : issue.message}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  disabled={pending || dirty || doc.status !== 'approved' || !canApprove}
                  onClick={() => action('export')}
                  className={buttonClass}
                >
                  {t(pending ? 'working' : 'export')}
                </button>
                {(dirty || doc.status !== 'approved') && (
                  <p className="text-xs">{t('exportPending')}</p>
                )}
                <p className="text-xs leading-relaxed text-muted-foreground">{t('exportNote')}</p>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}
