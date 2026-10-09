import { InvoiceFlow } from './invoice-flow'
import type { FlowProvider, HeroLabels } from '@/lib/home/types'

export function HeroSection({
  labels,
  providers,
}: {
  labels: HeroLabels
  providers: FlowProvider[]
}) {
  const hasHeading = Boolean(labels.title || labels.titleAccent)
  const hasCopy = hasHeading || Boolean(labels.eyebrow || labels.description)
  return (
    <section
      aria-labelledby={hasHeading ? 'hero-title' : undefined}
      aria-label={hasHeading ? undefined : labels.flow.title}
      className="relative isolate pt-12 pb-10 sm:pt-12 sm:pb-12"
    >
      {hasCopy && (
        <div className="mx-auto max-w-3xl text-center">
          {labels.eyebrow && (
            <p className="mb-5 flex items-center justify-center gap-2.5 text-xs font-medium tracking-wide text-brand-ink sm:text-sm">
              <span aria-hidden="true" className="h-px w-6 bg-primary" />
              {labels.eyebrow}
            </p>
          )}
          {hasHeading && (
            <h1
              id="hero-title"
              className="text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.06] font-medium tracking-[-0.055em] text-balance wrap-anywhere"
            >
              {labels.title}
              {labels.title && labels.titleAccent && <br />}
              {labels.titleAccent && <span className="text-brand-ink">{labels.titleAccent}</span>}
            </h1>
          )}
          {labels.description && (
            <p
              className={`mx-auto max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg ${labels.eyebrow || hasHeading ? 'mt-4' : ''}`}
            >
              {labels.description}
            </p>
          )}
        </div>
      )}
      <div className={`mx-auto max-w-4xl ${hasCopy ? 'mt-10' : ''}`}>
        <InvoiceFlow labels={labels.flow} providers={providers} />
      </div>
      <ol
        aria-label={labels.stepsLabel}
        className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-4 border-t border-border/80 pt-6 sm:grid-cols-4 sm:gap-4"
      >
        {labels.steps.map((step, index) => (
          <li
            key={index}
            className="flex min-w-0 items-center justify-center gap-2.5 text-xs font-medium wrap-anywhere text-muted-foreground sm:text-sm"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-[0.65rem] text-brand-ink tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  )
}
