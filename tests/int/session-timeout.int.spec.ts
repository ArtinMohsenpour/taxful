import { expect, it } from 'vitest'
import {
  idleCountdownSeconds,
  idleSecondsLeft,
  idleWarningSeconds,
  sessionActivitySeconds,
  sessionIdleSeconds,
} from '@/lib/customer-auth/session-timeout'

const minutes = (value: number) => value * 60_000

it('keeps users active for 30 minutes, then counts down 30 seconds to sign-out', () => {
  expect(idleWarningSeconds).toBe(30 * 60)
  expect(idleCountdownSeconds).toBe(30)
  expect(idleSecondsLeft(0)).toBeNull()
  expect(idleSecondsLeft(minutes(30) - 1)).toBeNull()
  expect(idleSecondsLeft(minutes(30))).toBe(30)
  expect(idleSecondsLeft(minutes(30) + 29_001)).toBe(1)
  expect(idleSecondsLeft(minutes(30) + 30_000)).toBe(0)
  expect(idleSecondsLeft(minutes(120))).toBe(0)
})

it('keeps idle sessions on the server until the browser has signed the user out', () => {
  // The browser and the server each record activity at most once per interval.
  expect(sessionIdleSeconds).toBeGreaterThanOrEqual(
    idleWarningSeconds + idleCountdownSeconds + 2 * sessionActivitySeconds,
  )
})
