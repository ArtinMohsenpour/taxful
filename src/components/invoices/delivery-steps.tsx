'use client'
import { useTranslations } from 'next-intl'
export function InvoiceDeliverySteps({ step }: { step: 1 | 2 | 3 }) {
  const t = useTranslations('InvoiceEmail')
  return (
    <ol aria-label={t('steps')} className="grid gap-2 text-sm sm:grid-cols-3">
      {(['stepReview', 'stepCreate', 'stepSend'] as const).map((label, index) => (
        <li
          key={label}
          aria-current={step === index + 1 ? 'step' : undefined}
          className={`flex items-center gap-3 rounded-xl border p-3 ${step === index + 1 ? 'border-primary bg-primary/15 font-semibold' : 'border-border bg-surface text-muted-foreground'}`}
        >
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-current"
          >
            {index + 1}
          </span>
          {t(label)}
        </li>
      ))}
    </ol>
  )
}
