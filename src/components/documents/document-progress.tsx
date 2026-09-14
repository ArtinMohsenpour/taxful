'use client'
import { useTranslations } from 'next-intl'

export function DocumentProgress({
  status,
  stage,
  exported = false,
  exportState = 'idle',
}: {
  status: string
  stage?: string
  exported?: boolean
  exportState?: string
}) {
  const t = useTranslations('Documents')
  const steps = [
    'stepSaved',
    'stepScan',
    'stepExtract',
    'stepReview',
    'stepApproved',
    'stepExport',
  ] as const
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
      <p role="status" className="rounded-xl bg-primary/10 p-3 text-sm text-brand-ink">
        {t('unsupported')}
      </p>
    )
  return (
    <div className="space-y-3">
      <p
        role="status"
        className={`text-xs font-medium ${failed || exportState === 'failed' ? 'text-error' : 'text-brand-ink'}`}
      >
        {current}
      </p>
      <ol aria-label={t('workflow')} className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6">
        {steps.map((step, index) => {
          const done = index < active
          const isCurrent = index === active && status !== 'queued'
          const error = isCurrent && (failed || exportState === 'failed')
          const moving = isCurrent && (status === 'processing' || generating)
          return (
            <li key={step} aria-current={isCurrent ? 'step' : undefined} className="min-w-0">
              <div
                className={`mb-2 h-1.5 rounded-full transition-colors duration-500 motion-reduce:transition-none ${error ? 'bg-error' : done ? 'bg-primary' : isCurrent ? 'bg-brand-ink' : 'bg-border'} ${moving ? 'motion-safe:animate-pulse' : ''}`}
              />
              <span
                className={`text-[0.65rem] leading-tight sm:text-xs ${done || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {step === 'stepSaved' ? '✓ ' : done ? '✓ ' : `${index + 1}. `}
                {t(step)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
