'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { customerAuth } from '@/lib/customer-auth/client'
import { buttonClass } from './auth-form'
import { teamRequest } from './team-request'
import { announceSignOut } from '@/lib/customer-auth/session-timeout'

export function InvitationAccountSwitch({
  next,
  maskedEmail,
  accountExists,
}: {
  next: string
  maskedEmail: string
  accountExists: boolean
}) {
  const t = useTranslations('Team'),
    locale = useLocale(),
    router = useRouter()
  const [pending, setPending] = useState(false),
    [error, setError] = useState(false)
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-primary/10 p-4">{t('wrongAccount', { email: maskedEmail })}</p>
      {error && (
        <p role="alert" className="text-sm text-error">
          {t('genericError')}
        </p>
      )}
      <button
        className={buttonClass}
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError(false)
          try {
            const result = await customerAuth.signOut()
            if (result.error) throw new Error()
            announceSignOut('manual')
            router.replace(
              `/${locale}/${accountExists ? 'login' : 'signup'}?next=${encodeURIComponent(next)}`,
            )
            router.refresh()
          } catch {
            setError(true)
            setPending(false)
          }
        }}
      >
        {t(pending ? 'working' : accountExists ? 'signInInvitedAccount' : 'createInvitedAccount')}
      </button>
    </div>
  )
}

export function AcceptInvitation({ invitationId }: { invitationId: string }) {
  const t = useTranslations('Team'),
    locale = useLocale(),
    router = useRouter()
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [declined, setDeclined] = useState(false)
  async function respond(action: 'accept' | 'reject') {
    setPending(true)
    setError('')
    try {
      const result = await teamRequest({ action, invitationId })
      if (action === 'reject') setDeclined(true)
      else {
        const active = await customerAuth.organization.setActive({
          organizationId: result.organizationId!,
        })
        if (active.error) throw new Error('genericError')
        router.replace('/' + locale + '/portal')
        router.refresh()
      }
    } catch (e) {
      setError(
        e instanceof Error && t.has(e.message as Parameters<typeof t.has>[0])
          ? e.message
          : 'genericError',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="space-y-5">
      <p className="text-muted-foreground">{t(declined ? 'declinedNotice' : 'invitationIntro')}</p>
      {error && (
        <p role="alert" className="rounded-xl bg-error/5 p-3 text-sm text-error">
          {t(error as Parameters<typeof t>[0])}
        </p>
      )}
      {!declined && (
        <div className="flex flex-wrap gap-3">
          <button disabled={pending} className={buttonClass} onClick={() => void respond('accept')}>
            {t(pending ? 'working' : 'accept')}
          </button>
          <button
            disabled={pending}
            className="rounded-full border border-border px-5 py-3 text-sm hover:bg-accent disabled:opacity-50"
            onClick={() => void respond('reject')}
          >
            {t('reject')}
          </button>
        </div>
      )}
    </div>
  )
}
