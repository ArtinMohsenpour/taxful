'use client'

import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { customerAuth } from '@/lib/customer-auth/client'
import { buttonClass, inputClass } from './auth-form'

export function InviteForm({ organizationId, owner }: { organizationId: string; owner: boolean }) {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      const result = await customerAuth.organization.inviteMember(
        {
          organizationId,
          email: String(data.get('email')).trim(),
          role: String(data.get('role')) as 'admin' | 'member',
        },
        { headers: { 'x-taxful-locale': locale } },
      )
      setMessage(t(result.error ? 'genericError' : 'invitationSent'))
      if (!result.error) {
        form.reset()
        router.refresh()
      }
    } catch {
      setMessage(t('genericError'))
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium">
        {t('email')}
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        {t('role')}
        <select name="role" className={inputClass}>
          <option value="member">{t('member')}</option>
          <option value="reviewer">{t('reviewer')}</option>
          {owner && <option value="admin">{t('admin')}</option>}
        </select>
      </label>
      {message && (
        <p role="status" className="text-sm text-brand-ink">
          {message}
        </p>
      )}
      <button disabled={pending} className={buttonClass}>
        {pending ? t('working') : t('invite')}
      </button>
    </form>
  )
}

export function AcceptInvitation({ invitationId }: { invitationId: string }) {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  return (
    <div className="space-y-5">
      <p className="text-muted-foreground">{t('invitationIntro')}</p>
      {error && (
        <p role="alert" className="text-sm text-error">
          {t('invitationInvalid')}
        </p>
      )}
      <button
        disabled={pending}
        className={buttonClass}
        onClick={async () => {
          setPending(true)
          setError(false)
          try {
            const result = await customerAuth.organization.acceptInvitation({ invitationId })
            if (result.error) setError(true)
            else {
              await customerAuth.organization.setActive({
                organizationId: result.data.invitation.organizationId,
              })
              router.replace(`/${locale}/portal`)
              router.refresh()
            }
          } catch {
            setError(true)
          } finally {
            setPending(false)
          }
        }}
      >
        {pending ? t('working') : t('accept')}
      </button>
    </div>
  )
}

export function CancelInvitation({ invitationId }: { invitationId: string }) {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  return (
    <span>
      <button
        className="text-sm text-brand-ink underline disabled:opacity-60"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError(false)
          try {
            const result = await customerAuth.organization.cancelInvitation({ invitationId })
            if (result.error) setError(true)
            else router.refresh()
          } catch {
            setError(true)
          } finally {
            setPending(false)
          }
        }}
      >
        {pending ? t('working') : t('cancelInvitation')}
      </button>
      {error && (
        <span role="alert" className="block text-sm text-error">
          {t('genericError')}
        </span>
      )}
    </span>
  )
}
