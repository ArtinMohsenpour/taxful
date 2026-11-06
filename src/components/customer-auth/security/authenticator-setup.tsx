import { useTranslations } from 'next-intl'
import type { FormEvent, ReactNode } from 'react'
import { buttonClass, inputClass } from '../auth-form'
import { RecoveryCodes, disclosureClass, secondaryButtonClass } from './method-card'
import type { AuthenticatorSetup as Setup } from './use-security-methods'

function SetupStep({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: ReactNode
}) {
  return (
    <li className={`min-w-0 ${number > 1 ? 'pt-6' : ''}`}>
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-brand-ink"
          aria-hidden="true"
        >
          {number}
        </span>
        <h4 className="font-semibold">{title}</h4>
      </div>
      {children}
    </li>
  )
}

export function AuthenticatorSetup({
  setup,
  codes,
  busy,
  onActivate,
  onCancel,
}: {
  setup: Setup
  codes: string[]
  busy: boolean
  onActivate: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onCancel: () => void
}) {
  const t = useTranslations('Security')
  return (
    <ol className="space-y-6 divide-y divide-border">
      <SetupStep number={1} title={t('scanTitle')}>
        <div className="grid items-start gap-5 sm:grid-cols-[auto_1fr]">
          <div className="w-fit max-w-full overflow-hidden rounded-2xl border border-border">
            {/* The enrollment secret is encoded locally, never sent to a QR service. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qr}
              width={200}
              height={200}
              alt={t('qr')}
              className="h-auto max-w-full"
            />
          </div>
          <div className="min-w-0 space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{t('scan')}</p>
            <details>
              <summary className={disclosureClass}>{t('key')}</summary>
              <code className="mt-3 block rounded-xl bg-background p-3 text-sm break-all select-all">
                {new URL(setup.uri).searchParams.get('secret')}
              </code>
            </details>
          </div>
        </div>
      </SetupStep>
      <SetupStep number={2} title={t('codes')}>
        <RecoveryCodes codes={codes} />
      </SetupStep>
      <SetupStep number={3} title={t('finishTitle')}>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{t('finishHint')}</p>
        <form method="post" className="space-y-4" onSubmit={(event) => void onActivate(event)}>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              required
              disabled={busy}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            {t('saved')}
          </label>
          <label className="block max-w-xs space-y-2 text-sm font-medium">
            <span>{t('code')}</span>
            <input
              name="code"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={busy}
              className={`${inputClass} font-mono tracking-widest`}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} className={`${buttonClass} text-sm`}>
              {t(busy ? 'working' : 'finish')}
            </button>
            <button
              type="button"
              disabled={busy}
              className={secondaryButtonClass}
              onClick={onCancel}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </SetupStep>
    </ol>
  )
}
