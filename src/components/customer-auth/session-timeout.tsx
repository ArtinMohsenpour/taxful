'use client'

import { useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { customerAuth } from '@/lib/customer-auth/client'
import {
  activityStorageKey,
  announceSignOut,
  idleCountdownSeconds,
  idleSecondsLeft,
  idleWarningSeconds,
  sessionActivitySeconds,
  signOutStorageKey,
  type SignOutReason,
} from '@/lib/customer-auth/session-timeout'

const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll']
// Activity is written for other tabs at most this often.
const shareIntervalMs = 5000

function storedActivity() {
  try {
    return Number(localStorage.getItem(activityStorageKey)) || 0
  } catch {
    return 0
  }
}

function storeActivity(at: number) {
  try {
    localStorage.setItem(activityStorageKey, String(at))
  } catch {
    // Storage can be unavailable, for example in some private windows.
  }
}

function storedSignOut() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(signOutStorageKey) || 'null')
    if (value && typeof value === 'object' && 'at' in value && 'reason' in value)
      return value as { at: number; reason: SignOutReason }
  } catch {
    // Ignore missing or malformed values.
  }
  return null
}

// Warns portal users after a period without activity and signs them out when the countdown ends.
// Activity and sign-outs are shared with other open tabs.
export function SessionTimeout() {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const dialog = useRef<HTMLDialogElement>(null)
  const stayButton = useRef<HTMLButtonElement>(null)
  const title = useId()
  const description = useId()
  const countdown = useId()
  const mountedAt = useRef(0)
  const lastActivity = useRef(0)
  const lastShared = useRef(0)
  const lastConfirmed = useRef(0)
  const staying = useRef(false)
  const leaving = useRef(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [pending, setPending] = useState<'stay' | 'signOut' | null>(null)
  const warning = secondsLeft !== null

  // A full page load also clears portal pages cached in memory.
  function redirect(reason: SignOutReason) {
    const next = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.replace(
      reason === 'manual' ? `/${locale}/login` : `/${locale}/login?reason=${reason}&next=${next}`,
    )
  }

  // Another tab or the server has already ended the session.
  function leave(reason: SignOutReason) {
    if (leaving.current) return
    leaving.current = true
    redirect(reason)
  }

  async function signOut(reason: 'idle' | 'manual') {
    if (leaving.current) return
    leaving.current = true
    setPending('signOut')
    await customerAuth.signOut().catch(() => undefined)
    announceSignOut(reason)
    redirect(reason)
  }

  async function confirmSession() {
    lastConfirmed.current = Date.now()
    const result = await customerAuth.getSession().catch(() => null)
    // No session means it ended elsewhere, for example on another device or after the server's
    // idle limit. Network errors are ignored; the next request checks again.
    if (result && !result.error && !result.data) {
      announceSignOut('ended')
      leave('ended')
    }
  }

  async function stay() {
    if (staying.current || leaving.current) return
    staying.current = true
    setPending('stay')
    await confirmSession()
    staying.current = false
    if (leaving.current) return
    const now = Date.now()
    lastActivity.current = now
    lastShared.current = now
    storeActivity(now)
    setSecondsLeft(null)
    setPending(null)
  }

  const onActivity = useEffectEvent(() => {
    // The warning needs an explicit answer, so stray mouse movement doesn't dismiss it.
    if (warning || leaving.current) return
    const now = Date.now()
    lastActivity.current = now
    if (now - lastShared.current >= shareIntervalMs) {
      lastShared.current = now
      storeActivity(now)
    }
    if (now - lastConfirmed.current >= sessionActivitySeconds * 1000) void confirmSession()
  })

  const onTick = useEffectEvent(() => {
    if (leaving.current || staying.current) return
    const signedOut = storedSignOut()
    if (signedOut && signedOut.at > mountedAt.current) return leave(signedOut.reason)
    lastActivity.current = Math.max(lastActivity.current, storedActivity())
    const left = idleSecondsLeft(Date.now() - lastActivity.current)
    if (left === 0) void signOut('idle')
    else setSecondsLeft(left)
  })

  useEffect(() => {
    const now = Date.now()
    mountedAt.current = now
    lastActivity.current = now
    lastShared.current = now
    // Loading the page has just confirmed the session on the server.
    lastConfirmed.current = now
    storeActivity(now)
    const handleActivity = () => onActivity()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === signOutStorageKey || event.key === activityStorageKey) onTick()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') onTick()
    }
    for (const type of activityEvents)
      window.addEventListener(type, handleActivity, { capture: true, passive: true })
    window.addEventListener('storage', handleStorage)
    document.addEventListener('visibilitychange', handleVisibility)
    const timer = setInterval(() => onTick(), 1000)
    return () => {
      for (const type of activityEvents)
        window.removeEventListener(type, handleActivity, { capture: true })
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (warning && !element.open) {
      element.showModal()
      stayButton.current?.focus()
    } else if (!warning && element.open) element.close()
  }, [warning])

  const seconds = secondsLeft ?? idleCountdownSeconds
  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-labelledby={title}
      aria-describedby={`${description} ${countdown}`}
      // Escape counts as staying: the user is clearly present.
      onCancel={(event) => {
        event.preventDefault()
        void stay()
      }}
      onClose={() => {
        if (warning && !staying.current) void stay()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-border bg-surface p-5 text-foreground shadow-nav backdrop:bg-black/45 backdrop:backdrop-blur-sm sm:p-7"
    >
      <h2 id={title} className="text-lg font-semibold">
        {t('idleTitle')}
      </h2>
      <p id={description} className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t('idleText', { minutes: idleWarningSeconds / 60 })}
      </p>
      <p id={countdown} className="mt-5 text-sm font-medium tabular-nums">
        {t('signOutCountdown', { seconds })}
      </p>
      <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${(seconds / idleCountdownSeconds) * 100}%` }}
        />
      </div>
      <p role="status" className="sr-only">
        {warning && seconds <= 10 ? t('signOutCountdown', { seconds: 10 }) : ''}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void signOut('manual')}
          className="rounded-full border border-border px-5 py-3 text-sm transition hover:bg-accent disabled:opacity-60"
        >
          {pending === 'signOut' ? t('working') : t('logout')}
        </button>
        <button
          ref={stayButton}
          type="button"
          disabled={pending !== null}
          onClick={() => void stay()}
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60"
        >
          {pending === 'stay' ? t('working') : t('staySignedIn')}
        </button>
      </div>
    </dialog>
  )
}
