import type { CSSProperties, ReactNode } from 'react'
import { FlowRings } from './flow-rings'
import styles from './flow-card.module.css'

type Arrival = {
  // customer: outgoing invoices (~52% of the cycle); inbox: received ones (~37%).
  lane: 'customer' | 'inbox'
  count: number
  timing: (index: number) => CSSProperties
}

// A card at the bottom of the diagram. Destinations light up as invoices arrive;
// the partner card is a source and has no arrival rings.
export function FlowCard({
  title,
  description,
  icon,
  arrival,
  className = '',
}: {
  title: string
  description: string
  icon: ReactNode
  arrival?: Arrival
  className?: string
}) {
  return (
    <div className={`${styles.card} ${className}`}>
      {arrival && (
        <FlowRings
          count={arrival.count}
          timing={arrival.timing}
          className={`${styles.arrival} ${styles[arrival.lane]}`}
        />
      )}
      <span className={styles.cardIcon}>{icon}</span>
      <div>
        <span className={styles.cardTitle}>{title}</span>
        <p className={styles.cardDescription}>{description}</p>
      </div>
    </div>
  )
}
