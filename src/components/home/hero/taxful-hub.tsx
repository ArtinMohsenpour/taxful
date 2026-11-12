import { TaxfulMark } from '@/components/brand/taxful-mark'
import { CheckIcon } from './flow-icons'
import { FlowRings } from './flow-rings'
import { flowTiming, INCOMING_DOCUMENTS, incomingTiming } from './flow-timing'
import styles from './taxful-hub.module.css'

export function TaxfulHub({
  processingLabel,
  sources,
}: {
  processingLabel: string
  sources: number
}) {
  return (
    <div className={styles.hub}>
      {/* Outgoing glows come first: tests and timing share their order. */}
      <FlowRings
        count={sources}
        timing={(index) => flowTiming(index, sources)}
        className={styles.glow}
      />
      <FlowRings
        count={INCOMING_DOCUMENTS}
        timing={(index) => incomingTiming(index, sources)}
        className={`${styles.glow} ${styles.received}`}
      />
      <TaxfulMark className={styles.taxfulMark} />
      <div>
        <span className={styles.taxfulName}>
          taxful<span>.</span>
        </span>
        <p className={styles.processing}>{processingLabel}</p>
      </div>
      <span className={styles.approval} aria-hidden="true">
        <CheckIcon />
      </span>
    </div>
  )
}
