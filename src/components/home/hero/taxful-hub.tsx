import { TaxfulMark } from '@/components/brand/taxful-mark'
import { CheckIcon } from './flow-icons'
import { flowTiming } from './flow-timing'
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
      {Array.from({ length: sources }, (_, index) => (
        <span
          key={index}
          className={styles.glow}
          aria-hidden="true"
          style={flowTiming(index, sources)}
        />
      ))}
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
