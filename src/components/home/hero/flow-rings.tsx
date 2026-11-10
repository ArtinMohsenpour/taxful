import type { CSSProperties } from 'react'

// Rings phased on the shared flow clock, so an element reacts each time an invoice
// passes it. Keyframes live with the element's own styles.
export function FlowRings({
  count,
  timing,
  className,
}: {
  count: number
  timing: (index: number) => CSSProperties
  className: string
}) {
  return Array.from({ length: count }, (_, index) => (
    <span key={index} aria-hidden="true" className={className} style={timing(index)} />
  ))
}
