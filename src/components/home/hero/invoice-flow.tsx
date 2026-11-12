import type { CSSProperties } from 'react'
import { CheckIcon, CustomersIcon, DocumentIcon, InboxIcon, PartnersIcon } from './flow-icons'
import { FlowConnections } from './flow-connections'
import { FlowCard } from './flow-card'
import { FlowMotion } from './flow-motion'
import { FlowRings } from './flow-rings'
import { flowTiming, INCOMING_DOCUMENTS, incomingTiming } from './flow-timing'
import { ProviderTile } from './provider-tile'
import { TaxfulHub } from './taxful-hub'
import type { FlowProvider, InvoiceFlowLabels } from '@/lib/home/types'
import styles from './invoice-flow.module.css'

export function InvoiceFlow({
  labels,
  providers,
}: {
  labels: InvoiceFlowLabels
  providers: FlowProvider[]
}) {
  const sources = providers.length
  const outgoing = (index: number) => flowTiming(index, sources)
  const received = (index: number) => incomingTiming(index, sources)
  const grid = {
    '--provider-columns': Math.max(1, providers.length),
    '--mobile-columns': Math.min(3, Math.max(1, providers.length)),
    '--mobile-rows': Math.max(1, Math.ceil(providers.length / 3)),
  } as CSSProperties
  return (
    <figure id="invoice-flow" className={styles.figure} aria-labelledby="invoice-flow-title">
      <figcaption id="invoice-flow-title" className="sr-only">
        {labels.title}. {labels.description}
      </figcaption>
      <div className={styles.sourceHeading}>
        <span>{labels.sources}</span>
        <span className={styles.importBadge}>
          <DocumentIcon />
          {labels.importMethod}
        </span>
      </div>
      <FlowMotion pauseLabel={labels.pause} playLabel={labels.play}>
        <div className={styles.scene} style={grid}>
          <div className={styles.grid} aria-hidden="true" />
          <div className={styles.halo} aria-hidden="true" />
          <FlowConnections layout="desktop" sources={sources} />
          <FlowConnections layout="mobile" sources={sources} />
          <ul className={styles.providers} aria-label={labels.sources}>
            {providers.map((provider, index) => (
              <ProviderTile key={provider.id} provider={provider} index={index} />
            ))}
          </ul>
          <TaxfulHub processingLabel={labels.processing} sources={sources} />
          {/* Chips on the two outgoing routes light up as an invoice passes them. */}
          <div className={`${styles.chip} ${styles.formatChip}`} aria-hidden="true">
            <FlowRings
              count={sources}
              timing={outgoing}
              className={`${styles.chipRing} ${styles.formatRing}`}
            />
            <DocumentIcon />
            <span className={styles.chipLabel}>{labels.formatChip}</span>
          </div>
          <div className={`${styles.chip} ${styles.reportChip}`} aria-hidden="true">
            <FlowRings
              count={INCOMING_DOCUMENTS}
              timing={received}
              className={`${styles.chipRing} ${styles.reportRing}`}
            />
            <CheckIcon />
            <span className={styles.chipLabel}>{labels.report}</span>
          </div>
          <div className={styles.destinations}>
            <FlowCard
              className={styles.customerCard}
              title={labels.customers}
              description={labels.formats}
              icon={<CustomersIcon />}
              arrival={{ lane: 'customer', count: sources, timing: outgoing }}
            />
            <FlowCard
              className={styles.partnerCard}
              title={labels.partners}
              description={labels.partnerFormats}
              icon={<PartnersIcon />}
            />
            <FlowCard
              className={styles.inboxCard}
              title={labels.inbox}
              description={labels.inboxStorage}
              icon={<InboxIcon />}
              arrival={{ lane: 'inbox', count: INCOMING_DOCUMENTS, timing: received }}
            />
          </div>
        </div>
        <p className={styles.providerNote}>{labels.providerNote}</p>
      </FlowMotion>
    </figure>
  )
}
