'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist'

export default function PdfPreview({ id }: { id: string }) {
  const t = useTranslations('Documents')
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(100, Math.floor(entries[0].contentRect.width))),
    )
    if (container.current) observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let task: PDFDocumentLoadingTask | undefined
    void (async () => {
      const library = await import('pdfjs-dist')
      library.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString()
      const response = await fetch('/api/documents/' + id + '/source', {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('preview')
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (controller.signal.aborted) return
      task = library.getDocument({ data: bytes, stopAtErrors: true })
      const document = await task.promise
      if (!controller.signal.aborted) setPdf(document)
    })().catch(() => {
      if (!controller.signal.aborted) setError(true)
    })
    return () => {
      controller.abort()
      void task?.destroy()
    }
  }, [id])
  useEffect(() => {
    if (!pdf || !canvas.current) return
    let cancelled = false,
      render: RenderTask | undefined
    const target = canvas.current
    void (async () => {
      const pdfPage = await pdf.getPage(page)
      if (cancelled) return
      const base = pdfPage.getViewport({ scale: 1 })
      // Bound canvas memory even for unusual page dimensions.
      const scale = Math.min(width / base.width, 1400 / base.width, 2000 / base.height)
      const viewport = pdfPage.getViewport({ scale })
      target.width = Math.ceil(viewport.width * 1.5)
      target.height = Math.ceil(viewport.height * 1.5)
      target.style.width = viewport.width + 'px'
      target.style.height = viewport.height + 'px'
      render = pdfPage.render({ canvas: target, viewport, transform: [1.5, 0, 0, 1.5, 0, 0] })
      await render.promise
    })().catch(() => {
      if (!cancelled) setError(true)
    })
    return () => {
      cancelled = true
      render?.cancel()
    }
  }, [pdf, page, width])
  return (
    <div ref={container} className="min-w-0 space-y-4">
      {error ? (
        <p role="alert">{t('previewUnavailable')}</p>
      ) : (
        <>
          {!pdf && <p role="status">{t('loading')}</p>}
          {pdf && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-full border border-border px-4 py-2 disabled:opacity-40"
              >
                {t('previous')}
              </button>
              <span>{t('pageCount', { page, pages: pdf.numPages })}</span>
              <button
                type="button"
                disabled={page >= pdf.numPages}
                onClick={() => setPage(page + 1)}
                className="rounded-full border border-border px-4 py-2 disabled:opacity-40"
              >
                {t('next')}
              </button>
            </div>
          )}
          <canvas
            ref={canvas}
            aria-label={t('page', { page })}
            className="mx-auto max-w-full rounded-lg bg-white"
          />
        </>
      )}
    </div>
  )
}
