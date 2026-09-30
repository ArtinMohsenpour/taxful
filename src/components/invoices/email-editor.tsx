'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { inputClass } from '@/components/customer-auth/auth-form'
import type { EmailContent } from '@/lib/invoice-email/schema'
import {
  emailDefaults,
  resolveEmailContent,
  visualDefaults,
  withVisualDesign,
  type VisualEmail,
  type EmailBlock,
} from '@/lib/invoice-email/visual'
export { emailDefaults, resolveEmailContent } from '@/lib/invoice-email/visual'

export function EmailHtmlPreview({ html, title }: { html: string; title: string }) {
  return (
    <iframe
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      className="h-[28rem] w-full rounded-xl border border-border bg-white"
      srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`}
    />
  )
}
type Template = EmailContent & { locale: 'de' | 'en'; revision: number }
type Props = {
  organizationId: string
  language: 'de' | 'en'
  value: EmailContent
  number: string
  company: string
  onChange: (v: EmailContent) => void
  onError: (v: string) => void
  onBusy: (v: boolean) => void
  disabled: boolean
  active: boolean
}
export function EmailEditor({
  organizationId,
  language,
  value,
  number,
  company,
  onChange,
  onError,
  onBusy,
  disabled,
  active,
}: Props) {
  const t = useTranslations('InvoiceEmail')
  const [templates, setTemplates] = useState<Template[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState('')
  const [live, setLive] = useState<{ html: string; subject: string; payload: string } | null>(null)
  const [liveError, setLiveError] = useState('')
  const latest = useRef({ value, onChange })
  const initialized = useRef(new Set<string>())
  useEffect(() => {
    latest.current = { value, onChange }
  }, [value, onChange])
  useEffect(() => {
    onBusy(pending || !loaded)
    return () => onBusy(false)
  }, [pending, loaded, onBusy])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/invoice-email/composer', { signal: controller.signal, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('genericError')
        const data = await r.json()
        setTemplates(data.templates)
        setCanManage(data.canManage)
      })
      .catch(() => {
        if (!controller.signal.aborted) onError('genericError')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true)
      })
    return () => controller.abort()
  }, [organizationId, onError])
  useEffect(() => {
    if (!loaded || initialized.current.has(language)) return
    initialized.current.add(language)
    const template = templates.find((item) => item.locale === language)
    if (
      template &&
      JSON.stringify(latest.current.value) === JSON.stringify(emailDefaults(language))
    ) {
      const { subject, body, html, logoId, design } = template
      latest.current.onChange({ subject, body, html, logoId, design })
    }
  }, [loaded, language, templates])
  const previewPayload = JSON.stringify(resolveEmailContent(value, number, company))
  useEffect(() => {
    if (!active || !loaded) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch('/api/invoice-email/composer?action=preview', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: previewPayload,
      })
        .then(async (r) => {
          if (!r.ok) throw new Error('preview')
          const data = await r.json()
          if (!controller.signal.aborted)
            setLive({
              html: data.previewHtml,
              subject: data.content.subject,
              payload: previewPayload,
            })
        })
        .catch(() => {
          if (!controller.signal.aborted) setLiveError(previewPayload)
        })
    }, 700)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [previewPayload, active, loaded])
  const template = templates.find((item) => item.locale === language)
  const design = value.design
  function update(patch: Partial<EmailContent>) {
    setSaved('')
    onChange({ ...value, ...patch })
  }
  function updateDesign(patch: Partial<VisualEmail>) {
    if (design) {
      setSaved('')
      onChange(withVisualDesign(value, { ...design, ...patch }))
    }
  }
  function move(block: EmailBlock, delta: number) {
    if (!design) return
    const order = [...design.order],
      index = order.indexOf(block),
      next = index + delta
    if (next < 0 || next >= order.length) return
    ;[order[index], order[next]] = [order[next], order[index]]
    updateDesign({ order })
  }
  const fields = [
    'name',
    'position',
    'pronouns',
    'company',
    'address',
    'phone',
    'mobile',
    'custom',
  ] as const
  const secondary = 'rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50'
  return (
    <div className="space-y-5">
      <fieldset className="space-y-4" disabled={disabled || pending || !loaded}>
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-accent p-3">
          <span className="text-sm">
            {t(template ? 'templateAvailable' : 'templateNew', {
              language: language === 'de' ? 'Deutsch' : 'English',
            })}
          </span>
          {template && (
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                const { subject, body, html, logoId, design } = template
                onChange({ subject, body, html, logoId, design })
                setSaved('')
              }}
            >
              {t('loadTemplate')}
            </button>
          )}
        </div>
        <label className="block text-sm">
          {t('subject')}
          <input
            className={inputClass}
            required
            maxLength={240}
            value={value.subject}
            onChange={(e) => update({ subject: e.target.value })}
          />
        </label>
        {design ? (
          <>
            <label className="block text-sm">
              {t('messageText')}
              <textarea
                aria-label={t('messageText')}
                className={inputClass}
                required
                rows={6}
                maxLength={6000}
                value={design.message}
                onChange={(e) => updateDesign({ message: e.target.value })}
              />
            </label>
            <details className="rounded-xl border border-border p-4">
              <summary className="cursor-pointer font-medium">{t('signatureTitle')}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{t('signatureHint')}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <label
                    key={field}
                    className={`block text-sm ${field === 'address' || field === 'custom' ? 'sm:col-span-2' : ''}`}
                  >
                    {t(`signature_${field}`)}
                    {field === 'address' || field === 'custom' ? (
                      <textarea
                        aria-label={t(`signature_${field}`)}
                        className={inputClass}
                        rows={2}
                        maxLength={1000}
                        value={design[field]}
                        onChange={(e) => updateDesign({ [field]: e.target.value })}
                      />
                    ) : (
                      <input
                        className={inputClass}
                        maxLength={200}
                        value={design[field]}
                        onChange={(e) => updateDesign({ [field]: e.target.value })}
                      />
                    )}
                  </label>
                ))}
              </div>
            </details>
          </>
        ) : (
          <label className="block text-sm">
            {t('fullBody')}
            <textarea
              aria-label={t('fullBody')}
              className={inputClass}
              required
              rows={7}
              maxLength={20000}
              value={value.body}
              onChange={(e) => update({ body: e.target.value })}
            />
          </label>
        )}
        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer font-medium">{t('logoLayout')}</summary>
          <div className="mt-4 space-y-4">
            {canManage && (
              <label className="block text-sm">
                {t('logoUpload')}
                <input
                  className={inputClass}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    if (file.size > 512000) {
                      onError('emailLogoInvalid')
                      return
                    }
                    setPending(true)
                    onError('')
                    try {
                      const r = await fetch('/api/invoice-email/composer?action=logo', {
                        method: 'POST',
                        headers: { 'Content-Type': file.type },
                        body: file,
                      })
                      const result = await r.json()
                      if (!r.ok) throw new Error(result.error)
                      const next = { ...value, logoId: result.id }
                      onChange(
                        design
                          ? withVisualDesign(next, design)
                          : {
                              ...next,
                              html: value.html.includes('cid:company-logo')
                                ? value.html
                                : '<img src="cid:company-logo" alt="Logo" width="180" />' +
                                  value.html,
                            },
                      )
                      setSaved('')
                    } catch (error) {
                      onError(error instanceof Error ? error.message : 'genericError')
                    } finally {
                      setPending(false)
                    }
                  }}
                />
              </label>
            )}
            {value.logoId && (
              <button
                type="button"
                className="text-sm underline"
                onClick={() => {
                  const next = { ...value, logoId: null }
                  onChange(
                    design
                      ? withVisualDesign(next, design)
                      : { ...next, html: value.html.replace(/<img\b[^>]*>/gi, '') },
                  )
                  setSaved('')
                }}
              >
                {t('removeLogo')}
              </button>
            )}
            {design && (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={secondary}
                    onClick={() =>
                      updateDesign({ order: ['logo', ...design.order.filter((v) => v !== 'logo')] })
                    }
                  >
                    {t('logoTop')}
                  </button>
                  <button
                    type="button"
                    className={secondary}
                    onClick={() => {
                      const order: EmailBlock[] = design.order.filter((v) => v !== 'logo')
                      order.splice(order.indexOf('person') + 1, 0, 'logo')
                      updateDesign({ order })
                    }}
                  >
                    {t('logoBelow')}
                  </button>
                </div>
                <label className="block text-sm">
                  {t('logoSize')}
                  <select
                    className={inputClass}
                    value={design.logoWidth}
                    onChange={(e) =>
                      updateDesign({
                        logoWidth: Number(e.target.value) as VisualEmail['logoWidth'],
                      })
                    }
                  >
                    <option value={120}>{t('sizeSmall')}</option>
                    <option value={180}>{t('sizeMedium')}</option>
                    <option value={240}>{t('sizeLarge')}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={design.divider}
                    onChange={(e) => updateDesign({ divider: e.target.checked })}
                  />
                  {t('showDivider')}
                </label>
                <p className="text-sm text-muted-foreground">{t('orderHint')}</p>
                <ol className="space-y-2" aria-label={t('blockOrder')}>
                  {design.order.map((block, index) => (
                    <li
                      key={block}
                      className="flex items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2 text-sm"
                    >
                      <span>{t(`block_${block}`)}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg border border-border px-3 py-2 disabled:opacity-30"
                          aria-label={t('moveUp', { block: t(`block_${block}`) })}
                          disabled={index === 0}
                          onClick={() => move(block, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-border px-3 py-2 disabled:opacity-30"
                          aria-label={t('moveDown', { block: t(`block_${block}`) })}
                          disabled={index === design.order.length - 1}
                          onClick={() => move(block, 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </details>
        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm">{t('advancedTitle')}</summary>
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">{t.raw('templateHint')}</p>
            {design ? (
              <>
                <p className="text-sm text-muted-foreground">{t('advancedHint')}</p>
                <button
                  type="button"
                  className={secondary}
                  onClick={() => update({ design: null })}
                >
                  {t('useHtml')}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t('htmlHint')}</p>
                <label className="block text-sm">
                  {t('htmlCode')}
                  <textarea
                    aria-label={t('htmlCode')}
                    className={`${inputClass} font-mono`}
                    rows={8}
                    maxLength={60000}
                    value={value.html}
                    onChange={(e) => update({ html: e.target.value })}
                  />
                </label>
                <p className="text-sm text-muted-foreground">{t('rebuildHint')}</p>
                <button
                  type="button"
                  className={secondary}
                  disabled={value.body.length > 6000}
                  onClick={() =>
                    onChange(
                      withVisualDesign(value, {
                        ...visualDefaults(language),
                        message: value.body,
                        company: '',
                        divider: false,
                      }),
                    )
                  }
                >
                  {t('useVisual')}
                </button>
              </>
            )}
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                onChange(emailDefaults(language))
                setSaved('')
              }}
            >
              {t('resetTemplate')}
            </button>
          </div>
        </details>
        {canManage && (
          <div className="space-y-2">
            <button
              type="button"
              className={secondary}
              onClick={async () => {
                setPending(true)
                setSaved('')
                onError('')
                try {
                  const r = await fetch('/api/invoice-email/composer?action=template', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      organizationId,
                      locale: language,
                      revision: template?.revision || 0,
                      content: value,
                    }),
                  })
                  const result = await r.json()
                  if (!r.ok) throw new Error(result.error)
                  setTemplates((current) => [
                    ...current.filter((v) => v.locale !== language),
                    { ...result.content, locale: language, revision: result.revision },
                  ])
                  onChange(result.content)
                  setSaved(language)
                } catch (error) {
                  onError(error instanceof Error ? error.message : 'genericError')
                } finally {
                  setPending(false)
                }
              }}
            >
              {t('saveTemplate')}
            </button>
            <p className="text-xs text-muted-foreground">{t('saveTemplateHint')}</p>
          </div>
        )}
        {saved === language && (
          <p role="status" className="text-sm">
            {t('visualSaved')}
          </p>
        )}
      </fieldset>
      <div className="space-y-2 rounded-xl border border-border p-4">
        <h3 className="font-medium">{t('livePreview')}</h3>
        <p className="text-xs text-muted-foreground">{t('livePreviewHint')}</p>
        {live?.payload === previewPayload ? (
          <>
            <p className="text-sm break-words">{live.subject}</p>
            {live.html ? (
              <EmailHtmlPreview html={live.html} title={t('livePreview')} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {resolveEmailContent(value, number, company).body}
              </p>
            )}
          </>
        ) : (
          <p role="status" className="py-8 text-sm text-muted-foreground">
            {t(liveError === previewPayload ? 'previewIncomplete' : 'previewUpdating')}
          </p>
        )}
      </div>
    </div>
  )
}
