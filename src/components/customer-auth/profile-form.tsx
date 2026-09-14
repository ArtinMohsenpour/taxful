'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { customerAuth } from '@/lib/customer-auth/client'
import { announceSignOut } from '@/lib/customer-auth/session-timeout'
import { buttonClass, inputClass } from './auth-form'
import { Icon } from './icon'

export function ProfileForm({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null
  lastName?: string | null
  email: string
}) {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      const data = new FormData(event.currentTarget)
      const result = await customerAuth.updateUser({
        firstName: String(data.get('firstName') || '').trim(),
        lastName: String(data.get('lastName') || '').trim(),
      })
      setMessage(t(result.error ? 'genericError' : 'saved'))
      if (!result.error) router.refresh()
    } catch {
      setMessage(t('genericError'))
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {(['firstName', 'lastName'] as const).map((field) => (
          <label key={field} className="block space-y-2 text-sm font-medium">
            {t(field)}
            <input
              name={field}
              defaultValue={(field === 'firstName' ? firstName : lastName) || ''}
              required
              maxLength={75}
              autoComplete={field === 'firstName' ? 'given-name' : 'family-name'}
              className={inputClass}
            />
          </label>
        ))}
      </div>
      <div>
        <p className="text-sm font-medium">{t('email')}</p>
        <p className="mt-2 break-all text-muted-foreground">{email}</p>
      </div>
      {message && (
        <p role="status" className="text-sm text-brand-ink">
          {message}
        </p>
      )}
      <button disabled={pending} className={buttonClass}>
        {pending ? t('working') : t('saveProfile')}
      </button>
    </form>
  )
}

export function ChangePasswordForm() {
  const t = useTranslations('Auth')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    const form = event.currentTarget
    const data = new FormData(form)
    if (data.get('newPassword') !== data.get('confirmPassword')) {
      setMessage(t('passwordMismatch'))
      setPending(false)
      return
    }
    try {
      const result = await customerAuth.changePassword({
        currentPassword: String(data.get('currentPassword')),
        newPassword: String(data.get('newPassword')),
        revokeOtherSessions: true,
      })
      setMessage(t(result.error ? 'genericError' : 'passwordChanged'))
      if (!result.error) form.reset()
    } catch {
      setMessage(t('genericError'))
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((name) => (
        <label key={name} className="block space-y-2 text-sm font-medium">
          {t(name)}
          <input
            name={name}
            type="password"
            autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
            required
            minLength={name === 'currentPassword' ? 1 : 15}
            maxLength={128}
            className={inputClass}
          />
        </label>
      ))}
      <p className="text-xs text-muted-foreground">{t('passwordHelp')}</p>
      {message && (
        <p role="status" className="text-sm text-brand-ink">
          {message}
        </p>
      )}
      <button disabled={pending} className={buttonClass}>
        {pending ? t('working') : t('changePassword')}
      </button>
    </form>
  )
}

export function LogoutButton() {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  return (
    <div>
      <button
        disabled={pending}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
        onClick={async () => {
          setPending(true)
          setError(false)
          try {
            const result = await customerAuth.signOut()
            if (result.error) setError(true)
            else {
              announceSignOut('manual')
              router.replace(`/${locale}/login`)
              router.refresh()
            }
          } catch {
            setError(true)
          } finally {
            setPending(false)
          }
        }}
      >
        <Icon name="logout" />
        {pending ? t('working') : t('logout')}
      </button>
      {error && (
        <p role="alert" className="text-sm text-error">
          {t('genericError')}
        </p>
      )}
    </div>
  )
}
