// Portal users are warned after this long without activity and signed out when the countdown ends.
export const idleWarningSeconds = 30 * 60
export const idleCountdownSeconds = 30
// Browsers confirm activity with the server at most this often, and the server records it on the
// same cadence.
export const sessionActivitySeconds = 60
// The server deletes sessions without requests for this long, covering closed or sleeping browsers.
// It exceeds the browser limit by more than two activity intervals, so "Stay signed in" still works
// at the end of the countdown.
export const sessionIdleSeconds = 35 * 60

export const activityStorageKey = 'taxful-customer-activity'
export const signOutStorageKey = 'taxful-customer-sign-out'

export type SignOutReason = 'idle' | 'manual' | 'ended'

// Seconds left before an idle sign-out, or null while the user still counts as active.
export function idleSecondsLeft(idleMs: number) {
  const remainingMs = (idleWarningSeconds + idleCountdownSeconds) * 1000 - idleMs
  if (remainingMs > idleCountdownSeconds * 1000) return null
  return Math.max(0, Math.ceil(remainingMs / 1000))
}

// Tells other open portal tabs to leave as well.
export function announceSignOut(reason: SignOutReason) {
  try {
    localStorage.setItem(signOutStorageKey, JSON.stringify({ at: Date.now(), reason }))
  } catch {
    // Storage can be unavailable, for example in some private windows.
  }
}
