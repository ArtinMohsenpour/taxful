'use client'

import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { customerAuth } from '@/lib/customer-auth/client'
import { inputClass, buttonClass } from './auth-form'

export function WorkspaceForm() {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const name = String(new FormData(event.currentTarget).get('companyName') || '').trim()
    try {
      const slug = `${
        name
          .normalize('NFKD')
          .replace(/[^a-zA-Z0-9]+/g, '-')
          .toLowerCase()
          .slice(0, 48)
          .replace(/^-|-$/g, '') || 'company'
      }-${crypto.randomUUID().slice(0, 8)}`
      const result = await customerAuth.organization.create({ name, slug })
      if (result.error) setError(t('genericError'))
      else {
        router.replace(`/${locale}/portal`)
        router.refresh()
      }
    } catch {
      setError(t('genericError'))
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <label className="block space-y-2 text-sm font-medium">
        {t('companyName')}
        <input
          name="companyName"
          autoComplete="organization"
          required
          maxLength={150}
          className={inputClass}
        />
      </label>
      <button disabled={pending} className={buttonClass}>
        {pending ? t('working') : t('createWorkspace')}
      </button>
    </form>
  )
}

export function WorkspaceSwitcher({
  organizations,
  activeId,
}: {
  organizations: { id: string; name: string }[]
  activeId: string
}) {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  return (
    <div>
      <label className="block space-y-2 text-sm font-medium">
        {t('switchWorkspace')}
        <select
          className={inputClass}
          value={activeId}
          disabled={pending}
          onChange={async (event) => {
            setPending(true)
            setError(false)
            try {
              const result = await customerAuth.organization.setActive({
                organizationId: event.target.value,
              })
              if (result.error) setError(true)
              else router.refresh()
            } catch {
              setError(true)
            } finally {
              setPending(false)
            }
          }}
        >
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {t('genericError')}
        </p>
      )}
    </div>
  )
}
