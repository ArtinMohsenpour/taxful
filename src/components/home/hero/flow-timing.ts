import type { CSSProperties } from 'react'

export const FLOW_CYCLE_SECONDS = 12

// All stages share this clock: arrival at 27%, hub glow at 27–36%, exit at 30–55%.
export function flowTiming(index: number, sources: number): CSSProperties {
  return {
    animationDuration: `${FLOW_CYCLE_SECONDS}s`,
    animationDelay: `${-(index * FLOW_CYCLE_SECONDS) / Math.max(1, sources)}s`,
  }
}
