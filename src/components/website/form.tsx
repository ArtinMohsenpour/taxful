'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import type { WebsiteForm } from '@/lib/website/types'
import type { WebsiteLocale, WebsitePageSlug } from '@/lib/website/catalog'
import { WebsiteFormField } from './form-field'

const labels = {
  de: {
    required: '* Pflichtfeld',
    sending: 'Wird gesendet …',
    invalid: 'Bitte prüfe die markierten Felder.',
    failed: 'Die Nachricht konnte nicht gespeichert werden. Bitte versuche es erneut.',
    limited: 'Zu viele Anfragen. Bitte versuche es später erneut.',
    preview: 'Vorschau: Das Senden ist deaktiviert.',
    form: 'Formular',
  },
  en: {
    required: '* Required field',
    sending: 'Sending…',
    invalid: 'Please check the marked fields.',
    failed: 'Your message could not be saved. Please try again.',
    limited: 'Too many requests. Please try again later.',
    preview: 'Preview: submissions are disabled.',
    form: 'Form',
  },
}

export function WebsiteFormView({
  form,
  locale,
  page,
  preview,
}: {
  form: WebsiteForm
  locale: WebsiteLocale
  page: WebsitePageSlug
  preview: boolean
}) {
  const prefix = useId()
  const reference = useRef<string | null>(null)
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<string[]>([])
  const t = labels[locale]
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || preview) return
    const element = event.currentTarget
    const data = new FormData(element)
    const answers = Object.fromEntries(
      form.fields.map((field) => [
        field.key,
        field.type === 'checkbox' ? data.has(field.key) : String(data.get(field.key) || ''),
      ]),
    )
    reference.current ||= crypto.randomUUID()
    setPending(true)
    setError('')
    setInvalid([])
    try {
      const response = await fetch('/api/website-forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          reference: reference.current,
          locale,
          page,
          website: data.get('website') || '',
          answers,
        }),
      })
      const result: { accepted?: boolean; fields?: string[] } = await response.json()
      if (!response.ok || !result.accepted) {
        setInvalid(result.fields || [])
        setError(response.status === 429 ? t.limited : result.fields?.length ? t.invalid : t.failed)
        if (result.fields?.length)
          element.querySelector<HTMLElement>(`[name="${result.fields[0]}"]`)?.focus()
        // A validation failure did not create a message; allow corrected answers.
        if (response.status === 400) reference.current = null
        return
      }
      setSuccess(true)
    } catch {
      setError(t.failed)
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
      {form.title?.trim() && <h3 className="text-xl font-semibold tracking-tight">{form.title}</h3>}
      {form.description?.trim() && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{form.description}</p>
      )}
      {success ? (
        <p role="status" className="mt-6 rounded-2xl bg-primary/15 p-4 text-brand-ink">
          {form.successMessage}
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="mt-6 space-y-5"
          aria-label={form.title || t.form}
          aria-busy={pending}
        >
          {form.fields.some((field) => field.required) && (
            <p className="text-xs text-muted-foreground">{t.required}</p>
          )}
          {form.fields.map((field) => (
            <WebsiteFormField
              key={field.id || field.key}
              field={field}
              prefix={prefix}
              invalid={invalid.includes(field.key)}
            />
          ))}
          <div hidden aria-hidden="true">
            <label htmlFor={`${prefix}-website`}>Website</label>
            <input
              id={`${prefix}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || preview}
            className="min-h-12 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 disabled:cursor-default disabled:opacity-60"
          >
            {pending ? t.sending : form.submitLabel}
          </button>
          {preview && <p className="text-xs text-muted-foreground">{t.preview}</p>}
        </form>
      )}
    </div>
  )
}
