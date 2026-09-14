'use client'

import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { customerAuth } from '@/lib/customer-auth/client'
import { buttonClass, inputClass } from './auth-form'
import { WorkspaceSelect } from './workspace-select'

export function InviteForm({ organizationId, owner }: { organizationId: string; owner: boolean }) {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<'sent' | 'error' | null>(null)
  const [role, setRole] = useState('member')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setStatus(null)
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
      setStatus(result.error ? 'error' : 'sent')
      if (!result.error) {
        form.reset()
        setRole('member')
        router.refresh()
      }
    } catch {
      setStatus('error')
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end"
    >
      <label className="block">
        {/* Matches the role select's label so both fields line up. */}
        <span className="mb-2 block text-xs font-semibold tracking-wide text-muted-foreground">
          {t('email')}
        </span>
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="off"
          className={`${inputClass} sm:text-sm`}
        />
      </label>
      <WorkspaceSelect
        label={t('role')}
        name="role"
        value={role}
        onChange={setRole}
        disabled={pending}
        options={[
          { value: 'member', label: t('member') },
          { value: 'reviewer', label: t('reviewer') },
          ...(owner ? [{ value: 'admin', label: t('admin') }] : []),
        ]}
      />
      <button disabled={pending} className={`${buttonClass} w-full sm:h-12.5 sm:w-auto`}>
        {pending ? t('working') : t('sendInvitation')}
      </button>
      {status && (
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className={`rounded-xl p-3 text-sm sm:col-span-3 ${status === 'error' ? 'border border-error/25 bg-error/5 text-error' : 'bg-primary/10 text-brand-ink'}`}
        >
          {t(status === 'error' ? 'genericError' : 'invitationSent')}
        </p>
      )}
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
    <span className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        className="rounded-full border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
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
        <span role="alert" className="text-xs text-error">
          {t('genericError')}
        </span>
      )}
    </span>
  )
}
