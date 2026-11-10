import type { CSSProperties } from 'react'

const CYCLE_SECONDS = 12

// Outgoing lane, one phase per company. All stages share this clock: arrival at
// Taxful ~24%, hub glow 24–36%, out to customers 30–55%.
export function flowTiming(index: number, sources: number): CSSProperties {
  return {
    animationDuration: `${CYCLE_SECONDS}s`,
    animationDelay: `${-(index * CYCLE_SECONDS) / Math.max(1, sources)}s`,
  }
}

// Incoming lane: two received invoices per cycle, 6 s apart. Partner to Taxful
// 0–14% (arrives ~12%), hub glow 12–24%, on to the inbox 17–40%.
export const INCOMING_DOCUMENTS = 2

// Hub arrivals in seconds after each lane's keyframe 0%.
const OUTGOING_ARRIVAL = 0.237 * CYCLE_SECONDS
const INCOMING_ARRIVAL = 0.123 * CYCLE_SECONDS
const incomingDelays = new Map<number, number>()

// Picks the phase that keeps received-invoice arrivals as far as possible from the
// outgoing ones (which repeat every cycle / sources), so each hub glow reads as its
// own event for any number of companies.
function incomingDelay(sources: number) {
  const cached = incomingDelays.get(sources)
  if (cached !== undefined) return cached
  const period = CYCLE_SECONDS / Math.max(1, sources)
  const outgoing = OUTGOING_ARRIVAL % period
  const spacing = CYCLE_SECONDS / INCOMING_DOCUMENTS
  let best = 0
  let bestGap = -1
  for (let step = 0; step < CYCLE_SECONDS * 100; step++) {
    const arrival = step / 100
    const gap = Math.min(
      ...Array.from({ length: INCOMING_DOCUMENTS }, (_, index) => {
        const distance = Math.abs(((arrival + index * spacing) % period) - outgoing)
        return Math.min(distance, period - distance)
      }),
    )
    if (gap > bestGap + 1e-9) {
      best = arrival
      bestGap = gap
    }
  }
  const delay = Math.round((best - INCOMING_ARRIVAL) * 100) / 100
  incomingDelays.set(sources, delay)
  return delay
}

export function incomingTiming(index: number, sources: number): CSSProperties {
  const delay = incomingDelay(sources) - (index * CYCLE_SECONDS) / INCOMING_DOCUMENTS
  return { animationDuration: `${CYCLE_SECONDS}s`, animationDelay: `${delay}s` }
}
