'use client'

import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { customerAuth } from '@/lib/customer-auth/client'

export type PasswordAction = 'enable' | 'regenerate' | 'disable'
export type PasskeyMethod = { id: string; name: string | null; createdAt: string }
export type AuthenticatorSetup = { uri: string; qr: string }

export function useSecurityMethods() {
  const t = useTranslations('Security')
  const locale = useLocale()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [setup, setSetup] = useState<AuthenticatorSetup | null>(null)
  const [confirmation, setConfirmation] = useState<'disable' | string | null>(null)
  const [verificationOpen, setVerificationOpen] = useState(false)
  const options = { headers: { 'x-taxful-locale': locale } }

  function check(error: { code?: string; status?: number } | null | undefined) {
    if (!error) return false
    const expired =
      error.code === 'SECURITY_VERIFICATION_REQUIRED' || error.code === 'SESSION_NOT_FRESH'
    if (expired) setVerificationOpen(true)
    setError(
      t(
        error.status === 429
          ? 'limited'
          : expired
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

  async function passwordAction(event: FormEvent<HTMLFormElement>, action: PasswordAction) {
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

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const code = String(new FormData(form).get('code') || '')
    await perform(async () => {
      const result = await customerAuth.twoFactor.verifyTotp({ code, trustDevice: false }, options)
      form.reset()
      if (!check(result.error)) {
        setSetup(null)
        setCodes([])
        setNotice(t('success'))
        router.refresh()
      }
    })
  }

  async function addPasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const name = String(new FormData(form).get('name') || '').trim()
    await perform(async () => {
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
  }

  async function removePasskey(id: string) {
    await perform(async () => {
      const result = await customerAuth.passkey.deletePasskey({ id })
      if (!check(result.error)) {
        router.replace(`/${locale}/login`)
        router.refresh()
      }
    })
  }

  return {
    busy,
    error,
    notice,
    codes,
    setup,
    confirmation,
    verificationOpen,
    locale,
    passwordAction,
    activate,
    addPasskey,
    removePasskey,
    setConfirmation,
    setVerificationOpen,
    hideCodes: () => setCodes([]),
    cancelSetup: () => {
      setSetup(null)
      setCodes([])
    },
    confirmIdentity: () => {
      setVerificationOpen(false)
      setError('')
      setNotice(t('verifyDone'))
      router.refresh()
    },
  }
}

export type SecurityMethodControls = ReturnType<typeof useSecurityMethods>
