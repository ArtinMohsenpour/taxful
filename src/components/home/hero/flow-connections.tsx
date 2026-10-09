import { createFlowPaths, type FlowLayout } from './flow-paths'
import { flowTiming } from './flow-timing'
import styles from './flow-connections.module.css'

export function FlowConnections({ layout, sources }: { layout: FlowLayout; sources: number }) {
  const geometry = createFlowPaths(layout, sources)

  return (
    <svg
      viewBox={geometry.viewBox}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      className={`${styles.connections} ${styles[layout]}`}
    >
      {geometry.incoming.map((path, index) => (
        <g key={path}>
          <path d={path} className={styles.track} />
          <path
            d={path}
            pathLength="100"
            className={styles.pulse}
            style={flowTiming(index, sources)}
          />
        </g>
      ))}
      <path d={geometry.customer} className={styles.track} />
      {geometry.incoming.map((path, index) => (
        <path
          key={path}
          d={geometry.customer}
          pathLength="100"
          className={styles.outgoingPulse}
          style={flowTiming(index, sources)}
        />
      ))}
      <path d={geometry.taxOffice} className={styles.plannedTrack} />
    </svg>
  )
}
