'use client'

import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { customerAuth } from '@/lib/customer-auth/client'
import { Link } from '@/i18n/navigation'
import { SecondFactor } from './second-factor'
import { buttonClass, inputClass } from './auth-form'

type Method = { id: string; name: string | null; createdAt: string }
export function SecurityMethods({ enabled, passkeys }: { enabled: boolean; passkeys: Method[] }) {
  const t = useTranslations('Security')
  const locale = useLocale()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [setup, setSetup] = useState<{ uri: string; qr: string } | null>(null)
  const [confirmation, setConfirmation] = useState<'disable' | string | null>(null)
  const options = { headers: { 'x-taxful-locale': locale } }
  function check(error: { code?: string; status?: number } | null | undefined) {
    if (!error) return false
    setError(
      t(
        error.status === 429
          ? 'limited'
          : error.code === 'SECURITY_VERIFICATION_REQUIRED' || error.code === 'SESSION_NOT_FRESH'
            ? 'expired'
            : error.code === 'REMOVE_PASSKEYS_FIRST'
              ? 'removeFirst'
              : error.code === 'CODE_ALREADY_USED'
                ? 'replay'
                : 'error',
      ),
    )
    return true
  }
  async function perform(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch {
      setError(t('error'))
    } finally {
      setBusy(false)
    }
  }
  async function passwordAction(
    event: FormEvent<HTMLFormElement>,
    action: 'enable' | 'regenerate' | 'disable',
  ) {
    event.preventDefault()
    const form = event.currentTarget
    const password = String(new FormData(form).get('password') || '')
    form.reset()
    await perform(async () => {
      if (action === 'enable') {
        const result = await customerAuth.twoFactor.enable({ password }, options)
        if (check(result.error) || result.data?.method !== 'totp') return
        const uri = result.data.totpURI
        setCodes(result.data.backupCodes)
        setSetup({ uri, qr: await QRCode.toDataURL(uri, { width: 240, margin: 2 }) })
      } else if (action === 'regenerate') {
        const result = await customerAuth.twoFactor.generateBackupCodes({ password }, options)
        if (!check(result.error) && result.data) setCodes(result.data.backupCodes)
      } else {
        const result = await customerAuth.twoFactor.disable({ password }, options)
        if (!check(result.error)) {
          await customerAuth.signOut()
          router.replace(`/${locale}/login`)
          router.refresh()
        }
      }
    })
  }
  const passwordForm = (action: 'enable' | 'regenerate' | 'disable') => (
    <form method="post" onSubmit={(e) => void passwordAction(e, action)} className="mt-4 space-y-3">
      <label className="block space-y-2 text-sm font-medium">
        <span>{t('password')}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          className={inputClass}
        />
      </label>
      <button disabled={busy} className={buttonClass}>
        {t(busy ? 'working' : action)}
      </button>
    </form>
  )
  return (
    <section className="mb-6 space-y-6 rounded-3xl border border-border bg-surface p-6">
      <div>
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('intro')}</p>
        <p className="mt-3 font-medium text-brand-ink">{t(enabled ? 'enabled' : 'off')}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-brand-ink">
          {notice}
        </p>
      )}
      <Link
        href={`/login?next=${encodeURIComponent(`/${locale}/portal/security`)}`}
        className="text-sm text-brand-ink underline"
      >
        {t('login')}
      </Link>
      {enabled && (
        <SecondFactor
          stepUp
          onVerified={() => {
            setNotice(t('verifyDone'))
            router.refresh()
          }}
        />
      )}
      {!enabled && !setup && passwordForm('enable')}
      {setup && (
        <div className="space-y-4">
          <p className="text-sm">{t('scan')}</p>
          {/* The enrollment secret is encoded locally, never sent to a QR service. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} width={240} height={240} alt={t('qr')} />
          <details>
            <summary>{t('key')}</summary>
            <code className="mt-2 block break-all select-all">
              {new URL(setup.uri).searchParams.get('secret')}
            </code>
          </details>
        </div>
      )}
      {codes.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-border p-4">
          <h3 className="font-semibold">{t('codes')}</h3>
          <p className="text-sm text-muted-foreground">{t('codesHint')}</p>
          <ul className="grid gap-2 font-mono text-sm sm:grid-cols-2">
            {codes.map((code) => (
              <li key={code} className="break-all select-all">
                {code}
              </li>
            ))}
          </ul>
          {!setup && (
            <button className={buttonClass} onClick={() => setCodes([])}>
              {t('hide')}
            </button>
          )}
        </div>
      )}
      {setup && (
        <form
          method="post"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            const code = String(new FormData(form).get('code') || '')
            void perform(async () => {
              const result = await customerAuth.twoFactor.verifyTotp(
                { code, trustDevice: false },
                options,
              )
              form.reset()
              if (!check(result.error)) {
                setSetup(null)
                setCodes([])
                setNotice(t('success'))
                router.refresh()
              }
            })
          }}
        >
          <label className="flex gap-2 text-sm">
            <input type="checkbox" required />
            {t('saved')}
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>{t('code')}</span>
            <input
              name="code"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className={inputClass}
            />
          </label>
          <button disabled={busy} className={buttonClass}>
            {t(busy ? 'working' : 'finish')}
          </button>
          <button
            type="button"
            disabled={busy}
            className="ml-3 text-sm underline"
            onClick={() => {
              setSetup(null)
              setCodes([])
            }}
          >
            {t('cancel')}
          </button>
        </form>
      )}
      {enabled && (
        <details>
          <summary className="cursor-pointer font-medium">{t('regenerate')}</summary>
          <p className="mt-2 text-sm">{t('codesHint')}</p>
          {passwordForm('regenerate')}
        </details>
      )}
      <div className="space-y-3 border-t border-border pt-5">
        <h3 className="text-lg font-semibold">{t('passkeyTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('passkeyHint')}</p>
        {passkeys.length === 0 && <p className="text-sm">{t('noKeys')}</p>}
        <ul className="divide-y divide-border">
          {passkeys.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-3 py-3">
              <span className="break-all">{key.name || 'Passkey'}</span>
              <button
                disabled={busy}
                onClick={() => setConfirmation(key.id)}
                className="text-sm text-brand-ink underline"
              >
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
        {enabled && (
          <form
            method="post"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              const name = String(new FormData(form).get('name') || '').trim()
              void perform(async () => {
                if (!window.PublicKeyCredential || !window.isSecureContext) {
                  setError(t('unsupported'))
                  return
                }
                const result = await customerAuth.passkey.addPasskey({ name })
                if (!check(result?.error)) {
                  form.reset()
                  setNotice(t('success'))
                  router.refresh()
                }
              })
            }}
          >
            <label className="block space-y-2 text-sm font-medium">
              <span>{t('name')}</span>
              <input
                name="name"
                required
                maxLength={100}
                autoComplete="off"
                className={inputClass}
              />
            </label>
            <button disabled={busy || passkeys.length >= 10} className={buttonClass}>
              {t('add')}
            </button>
          </form>
        )}
      </div>
      {enabled && (
        <button
          disabled={busy}
          onClick={() => setConfirmation('disable')}
          className="text-sm text-error underline"
        >
          {t('disable')}
        </button>
      )}
      {confirmation && (
        <div
          role="group"
          aria-label={t(confirmation === 'disable' ? 'disable' : 'remove')}
          className="space-y-3 rounded-2xl border border-border p-4"
        >
          <p className="text-sm">
            {t(confirmation === 'disable' ? 'disableWarning' : 'removeWarning')}
          </p>
          {confirmation === 'disable' ? (
            passwordForm('disable')
          ) : (
            <button
              disabled={busy}
              className={buttonClass}
              onClick={() =>
                void perform(async () => {
                  const result = await customerAuth.passkey.deletePasskey({ id: confirmation })
                  if (!check(result.error)) {
                    router.replace(`/${locale}/login`)
                    router.refresh()
                  }
                })
              }
            >
              {t('remove')}
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => setConfirmation(null)}
            className="ml-3 text-sm underline"
          >
            {t('cancel')}
          </button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{t('recoveryHint')}</p>
    </section>
  )
}
