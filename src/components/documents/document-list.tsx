'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Icon } from '@/components/customer-auth/icon'
import { buttonClass } from '@/components/customer-auth/auth-form'
import { DocumentProgress } from './document-progress'
import { ProcessingNotice, type ProcessingHealth } from './processing-notice'
import { DocumentActions } from './document-actions'
import { WorkspaceSelect } from '@/components/customer-auth/workspace-select'
import type { documentMessages } from '../../../messages/documents'
type Key = keyof typeof documentMessages.en
type Item = {
  source_kind: 'manual' | 'upload'
  workflow: 'incoming' | 'outgoing' | 'unclassified'
  invoice_state: 'draft' | 'issued' | 'sent' | 'paid'
  id: string
  original_name: string
  status: Key
  error_code: string
  created_at: string
  upload_date: string
  size_bytes: number
  mime_type: string
  processing_stage: string
  export_state: string
  source_available: boolean
  zugferd_available: boolean
  export_available: boolean
  can_delete: boolean
}
type Listing = {
  health: ProcessingHealth
  documents: Item[]
  total: number
  page: number
  pageSize: number
  limits: {
    used: number
    dailyLimit: number
    batchLimit: number
    maxFileBytes: number
    maxRequestBytes: number
  }
  aiReady: boolean
}

export function DocumentList({
  upload = false,
  workflow = 'all',
}: {
  upload?: boolean
  workflow?: 'all' | 'incoming' | 'outgoing' | 'unclassified'
}) {
  const invoices = useTranslations('Invoices')
  const t = useTranslations('Documents'),
    locale = useLocale()
  const [listing, setListing] = useState<Listing | null>(null),
    [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([]),
    [pending, setPending] = useState(false),
    [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const requestKey = useRef(crypto.randomUUID())
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const filterForm = useRef<HTMLFormElement>(null)
  const latest = useRef(0)
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++latest.current
      try {
        const response = await fetch('/api/documents?' + query + '&workflow=' + workflow, {
          cache: 'no-store',
          signal,
        })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error)
        if (version === latest.current) setListing(body)
      } catch (error) {
        if (
          version === latest.current &&
          !(error instanceof DOMException && error.name === 'AbortError')
        )
          setError(error instanceof Error ? error.message : 'genericError')
      }
    },
    [query, workflow],
  )
  useEffect(() => {
    const controller = new AbortController()
    // State changes only after the asynchronous network request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(controller.signal)
    }, 5000)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [load])
  function select(next: File[]) {
    requestKey.current = crypto.randomUUID()
    setError('')
    if (listing && next.length > listing.limits.batchLimit) {
      setError('batchLimit')
      return
    }
    if (
      listing &&
      (next.some((file) => file.size > listing.limits.maxFileBytes) ||
        next.reduce((n, file) => n + file.size, 0) > listing.limits.maxRequestBytes - 8192)
    ) {
      setError('fileTooLarge')
      return
    }
    setFiles(next)
  }
  async function submit() {
    if (!files.length) return
    setPending(true)
    setError('')
    setNotice('')
    try {
      const form = new FormData()
      form.append('workflow', workflow === 'incoming' ? 'incoming' : 'outgoing')
      files.forEach((file) => form.append('files', file))
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'idempotency-key': requestKey.current },
        body: form,
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setFiles([])
      if (input.current) input.current.value = ''
      requestKey.current = crypto.randomUUID()
      setNotice('uploadSaved')
      filterForm.current?.reset()
      setStatusFilter('all')
      setTypeFilter('all')
      setQuery('')
      await load()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'genericError')
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="space-y-6">
      {(upload ||
        listing?.documents.some((item) => ['queued', 'processing'].includes(item.status))) && (
        <ProcessingNotice health={listing?.health} />
      )}
      {notice && (
        <p
          role="status"
          className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-brand-ink"
        >
          {t(notice as Key)}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-error"
        >
          {invoices.has(error as never)
            ? invoices(error as never)
            : t(t.has(error as Key) ? (error as Key) : 'genericError')}
        </p>
      )}
      {upload && (
        <section className="rounded-3xl border border-border bg-surface p-6">
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              if (!pending) select(Array.from(event.dataTransfer.files))
            }}
            className={`flex flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-primary bg-primary/10' : 'border-border bg-background/50'}`}
          >
            <Icon name="converter" className="mb-4 size-9 text-brand-ink" />
            <p className="text-lg font-medium">{t('drop')}</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              {workflow === 'incoming' ? 'XML · ' : ''}
              {t('formats')}
            </p>
            <label className="mt-5 cursor-pointer rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium focus-within:outline-2 focus-within:outline-primary">
              {t('choose')}
              <input
                ref={input}
                type="file"
                className="sr-only"
                disabled={pending}
                multiple={(listing?.limits.batchLimit || 1) > 1}
                accept={
                  workflow === 'incoming'
                    ? '.xml,.pdf,.docx,.jpg,.jpeg,.png,.webp,.tif,.tiff,.gif,.avif'
                    : '.pdf,.docx,.jpg,.jpeg,.png,.webp,.tif,.tiff,.gif,.avif'
                }
                onChange={(event) => select(Array.from(event.target.files || []))}
              />
            </label>
          </div>
          {files.length > 0 && (
            <ul className="my-4 space-y-2 text-sm">
              {files.map((file, index) => (
                <li className="break-all" key={index}>
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                </li>
              ))}
            </ul>
          )}
          {listing && (
            <div className="my-5 space-y-2 text-xs text-muted-foreground">
              <p>
                {t('allowance', { used: listing.limits.used, limit: listing.limits.dailyLimit })}
              </p>
              <p>
                {t('limits', {
                  size: listing.limits.maxFileBytes / 1024 / 1024,
                  batch: listing.limits.batchLimit,
                })}
              </p>
            </div>
          )}
          <p className="my-5 text-sm leading-relaxed text-muted-foreground">
            {workflow === 'incoming' ? invoices('importPrivacy') : t('aiNotice')}
          </p>
          {listing && !listing.aiReady && (
            <p className="mb-4 text-sm text-brand-ink">{invoices('aiOptional')}</p>
          )}
          <button
            onClick={submit}
            disabled={
              pending ||
              !files.length ||
              !listing ||
              listing.limits.used >= listing.limits.dailyLimit
            }
            className={buttonClass}
          >
            {t(pending ? 'working' : 'upload')}
          </button>
          {pending && (
            <div role="status" className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="h-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
              {t('uploadingFile')}
            </div>
          )}
        </section>
      )}
      <form
        ref={filterForm}
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const params = new URLSearchParams()
          for (const [key, value] of data)
            if (typeof value === 'string' && value) params.set(key, value)
          setError('')
          setQuery(params.toString())
        }}
      >
        <div className="flex flex-wrap items-center gap-1.5 rounded-3xl border border-border bg-surface p-1.5">
          <input
            name="q"
            maxLength={120}
            type="search"
            aria-label={t('searchFiles')}
            placeholder={t('searchFiles')}
            className="h-9 w-full min-w-0 rounded-full border border-border bg-background/60 px-3 text-base text-foreground transition outline-none focus:border-focus focus:ring-2 focus:ring-focus/15 sm:w-auto sm:min-w-28 sm:flex-1 sm:text-xs"
          />
          <div className="min-w-0 flex-1 sm:w-32 sm:flex-none">
            <WorkspaceSelect
              compact
              name="status"
              label={t('status')}
              value={statusFilter}
              onChange={setStatusFilter}
              options={(
                [
                  'all',
                  'queued',
                  'processing',
                  'needs_review',
                  'approved',
                  'exported',
                  'failed',
                  'unsupported',
                ] as const
              ).map((value) => ({ value, label: t(value === 'all' ? 'allStatuses' : value) }))}
            />
          </div>
          <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
            <WorkspaceSelect
              compact
              name="type"
              label={t('allTypes')}
              value={typeFilter}
              onChange={setTypeFilter}
              options={(['all', 'pdf', 'word', 'image', 'xml'] as const).map((value) => ({
                value,
                label:
                  value === 'xml'
                    ? 'XML'
                    : t(
                        value === 'all'
                          ? 'allTypes'
                          : value === 'pdf'
                            ? 'pdfFiles'
                            : value === 'word'
                              ? 'wordFiles'
                              : 'imageFiles',
                      ),
              }))}
            />
          </div>
          <div className="flex h-9 w-full items-center rounded-full border border-border bg-background/60 px-2 transition focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/15 sm:w-auto">
            {/* Chrome reserves extra width in date inputs; a fixed width keeps the calendar icon next to the date. */}
            <input
              name="from"
              type="date"
              aria-label={t('fromDate')}
              title={t('fromDate')}
              className="h-full min-w-0 flex-1 bg-transparent px-1 text-base text-foreground outline-none sm:w-26 sm:flex-none sm:text-xs"
            />
            <span aria-hidden="true" className="text-xs text-muted-foreground">
              –
            </span>
            <input
              name="to"
              type="date"
              aria-label={t('toDate')}
              title={t('toDate')}
              className="h-full min-w-0 flex-1 bg-transparent px-1 text-base text-foreground outline-none sm:w-26 sm:flex-none sm:text-xs"
            />
          </div>
          <button
            type="submit"
            className="h-8 w-full rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/85 sm:mr-0.5 sm:ml-1.5 sm:w-auto"
          >
            {t('filterFiles')}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-3">
            {listing && t('resultCount', { count: listing.total })}
            <button
              type="button"
              onClick={() => {
                filterForm.current?.reset()
                setStatusFilter('all')
                setTypeFilter('all')
                setQuery('')
                setError('')
              }}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t('clearFilters')}
            </button>
          </span>
          <span>{t('dateZone')}</span>
        </div>
      </form>
      {!listing ? (
        <p role="status">{t('loading')}</p>
      ) : !listing.documents.length ? (
        <div className="rounded-3xl border border-border bg-surface p-10 text-center">
          <Icon name="files" className="mb-4 size-9 text-brand-ink" />
          <h2 className="font-medium">{t(query ? 'noMatches' : 'empty')}</h2>
          {!query && <p className="mt-2 text-sm text-muted-foreground">{t('emptyIntro')}</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(new Set(listing.documents.map((item) => item.upload_date))).map((day) => (
            <section key={day} aria-label={day}>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: 'full',
                  timeZone: 'Europe/Berlin',
                }).format(new Date(day + 'T12:00:00Z'))}
              </h2>
              <ul className="space-y-3">
                {listing.documents
                  .filter((item) => item.upload_date === day)
                  .map((item) => (
                    <li
                      key={item.id}
                      className="relative rounded-3xl border border-border bg-surface p-5 sm:p-6"
                    >
                      <div className="mb-5 flex items-start gap-3 pr-10">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Icon name="files" className="text-brand-ink" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={'/portal/files/' + item.id}
                            className="block truncate font-semibold hover:text-brand-ink"
                            title={item.original_name}
                          >
                            {item.original_name}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.source_kind === 'manual'
                              ? invoices('manual')
                              : (item.size_bytes / 1024 / 1024).toFixed(2) + ' MB'}{' '}
                            ·{' '}
                            {new Intl.DateTimeFormat(locale, {
                              timeStyle: 'short',
                              timeZone: 'Europe/Berlin',
                            }).format(new Date(item.created_at))}{' '}
                            ·{' '}
                            {item.workflow === 'outgoing'
                              ? invoices(item.invoice_state)
                              : item.workflow === 'incoming'
                                ? invoices('incoming')
                                : invoices('unclassified')}
                          </p>
                        </div>
                      </div>
                      <DocumentProgress
                        manual={item.source_kind === 'manual'}
                        incoming={item.workflow === 'incoming'}
                        status={item.status}
                        stage={item.processing_stage}
                        exported={item.export_available || item.zugferd_available}
                        exportState={item.export_state}
                      />
                      {item.status === 'failed' || item.status === 'rejected' ? (
                        <p className="mt-3 text-xs text-error">
                          {invoices.has(item.error_code as never)
                            ? invoices(item.error_code as never)
                            : t(
                                t.has(item.error_code as Key)
                                  ? (item.error_code as Key)
                                  : 'genericError',
                              )}
                        </p>
                      ) : null}
                      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-xs font-medium">
                        <DocumentActions
                          id={item.id}
                          reviewHref={'/portal/files/' + item.id}
                          name={item.original_name}
                          sourceAvailable={item.source_available}
                          exportAvailable={item.export_available}
                          zugferdAvailable={item.zugferd_available}
                          canDelete={item.can_delete}
                          busy={item.status === 'processing' || item.export_state === 'generating'}
                          onDeleted={(cleanupPending) => {
                            setNotice(cleanupPending ? 'deletionPending' : 'deleted')
                            void load()
                          }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
          <nav aria-label={t('files')} className="flex items-center justify-between gap-3 text-sm">
            <button
              disabled={listing.page <= 1}
              onClick={() => {
                const p = new URLSearchParams(query)
                p.set('page', String(listing.page - 1))
                setQuery(p.toString())
              }}
              className="rounded-full border border-border px-4 py-2 disabled:opacity-40"
            >
              {t('previous')}
            </button>
            <span className="text-xs text-muted-foreground">
              {t('pageCount', {
                page: listing.page,
                pages: Math.max(1, Math.ceil(listing.total / listing.pageSize)),
              })}
            </span>
            <button
              disabled={listing.page * listing.pageSize >= listing.total}
              onClick={() => {
                const p = new URLSearchParams(query)
                p.set('page', String(listing.page + 1))
                setQuery(p.toString())
              }}
              className="rounded-full border border-border px-4 py-2 disabled:opacity-40"
            >
              {t('next')}
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}
