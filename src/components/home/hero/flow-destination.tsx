import { CustomersIcon, TaxOfficeIcon } from './flow-icons'
import styles from './flow-destination.module.css'

export function FlowDestination({
  title,
  description,
  planned,
}: {
  title: string
  description: string
  planned?: string
}) {
  const Icon = planned ? TaxOfficeIcon : CustomersIcon

  return (
    <div className={`${styles.destination} ${planned ? styles.futureDestination : ''}`}>
      <span className={styles.destinationIcon}>
        <Icon />
      </span>
      <div>
        <div className={styles.destinationHeading}>
          <span className={styles.destinationTitle}>{title}</span>
          {planned && <span className={styles.plannedBadge}>{planned}</span>}
        </div>
        <p className={styles.destinationDescription}>{description}</p>
      </div>
    </div>
  )
}
