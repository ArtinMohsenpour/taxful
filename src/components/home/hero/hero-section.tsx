import type { CSSProperties } from 'react'
import { CmsLink } from '@/components/cms-link'
import { InvoiceFlow } from './invoice-flow'
import type { FlowProvider, HeroAction, HeroLabels } from '@/lib/home/types'
import styles from './hero-section.module.css'

const delay = (ms: number) => ({ '--reveal-delay': `${ms}ms` }) as CSSProperties

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.arrow}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function HeroButton({
  action,
  primary,
  newTabLabel,
}: {
  action: HeroAction
  primary: boolean
  newTabLabel: string
}) {
  return (
    <CmsLink
      link={action.link}
      className={`${styles.action} ${primary ? styles.primary : styles.secondary}`}
      newTabLabel={newTabLabel}
    >
      {action.label}
      <ArrowIcon />
    </CmsLink>
  )
}

export function HeroSection({
  labels,
  providers,
  actions = [],
}: {
  labels: HeroLabels
  providers: FlowProvider[]
  actions?: HeroAction[]
}) {
  const hasHeading = Boolean(labels.title || labels.titleAccent)
  const hasCopy = hasHeading || Boolean(labels.eyebrow || labels.description) || actions.length > 0
  return (
    <section
      aria-labelledby={hasHeading ? 'hero-title' : undefined}
      aria-label={hasHeading ? undefined : labels.flow.title}
      className="relative isolate pt-12 pb-10 sm:pt-14 sm:pb-12"
    >
      {hasCopy && (
        <div className="mx-auto max-w-3xl text-center">
          {labels.eyebrow && (
            <p
              className={`${styles.reveal} mb-5 flex items-center justify-center gap-2.5 text-xs font-medium tracking-wide text-brand-ink sm:text-sm`}
              style={delay(0)}
            >
              <span aria-hidden="true" className={styles.eyebrowLine} />
              {labels.eyebrow}
            </p>
          )}
          {hasHeading && (
            // Not animated: the heading is the page's largest text and paints immediately.
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
              className={`${styles.reveal} mx-auto max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg ${labels.eyebrow || hasHeading ? 'mt-5' : ''}`}
              style={delay(80)}
            >
              {labels.description}
            </p>
          )}
          {actions.length > 0 && (
            <div
              className={`${styles.reveal} flex flex-wrap items-center justify-center gap-3 ${labels.eyebrow || hasHeading || labels.description ? 'mt-8' : ''}`}
              style={delay(160)}
            >
              {actions.map((action, index) => (
                <HeroButton
                  key={action.id ?? `${index}-${action.label}`}
                  action={action}
                  primary={index === 0}
                  newTabLabel={labels.newTab}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div className={`mx-auto max-w-4xl ${hasCopy ? 'mt-12 sm:mt-14' : ''}`}>
        <InvoiceFlow labels={labels.flow} providers={providers} />
      </div>
      <ol
        aria-label={labels.stepsLabel}
        className={`${styles.reveal} mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-4 border-t border-border/80 pt-6 sm:flex sm:items-center sm:justify-center`}
        style={delay(900)}
      >
        {labels.steps.map((step, index) => (
          <li
            key={index}
            className="flex min-w-0 items-center justify-center gap-2.5 text-xs font-medium wrap-anywhere text-muted-foreground sm:text-sm"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-[0.65rem] text-brand-ink tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            {step}
            {index < labels.steps.length - 1 && (
              <span aria-hidden="true" className={styles.stepConnector} />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
