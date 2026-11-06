'use client'
import { useTranslations } from 'next-intl'

export function DocumentProgress({
  status,
  stage,
  exported = false,
  exportState = 'idle',
  manual = false,
  incoming = false,
  compact = false,
}: {
  status: string
  stage?: string
  exported?: boolean
  exportState?: string
  manual?: boolean
  incoming?: boolean
  compact?: boolean
}) {
  const t = useTranslations('Documents')
  const invoices = useTranslations('Invoices')
  const steps = [
    'stepSaved',
    'stepScan',
    'stepExtract',
    'stepReview',
    'stepApproved',
    'stepExport',
  ] as const
  const visibleSteps = steps
    .map((step, index) => ({ step, index }))
    .filter(({ index }) => (!manual || (index !== 1 && index !== 2)) && (!incoming || index < 4))
  const failed = status === 'failed' || status === 'rejected'
  const generating = exportState === 'generating'
  const active = exported
    ? 6
    : status === 'approved'
      ? 5
      : status === 'needs_review'
        ? 3
        : ['reading', 'extracting', 'checking', 'classifying'].includes(stage || '')
          ? 2
          : 1
  const current = exported
    ? t('exported')
    : generating
      ? t('generating')
      : exportState === 'failed'
        ? t('exportFailed')
        : failed
          ? t(status === 'rejected' ? 'rejected' : 'failed')
          : status === 'queued'
            ? t('queued')
            : status === 'processing'
              ? t(
                  stage === 'scanning'
                    ? 'scanning'
                    : stage === 'reading'
                      ? 'reading'
                      : stage === 'checking'
                        ? 'checking'
                        : stage === 'classifying'
                          ? 'classifying'
                          : 'processing',
                )
              : status === 'approved'
                ? t('approved')
                : t('needs_review')
  if (status === 'unsupported')
    return (
      <p
        role="status"
        title={compact ? t('unsupported') : undefined}
        className={
          compact
            ? 'truncate text-xs text-brand-ink'
            : 'rounded-xl bg-primary/10 p-3 text-sm text-brand-ink'
        }
      >
        {t('unsupported')}
      </p>
    )
  return (
    <div className={compact ? 'min-w-0 space-y-1.5' : 'space-y-3'}>
      <p
        role="status"
        title={
          compact
            ? incoming && status === 'approved'
              ? invoices('receivedReviewed')
              : current
            : undefined
        }
        className={`font-medium ${compact ? 'truncate text-[0.65rem] sm:text-xs' : 'text-xs'} ${failed || exportState === 'failed' ? 'text-error' : 'text-brand-ink'}`}
      >
        {incoming && status === 'approved' ? invoices('receivedReviewed') : current}
      </p>
      <ol
        aria-label={t('workflow')}
        className={
          compact
            ? 'grid auto-cols-fr grid-flow-col gap-1'
            : `grid gap-x-2 gap-y-3 ${manual || incoming ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-6'}`
        }
      >
        {visibleSteps.map(({ step, index }, position) => {
          const done = index < active
          const isCurrent = index === active && status !== 'queued'
          const error = isCurrent && (failed || exportState === 'failed')
          const moving = isCurrent && (status === 'processing' || generating)
          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              title={compact ? t(step) : undefined}
              className="min-w-0"
            >
              <div
                className={`rounded-full transition-colors duration-500 motion-reduce:transition-none ${compact ? 'h-1' : 'mb-2 h-1.5'} ${error ? 'bg-error' : done ? 'bg-primary' : isCurrent ? 'bg-brand-ink' : 'bg-border'} ${moving ? 'motion-safe:animate-pulse' : ''}`}
              />
              <span
                className={
                  compact
                    ? 'sr-only'
                    : `text-[0.65rem] leading-tight sm:text-xs ${done || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`
                }
              >
                {step === 'stepSaved' ? '✓ ' : done ? '✓ ' : `${position + 1}. `}
                {t(step)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
