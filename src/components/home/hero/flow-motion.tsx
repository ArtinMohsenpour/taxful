'use client'

import { useState, type ReactNode } from 'react'
import styles from './flow-motion.module.css'

// Only the pause button needs client state; the diagram is rendered on the server.
export function FlowMotion({
  children,
  pauseLabel,
  playLabel,
}: {
  children: ReactNode
  pauseLabel: string
  playLabel: string
}) {
  const [paused, setPaused] = useState(false)

  return (
    <div className={styles.motion} data-motion-paused={paused}>
      {children}
      <button
        type="button"
        className={styles.motionButton}
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          {paused ? (
            <path d="m5 3 7 5-7 5V3Z" fill="currentColor" />
          ) : (
            <path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2" />
          )}
        </svg>
        {paused ? playLabel : pauseLabel}
      </button>
    </div>
  )
}
