'use client'

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { customerAuth } from '@/lib/customer-auth/client'
import { buttonClass, inputClass } from './auth-form'

// Shows the device list while the session is fresh. Afterwards the user confirms their password,
// which starts a new session.
export function FreshSessionGuard({
  children,
  email,
  sessionId,
  activeOrganizationId,
  remainingMs,
  minutes,
  rememberMe,
  revokeSession,
}: {
  children: ReactNode
  email: string
  sessionId: string
  activeOrganizationId: string | null
  remainingMs: number | null
  minutes: number
  rememberMe: boolean
  revokeSession: (form: FormData) => Promise<void>
}) {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const router = useRouter()
  const hint = useId()
  const [stale, setStale] = useState(remainingMs === 0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (stale || remainingMs === null) return
    // Compare wall-clock time so a device that slept still reaches the deadline.
    const deadline = Date.now() + remainingMs
    const timer = setInterval(() => {
      if (Date.now() >= deadline) setStale(true)
    }, 1000)
    return () => clearInterval(timer)
  }, [stale, remainingMs])

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const password = String(new FormData(event.currentTarget).get('password') || '')
    setPending(true)
    setError('')
    try {
      const result = await customerAuth.signIn.email(
        { email, password, rememberMe },
        { headers: { 'x-taxful-locale': locale } },
      )
      if (result.error) {
        setError(
          t(
            result.error.status === 429
              ? 'rateLimited'
              : result.error.code === 'INVALID_EMAIL_OR_PASSWORD'
                ? 'passwordIncorrect'
                : 'genericError',
          ),
        )
        setPending(false)
        return
      }
      // A new session starts without a workspace, so keep the one the user had selected.
      if (activeOrganizationId)
        await customerAuth.organization
          .setActive({ organizationId: activeOrganizationId })
          .catch(() => undefined)
      // The new sign-in replaces this session, so remove the old one from the device list.
      const form = new FormData()
      form.set('locale', locale)
      form.set('sessionId', sessionId)
      await revokeSession(form).catch(() => undefined)
      router.refresh()
    } catch {
      setError(t('genericError'))
      setPending(false)
    }
  }

  if (!stale) return children
  return (
    // POST keeps the password out of the URL if the form is submitted before hydration.
    <form method="post" onSubmit={confirm} className="mt-5 space-y-4">
      <p id={hint} className="text-sm leading-relaxed text-muted-foreground">
        {t('devicesConfirm', { minutes })}
      </p>
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div>
        <label className="block space-y-2 text-sm font-medium">
          {t('password')}
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            maxLength={128}
            aria-describedby={hint}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="mt-2 text-xs font-medium text-brand-ink underline underline-offset-4"
        >
          {t(showPassword ? 'hidePassword' : 'showPassword')}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? t('working') : t('confirmIdentity')}
      </button>
    </form>
  )
}
