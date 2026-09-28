'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { customerAuth } from '@/lib/customer-auth/client'

const input = 'w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground'
const button =
  'rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60'

export function SecondFactor({
  onVerified,
  stepUp = false,
}: {
  onVerified: () => void | Promise<void>
  stepUp?: boolean
}) {
  const t = useTranslations('Security')
  const [recovery, setRecovery] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const code = String(new FormData(form).get('code') || '').trim()
    setBusy(true)
    setError('')
    try {
      const result = recovery
        ? await customerAuth.twoFactor.verifyBackupCode({ code, trustDevice: false })
        : await customerAuth.twoFactor.verifyTotp({ code, trustDevice: false })
      form.reset()
      if (result.error)
        setError(
          t(
            result.error.status === 429
              ? 'limited'
              : result.error.code === 'CODE_ALREADY_USED'
                ? 'replay'
                : 'error',
          ),
        )
      else await onVerified()
    } catch {
      setError(t('error'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form method="post" onSubmit={submit} className="space-y-4">
      <h2 className="text-xl font-semibold">{t(stepUp ? 'reauth' : 'challenge')}</h2>
      <p className="text-sm text-muted-foreground">{t(stepUp ? 'reauthHint' : 'challengeHint')}</p>
      <label className="block space-y-2 text-sm font-medium">
        <span>{t(recovery ? 'recoveryCode' : 'code')}</span>
        <input
          key={String(recovery)}
          name="code"
          autoComplete="one-time-code"
          inputMode={recovery ? 'text' : 'numeric'}
          required
          pattern={recovery ? undefined : '[0-9]{6}'}
          maxLength={recovery ? 64 : 6}
          className={input}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} className={button}>
          {t(busy ? 'working' : 'verify')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setRecovery(!recovery)
            setError('')
          }}
          className="text-sm text-brand-ink underline"
        >
          {t(recovery ? 'useApp' : 'useRecovery')}
        </button>
      </div>
      {!stepUp && <p className="text-sm text-muted-foreground">{t('recoveryHint')}</p>}
    </form>
  )
}
