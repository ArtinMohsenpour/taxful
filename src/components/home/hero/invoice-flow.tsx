import type { CSSProperties } from 'react'
import { DocumentIcon } from './flow-icons'
import { FlowConnections } from './flow-connections'
import { FlowDestination } from './flow-destination'
import { FlowMotion } from './flow-motion'
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
          <div className={styles.halo} aria-hidden="true" />
          <FlowConnections layout="desktop" sources={providers.length} />
          <FlowConnections layout="mobile" sources={providers.length} />
          <ul className={styles.providers} aria-label={labels.sources}>
            {providers.map((provider) => (
              <ProviderTile key={provider.id} provider={provider} />
            ))}
          </ul>
          <TaxfulHub processingLabel={labels.processing} sources={providers.length} />
          <div className={styles.invoice} aria-hidden="true">
            <DocumentIcon />
            <span>XML / PDF</span>
          </div>
          <div className={styles.destinations}>
            <FlowDestination title={labels.customers} description={labels.formats} />
            <FlowDestination
              title={labels.taxOffice}
              description={labels.taxSubmission}
              planned={labels.planned}
            />
          </div>
        </div>
        <p className={styles.providerNote}>{labels.providerNote}</p>
      </FlowMotion>
    </figure>
  )
}
