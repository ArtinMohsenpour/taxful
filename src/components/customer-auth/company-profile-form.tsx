'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  companyProfileSchema,
  blankCompanyProfile,
  type CompanyInvoiceProfile,
} from '@/lib/documents/company-profile-schema'
import { inputClass, buttonClass } from './auth-form'
import type { documentMessages } from '../../../messages/documents'
type Key = keyof typeof documentMessages.en
export function CompanyProfileForm() {
  const t = useTranslations('Documents')
  const [organizationId, setOrganizationId] = useState('')
  const [data, setData] = useState<CompanyInvoiceProfile>(blankCompanyProfile)
  const [revision, setRevision] = useState(0),
    [canEdit, setCanEdit] = useState(false),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false)
  const [error, setError] = useState(''),
    [saved, setSaved] = useState(false),
    [invalid, setInvalid] = useState<string[]>([])
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const response = await fetch('/api/company-profile', {
        signal: controller.signal,
        cache: 'no-store',
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      if (body.profile) {
        setData(companyProfileSchema.parse(body.profile.data))
        setRevision(body.profile.revision)
      }
      setOrganizationId(body.organizationId)
      setCanEdit(body.canEdit)
      setLoading(false)
    })().catch((error) => {
      if (!controller.signal.aborted) {
        setError(error.message)
        setLoading(false)
      }
    })
    return () => controller.abort()
  }, [])
  async function save(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSaved(false)
    const parsed = companyProfileSchema.safeParse(data)
    if (!parsed.success) {
      setInvalid(parsed.error.issues.map((issue) => String(issue.path[0])))
      setError('companyProfileInvalid')
      return
    }
    setPending(true)
    setInvalid([])
    try {
      const response = await fetch('/api/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed.data, revision, organizationId }),
        signal: AbortSignal.timeout(15000),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setRevision(body.revision)
      setSaved(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'genericError')
    } finally {
      setPending(false)
    }
  }
  return (
    <section id="company" className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-xl font-semibold">{t('companySettings')}</h2>
      <p className="my-4 text-sm leading-relaxed text-muted-foreground">
        {t('companySettingsHint')}
      </p>
      {error && (
        <p role="alert" className="mb-4 text-sm text-error">
          {t(t.has(error as Key) ? (error as Key) : 'genericError')}
        </p>
      )}
      {loading ? (
        <p>{t('loading')}</p>
      ) : (
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {(Object.keys(blankCompanyProfile) as (keyof CompanyInvoiceProfile)[]).map((key) => (
              <label key={key} className="space-y-2 text-sm font-medium">
                <span>
                  {t(key)} {key === 'companyName' ? t('requiredMark') : t('optionalMark')}
                </span>
                <input
                  className={`${inputClass} ${invalid.includes(key) ? 'border-error' : ''}`}
                  aria-invalid={invalid.includes(key)}
                  required={key === 'companyName'}
                  maxLength={300}
                  disabled={!canEdit || pending}
                  value={data[key]}
                  onChange={(event) => {
                    setData({ ...data, [key]: event.target.value })
                    setSaved(false)
                  }}
                  placeholder={key === 'country' ? 'DE' : undefined}
                />
              </label>
            ))}
          </div>
          {canEdit ? (
            <button disabled={pending} className={buttonClass}>
              {t(pending ? 'savingReview' : 'saveCompany')}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">{t('companyEditRole')}</p>
          )}
          {saved && (
            <p role="status" className="text-sm text-brand-ink">
              {t('companySaved')}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
