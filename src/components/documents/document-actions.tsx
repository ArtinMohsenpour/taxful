'use client'
import { useEffect, useId, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Icon } from '@/components/customer-auth/icon'
import type { documentMessages } from '../../../messages/documents'
const PdfPreview = dynamic(() => import('./pdf-preview'), { ssr: false })
type Key = keyof typeof documentMessages.en

function PreviewContent({ id, kind }: { id: string; kind: 'source' | 'export' }) {
  const t = useTranslations('Documents')
  const [document, setDocument] = useState<{
    mime: string
    text: string | null
    scanned: boolean
    stage: string
    status: string
  } | null>(null)
  const [xml, setXml] = useState('')
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const response = await fetch(
        '/api/documents/' + id + '/' + (kind === 'export' ? 'export' : 'detail'),
        { cache: 'no-store', signal: controller.signal },
      )
      if (!response.ok) throw new Error('preview')
      if (kind === 'export') setXml(await response.text())
      else setDocument((await response.json()).document)
    })().catch(() => {
      if (!controller.signal.aborted) setError(true)
    })
    return () => controller.abort()
  }, [id, kind])
  if (error) return <p role="alert">{t('previewUnavailable')}</p>
  if (kind === 'export')
    return xml ? (
      <pre className="max-h-[65dvh] overflow-auto rounded-xl bg-background p-4 text-xs leading-relaxed break-all whitespace-pre-wrap">
        {xml}
      </pre>
    ) : (
      <p role="status">{t('loading')}</p>
    )
  if (!document) return <p role="status">{t('loading')}</p>
  if (!document.scanned || document.status === 'rejected') return <p>{t('previewWaiting')}</p>
  if (document.mime === 'application/pdf') return <PdfPreview id={id} />
  if (document.mime.startsWith('image/'))
    return ['extracting', 'checking', 'complete'].includes(document.stage) ||
      document.status === 'needs_review' ||
      document.status === 'approved' ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={'/api/documents/' + id + '/preview'}
        alt={t('original')}
        onError={() => setError(true)}
        className="mx-auto max-h-[65dvh] max-w-full rounded-xl object-contain"
      />
    ) : (
      <p>{t('previewWaiting')}</p>
    )
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t('wordPreviewHint')}</p>
      <pre className="max-h-[65dvh] overflow-auto rounded-xl bg-background p-5 text-sm leading-relaxed break-words whitespace-pre-wrap">
        {document.text || t('previewWaiting')}
      </pre>
    </div>
  )
}

export function DocumentActions({
  id,
  name,
  sourceAvailable,
  exportAvailable,
  canDelete,
  busy,
  onDeleted,
}: {
  id: string
  name: string
  sourceAvailable: boolean
  exportAvailable: boolean
  canDelete: boolean
  busy: boolean
  onDeleted: (pending: boolean) => void
}) {
  const t = useTranslations('Documents')
  const [mode, setMode] = useState<'preview' | 'delete' | null>(null)
  const [kind, setKind] = useState<'source' | 'export'>('source')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const label = useId()
  useEffect(() => {
    if (mode) dialog.current?.showModal()
    else dialog.current?.close()
  }, [mode])
  async function remove() {
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/documents/' + id + '/delete', { method: 'POST' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setMode(null)
      onDeleted(body.cleanupPending)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'genericError')
    } finally {
      setPending(false)
    }
  }
  const close = () => {
    if (!pending) setMode(null)
  }
  return (
    <>
      {sourceAvailable && (
        <button
          type="button"
          onClick={() => {
            setKind('source')
            setMode('preview')
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 hover:bg-accent"
        >
          <Icon name="preview" />
          {t('preview')}
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={busy}
          title={busy ? t('deleteBusy') : undefined}
          onClick={() => {
            setError('')
            setMode('delete')
          }}
          className="inline-flex items-center gap-2 rounded-full border border-error/20 px-4 py-2.5 text-error hover:bg-error/5 disabled:opacity-40"
        >
          <Icon name="trash" />
          {t('deleteFile')}
        </button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={label}
        onCancel={(event) => {
          event.preventDefault()
          close()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-auto rounded-3xl border border-border bg-surface p-0 text-foreground shadow-nav backdrop:bg-black/45 backdrop:backdrop-blur-sm ${mode === 'delete' ? 'max-w-lg' : 'max-w-4xl'}`}
      >
        {mode && (
          <div className="p-5 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={label} className="text-lg font-semibold">
                  {t(mode === 'delete' ? 'deleteTitle' : 'preview')}
                </h2>
                <p className="mt-1 text-sm break-words text-muted-foreground">{name}</p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={close}
                aria-label={t('close')}
                className="rounded-full border border-border p-2"
              >
                <Icon name="close" />
              </button>
            </div>
            {mode === 'preview' ? (
              <>
                <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
                  <button
                    type="button"
                    aria-pressed={kind === 'source'}
                    onClick={() => setKind('source')}
                    className={`rounded-full px-4 py-2 ${kind === 'source' ? 'bg-primary/20 text-brand-ink' : 'border border-border'}`}
                  >
                    {t('original')}
                  </button>
                  {exportAvailable && (
                    <button
                      type="button"
                      aria-pressed={kind === 'export'}
                      onClick={() => setKind('export')}
                      className={`rounded-full px-4 py-2 ${kind === 'export' ? 'bg-primary/20 text-brand-ink' : 'border border-border'}`}
                    >
                      {t('exportedFile')}
                    </button>
                  )}
                  <a
                    href={'/api/documents/' + id + '/' + kind}
                    download
                    className="ml-auto text-brand-ink underline underline-offset-4"
                  >
                    {t(kind === 'source' ? 'downloadSource' : 'downloadExport')}
                  </a>
                </div>
                <PreviewContent key={kind} id={id} kind={kind} />
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('deleteWarning')}
                </p>
                {error && (
                  <p role="alert" className="mt-4 text-sm text-error">
                    {t(t.has(error as Key) ? (error as Key) : 'genericError')}
                  </p>
                )}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    autoFocus
                    disabled={pending}
                    onClick={close}
                    className="rounded-full border border-border px-5 py-3 text-sm"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={remove}
                    className="rounded-full bg-error px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t(pending ? 'working' : 'confirmDelete')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  )
}
