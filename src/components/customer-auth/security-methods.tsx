'use client'

import { useEffect, useId, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { SecondFactor } from './second-factor'
import { secondaryButtonClass } from './security/method-card'
import { AuthenticatorSettings } from './security/authenticator-settings'
import { PasskeySettings } from './security/passkey-settings'
import { RecoverySettings } from './security/recovery-settings'
import { useSecurityMethods, type PasskeyMethod } from './security/use-security-methods'

export function SecurityMethods({
  enabled,
  passkeys,
}: {
  enabled: boolean
  passkeys: PasskeyMethod[]
}) {
  const t = useTranslations('Security')
  const methods = useSecurityMethods()
  const { error, notice, setup, verificationOpen, locale } = methods
  const verificationId = useId()
  const verificationPanel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (verificationOpen && enabled) verificationPanel.current?.focus()
  }, [verificationOpen, enabled])

  return (
    <section
      aria-labelledby="security-methods-heading"
      className="mb-6 rounded-3xl border border-border bg-surface p-4 sm:p-6"
    >
      <div className="mb-6">
        <h2 id="security-methods-heading" className="text-xl font-semibold tracking-tight">
          {t('title')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t(enabled ? 'introEnabled' : 'intro')}
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-error/25 bg-error/5 p-4 text-sm leading-relaxed text-error"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-2xl bg-primary/15 p-4 text-sm leading-relaxed text-brand-ink"
        >
          {notice}
        </p>
      )}

      <div className="mb-5 rounded-2xl border border-border bg-background/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t(enabled ? 'changesHint' : 'setupPasswordHint')}
          </p>
          {enabled ? (
            <button
              type="button"
              aria-expanded={verificationOpen}
              aria-controls={verificationId}
              className={secondaryButtonClass}
              onClick={() => methods.setVerificationOpen(!verificationOpen)}
            >
              {t(verificationOpen ? 'closeVerification' : 'reauth')}
            </button>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(`/${locale}/portal/security`)}`}
              className="text-sm font-semibold text-brand-ink underline underline-offset-4"
            >
              {t('login')}
            </Link>
          )}
        </div>
        {enabled && verificationOpen && (
          <div
            id={verificationId}
            ref={verificationPanel}
            tabIndex={-1}
            className="mt-5 max-w-xl border-t border-border pt-5"
          >
            <SecondFactor stepUp onVerified={methods.confirmIdentity} />
            <Link
              href={`/login?next=${encodeURIComponent(`/${locale}/portal/security`)}`}
              className="mt-4 inline-block text-sm text-brand-ink underline underline-offset-4"
            >
              {t('login')}
            </Link>
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <AuthenticatorSettings enabled={enabled} passkeys={passkeys} methods={methods} />

        <PasskeySettings enabled={enabled} passkeys={passkeys} methods={methods} />

        {!setup && <RecoverySettings enabled={enabled} methods={methods} />}
      </div>
      {enabled && (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{t('recoveryHint')}</p>
      )}
    </section>
  )
}
