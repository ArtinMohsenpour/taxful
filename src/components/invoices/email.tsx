'use client'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { buttonClass, inputClass } from '@/components/customer-auth/auth-form'
import type { EmailContent } from '@/lib/invoice-email/schema'
import { EmailEditor, EmailHtmlPreview, emailDefaults, resolveEmailContent } from './email-editor'
import type { invoiceEmailMessages } from '../../../messages/invoice-email'

type Key = keyof typeof invoiceEmailMessages.en
type Settings = {
  enabled: boolean
  canManage: boolean
  settings: null | { sender: string; sender_name: string; revision: number }
}
type Delivery = {
  id: string
  recipient: string
  sender: string
  sender_name: string
  subject: string
  body: string
  status: string
  created_at: string
  revision: number
  attachment_sha256: string
  error_code: string | null
  html: string
  message_sha256: string | null
  provider_id: string | null
  created_by: string | null
  confirmations: { resend?: boolean; recipientChanged?: boolean }
  events: { status: string; at: string; source: string; actorId: string | null }[]
}
type History = { exports: { id: string; format: string; sha256: string }[]; deliveries: Delivery[] }
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'genericError')
  return body as T
}
function useEmailError() {
  const t = useTranslations('InvoiceEmail')
  const [error, setError] = useState('')
  return {
    setError,
    error: error ? (
      <p role="alert" className="text-sm text-error">
        {t(t.has(error as Key) ? (error as Key) : 'genericError')}
      </p>
    ) : null,
  }
}
export function InvoiceEmailSettings({
  organizationId,
  onSaved,
}: {
  organizationId: string
  onSaved?: () => Promise<void>
}) {
  const t = useTranslations('InvoiceEmail')
  const [loaded, setLoaded] = useState<Settings | null>(null)
  const [sender, setSender] = useState(''),
    [name, setName] = useState('')
  const [pending, setPending] = useState(false),
    [saved, setSaved] = useState(false)
  const { error, setError } = useEmailError()
  useEffect(() => {
    const controller = new AbortController()
    request<Settings>('/api/invoice-email', { signal: controller.signal })
      .then((value) => {
        setLoaded(value)
        setSender(value.settings?.sender || '')
        setName(value.settings?.sender_name || '')
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [organizationId, setError])
  return (
    <section className="mt-8 space-y-4 rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-xl font-medium">{t('settingsTitle')}</h2>
      {error}
      {loaded && (
        <>
          <p className="text-sm text-muted-foreground">
            {t(loaded.enabled ? 'local' : 'unavailable')}
          </p>
          {loaded.enabled && (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                setPending(true)
                setError('')
                setSaved(false)
                try {
                  const result = await request<{ revision: number }>('/api/invoice-email', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      organizationId,
                      sender,
                      senderName: name,
                      revision: loaded.settings?.revision || 0,
                    }),
                  })
                  setLoaded({
                    ...loaded,
                    settings: { sender, sender_name: name, revision: result.revision },
                  })
                  setSaved(true)
                  await onSaved?.()
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'genericError')
                } finally {
                  setPending(false)
                }
              }}
            >
              <p className="text-sm text-muted-foreground">{t('settingsHint')}</p>
              <fieldset disabled={pending || !loaded.canManage} className="space-y-4">
                <label className="block text-sm">
                  {t('senderName')}
                  <input
                    className={inputClass}
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setSaved(false)
                    }}
                  />
                </label>
                <label className="block text-sm">
                  {t('sender')}
                  <input
                    className={inputClass}
                    type="email"
                    required
                    maxLength={254}
                    value={sender}
                    onChange={(e) => {
                      setSender(e.target.value)
                      setSaved(false)
                    }}
                  />
                </label>
                {loaded.canManage && (
                  <button className={buttonClass} type="submit">
                    {t('save')}
                  </button>
                )}
              </fieldset>
              {saved && <p role="status">{t('saved')}</p>}
            </form>
          )}
        </>
      )}
    </section>
  )
}

export function InvoiceEmailPanel({
  documentId,
  organizationId,
  recipientEmail,
  number,
  canSend,
  onAccepted,
  preferredFormat,
}: {
  documentId: string
  organizationId: string
  recipientEmail: string
  number: string
  canSend: boolean
  onAccepted: () => Promise<void>
  preferredFormat?: 'zugferd' | 'xrechnung'
}) {
  const t = useTranslations('InvoiceEmail'),
    locale = useLocale()
  const [settings, setSettings] = useState<Settings | null>(null),
    [history, setHistory] = useState<History | null>(null)
  const [recipient, setRecipient] = useState(recipientEmail),
    [format, setFormat] = useState('')
  const [language, setLanguage] = useState<'de' | 'en'>(locale)
  const [drafts, setDrafts] = useState({ de: emailDefaults('de'), en: emailDefaults('en') })
  const [rendered, setRendered] = useState<{
    content: EmailContent
    hash: string
    previewHtml: string
  } | null>(null)
  const [confirmedAddress, setConfirmedAddress] = useState('')
  const [reviewPrevious, setReviewPrevious] = useState<string | null>(null)
  const [preview, setPreview] = useState(false),
    [checked, setChecked] = useState(false),
    [resend, setResend] = useState(false)
  const [pending, setPending] = useState(false),
    [success, setSuccess] = useState(false)
  const [editorBusy, setEditorBusy] = useState(false)
  const { error, setError } = useEmailError()
  const key = useRef<{ payload: string; id: string } | null>(null)
  const notified = useRef<string | null>(null)
  useEffect(() => {
    const accepted = history?.deliveries.find((d) => d.status === 'accepted')
    if (!accepted || notified.current === accepted.id) return
    notified.current = accepted.id
    void onAccepted().catch(() => setError('genericError'))
  }, [history, onAccepted, setError])
  async function refresh() {
    const [s, h] = await Promise.all([
      request<Settings>('/api/invoice-email'),
      request<History>('/api/invoice-email?documentId=' + documentId),
    ])
    setSettings(s)
    setHistory(h)
    setFormat((current) =>
      h.exports.some((e) => e.id === current) ? current : h.exports[0]?.id || '',
    )
  }
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      request<Settings>('/api/invoice-email', { signal: controller.signal }),
      request<History>('/api/invoice-email?documentId=' + documentId, {
        signal: controller.signal,
      }),
    ])
      .then(([s, h]) => {
        setSettings(s)
        setHistory(h)
        setFormat(
          h.exports.find(
            (e) =>
              e.format ===
              (preferredFormat === 'xrechnung' ? 'xrechnung-ubl-3.0.2' : 'zugferd-en16931'),
          )?.id ||
            h.exports[0]?.id ||
            '',
        )
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [documentId, preferredFormat, setError])
  useEffect(() => {
    if (!history?.deliveries.some((d) => ['queued', 'sending'].includes(d.status))) return
    const timer = setTimeout(() => {
      request<History>('/api/invoice-email?documentId=' + documentId)
        .then(setHistory)
        .catch(() => setError('genericError'))
    }, 2500)
    return () => clearTimeout(timer)
  }, [history, documentId, setError])
  const sender = settings?.settings
  const message = rendered?.content
  const recipientChanged = [recipientEmail, history?.deliveries[0]?.recipient]
    .filter((v) => v !== undefined)
    .some((v) => v?.trim().toLowerCase() !== recipient.trim().toLowerCase())
  const busy = history?.deliveries.some((d) => ['queued', 'sending'].includes(d.status))
  return (
    <section className="mt-5 space-y-4 border-t border-border pt-5">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      {error}
      {settings && (
        <p className="text-sm text-muted-foreground">
          {t(settings.enabled ? 'local' : 'unavailable')}
        </p>
      )}
      {settings?.enabled &&
        !sender &&
        (settings.canManage ? (
          <div>
            <p className="text-sm">{t('senderInline')}</p>
            <InvoiceEmailSettings organizationId={organizationId} onSaved={refresh} />
          </div>
        ) : (
          <p className="text-sm">{t('senderAsk')}</p>
        ))}
      {history && !history.exports.length && <p className="text-sm">{t('exportFirst')}</p>}
      {settings?.enabled && sender && history && format && canSend && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (editorBusy) return
            setError('')
            setSuccess(false)
            if (!preview) {
              setPending(true)
              try {
                const result = await request<{
                  content: EmailContent
                  hash: string
                  previewHtml: string
                }>('/api/invoice-email/composer?action=preview', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                    resolveEmailContent(drafts[language], number, sender.sender_name),
                  ),
                })
                setRendered(result)
                setReviewPrevious(history.deliveries[0]?.id || null)
                setChecked(false)
                setResend(false)
                setConfirmedAddress('')
                setPreview(true)
              } catch (error) {
                setError(error instanceof Error ? error.message : 'genericError')
              } finally {
                setPending(false)
              }
              return
            }
            setPending(true)
            const payload = {
              organizationId,
              documentId,
              exportId: format,
              recipient,
              locale: language,
              note: '',
              content: rendered?.content,
              previewHash: rendered?.hash,
              acknowledgeResend: resend,
              confirmedRecipientChange: confirmedAddress,
              senderRevision: sender.revision,
              acknowledgeRecipient: checked,
              previousDeliveryId: reviewPrevious,
            }
            const serialized = JSON.stringify(payload)
            if (key.current?.payload !== serialized)
              key.current = { payload: serialized, id: crypto.randomUUID() }
            try {
              await request('/api/invoice-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, requestKey: key.current.id }),
              })
              setPreview(false)
              setChecked(false)
              setResend(false)
              setSuccess(true)
              await refresh()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'genericError')
            } finally {
              setPending(false)
            }
          }}
          className="space-y-4"
        >
          <div hidden={preview}>
            <fieldset className="space-y-4" disabled={pending || busy || editorBusy}>
              <label className="block text-sm">
                {t('recipient')}
                <input
                  className={inputClass}
                  type="email"
                  required
                  maxLength={254}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                {t('format')}
                <select
                  aria-label={t('format')}
                  className={inputClass}
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  {history.exports.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.format === 'zugferd-en16931' ? 'ZUGFeRD · PDF' : 'XRechnung · XML'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                {t('language')}
                <select
                  aria-label={t('language')}
                  className={inputClass}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'de' | 'en')}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </label>
              <EmailEditor
                number={number}
                company={sender.sender_name}
                onBusy={setEditorBusy}
                active={!preview}
                organizationId={organizationId}
                language={language}
                value={drafts[language]}
                onChange={(v) => setDrafts((current) => ({ ...current, [language]: v }))}
                onError={setError}
                disabled={pending || !!busy}
              />
              <button className={buttonClass} type="submit">
                {t('preview')}
              </button>
            </fieldset>
          </div>
          {preview && message && (
            <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm break-words">
                {t('from')}: {sender.sender_name} &lt;{sender.sender}&gt;
              </p>
              <p className="text-sm break-words">
                {t('to')}: {recipient}
              </p>
              <p className="font-medium break-words">{message.subject}</p>
              {rendered?.previewHtml && (
                <EmailHtmlPreview html={rendered.previewHtml} title={t('preview')} />
              )}
              <details>
                <summary className="cursor-pointer text-sm">{t('plainText')}</summary>
                <p className="mt-2 text-sm break-words whitespace-pre-wrap">{message.body}</p>
              </details>
              <p className="text-sm">
                {t('format')}: {history.exports.find((e) => e.id === format)?.format}
              </p>
              {recipientChanged && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('mismatch')}</p>
                  <label className="block text-sm">
                    {t('confirmAddress')}
                    <input
                      type="email"
                      className={inputClass}
                      value={confirmedAddress}
                      onChange={(e) => setConfirmedAddress(e.target.value)}
                      disabled={pending}
                    />
                  </label>
                </div>
              )}
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  disabled={pending}
                />
                {t('recipientCheck')}
              </label>
              {!!history.deliveries.length && (
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={resend}
                    onChange={(e) => setResend(e.target.checked)}
                    disabled={pending}
                  />
                  {t('resendCheck')}
                </label>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  className={buttonClass}
                  disabled={
                    pending ||
                    busy ||
                    !checked ||
                    (!!history.deliveries.length && !resend) ||
                    (recipientChanged &&
                      confirmedAddress.trim().toLowerCase() !== recipient.trim().toLowerCase())
                  }
                  type="submit"
                >
                  {t('confirm')}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border px-4 py-2"
                  disabled={pending}
                  onClick={() => {
                    setPreview(false)
                    setChecked(false)
                    setResend(false)
                  }}
                >
                  {t('back')}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
      {success && <p role="status">{t('success')}</p>}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{t('history')}</h3>
        <button
          type="button"
          className="text-sm underline"
          disabled={pending}
          onClick={() => {
            setPreview(false)
            setChecked(false)
            setResend(false)
            void refresh().catch(() => setError('genericError'))
          }}
        >
          {t('refresh')}
        </button>
      </div>
      {history?.deliveries.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}
      <p className="text-xs text-muted-foreground">{t('pendingHint')}</p>
      {history?.deliveries.map((d) => (
        <article
          key={d.id}
          className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm"
        >
          <p className="font-medium" role="status">
            {t(d.status as Key)}
          </p>
          <p className="break-words">
            {d.recipient} ·{' '}
            {new Date(d.created_at).toLocaleString(locale, { timeZone: 'Europe/Berlin' })}
          </p>
          {d.error_code && (
            <p>{t(t.has(d.error_code as Key) ? (d.error_code as Key) : 'genericError')}</p>
          )}
          <ol className="space-y-2 border-l border-border pl-4" aria-label={t('timeline')}>
            {d.events?.map((e, i) => (
              <li key={i}>
                <span className="font-medium">
                  {e.source === 'simulation' ? `${t('simulation')}: ` : ''}
                  {t(e.status as Key)}
                </span>{' '}
                ·{' '}
                <time dateTime={e.at}>
                  {new Date(e.at).toLocaleString(locale, { timeZone: 'Europe/Berlin' })}
                </time>
              </li>
            ))}
          </ol>
          <details>
            <summary className="cursor-pointer">{t('evidence')}</summary>
            <div className="mt-3 space-y-2 break-words">
              <p>
                {t('from')}: {d.sender_name} &lt;{d.sender}&gt;
              </p>
              <p>
                {t('subject')}: {d.subject}
              </p>
              <p className="whitespace-pre-wrap">{d.body}</p>
              {d.html && (
                <details>
                  <summary>{t('htmlCode')}</summary>
                  <pre className="max-h-64 overflow-auto text-xs whitespace-pre-wrap">{d.html}</pre>
                </details>
              )}
              <p>
                {t('deliveryId')}: {d.id}
              </p>
              <p>
                {t('actor')}: {d.created_by || '—'}
              </p>
              <p>
                {t('providerId')}: {d.provider_id || '—'}
              </p>
              {d.message_sha256 && (
                <p className="break-all">
                  {t('messageHash')}: {d.message_sha256}
                </p>
              )}
              {d.confirmations.resend && <p>{t('resendRecorded')}</p>}
              {d.confirmations.recipientChanged && <p>{t('recipientRecorded')}</p>}
              <p>
                {t('revision')}: {d.revision}
              </p>
              <p className="break-all">
                {t('hash')}: {d.attachment_sha256}
              </p>
            </div>
          </details>
          {settings?.enabled && settings.canManage && d.status === 'accepted' && (
            <details>
              <summary className="cursor-pointer">{t('testEvents')}</summary>
              <p className="my-2 text-xs">{t('testEventsHint')}</p>
              <div className="flex flex-wrap gap-3">
                {(['delivered', 'bounced', 'complained'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={pending}
                    className="rounded-full border border-border px-3 py-2 text-xs"
                    onClick={async () => {
                      setPending(true)
                      setError('')
                      try {
                        await request('/api/invoice-email', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            deliveryId: d.id,
                            eventKey: crypto.randomUUID(),
                            status,
                          }),
                        })
                        await refresh()
                      } catch (error) {
                        setError(error instanceof Error ? error.message : 'genericError')
                      } finally {
                        setPending(false)
                      }
                    }}
                  >
                    {t(status)}
                  </button>
                ))}
              </div>
            </details>
          )}
        </article>
      ))}
    </section>
  )
}
