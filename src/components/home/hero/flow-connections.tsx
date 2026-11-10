import type { CSSProperties } from 'react'
import { createFlowPaths, type FlowLayout } from './flow-paths'
import { flowTiming, INCOMING_DOCUMENTS, incomingTiming } from './flow-timing'
import styles from './flow-connections.module.css'

// in/out: company invoices to Taxful and on to customers.
// receive/file: partner invoices to Taxful and on to the inbox.
type Lane = 'in' | 'out' | 'receive' | 'file'

// One invoice travelling along a route: a soft tail with a bright dot at its front.
function Comet({ d, lane, timing }: { d: string; lane: Lane; timing: CSSProperties }) {
  return (
    <>
      <path
        d={d}
        pathLength="100"
        data-pulse={lane}
        className={styles[`${lane}Tail`]}
        style={timing}
      />
      <path d={d} pathLength="100" className={styles[`${lane}Head`]} style={timing} />
    </>
  )
}

export function FlowConnections({ layout, sources }: { layout: FlowLayout; sources: number }) {
  const geometry = createFlowPaths(layout, sources)
  const received = Array.from({ length: INCOMING_DOCUMENTS }, (_, index) => index)

  return (
    <svg
      viewBox={geometry.viewBox}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      className={`${styles.connections} ${styles[layout]}`}
    >
      {/* Routes overlap on the shared rail and trunk; the group's opacity is applied
          once, so overlapping lines do not darken each other. */}
      <g className={styles.tracks}>
        {[...geometry.incoming, geometry.customer, geometry.partner, geometry.inbox].map(
          (path, index) => (
            <path key={index} d={path} pathLength="1" className={styles.track} />
          ),
        )}
      </g>
      <g className={styles.pulses}>
        {geometry.incoming.map((path, index) => (
          <Comet key={`in-${index}`} d={path} lane="in" timing={flowTiming(index, sources)} />
        ))}
        {geometry.incoming.map((_, index) => (
          <Comet
            key={`out-${index}`}
            d={geometry.customer}
            lane="out"
            timing={flowTiming(index, sources)}
          />
        ))}
        {received.map((index) => (
          <Comet
            key={`receive-${index}`}
            d={geometry.partner}
            lane="receive"
            timing={incomingTiming(index, sources)}
          />
        ))}
        {received.map((index) => (
          <Comet
            key={`file-${index}`}
            d={geometry.inbox}
            lane="file"
            timing={incomingTiming(index, sources)}
          />
        ))}
      </g>
    </svg>
  )
}
