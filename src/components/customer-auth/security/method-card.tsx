import { useTranslations } from 'next-intl'
import type { FormEvent, ReactNode } from 'react'
import { Icon, type IconName } from '../icon'
import { buttonClass, inputClass } from '../auth-form'
import type { PasswordAction } from './use-security-methods'

export const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60'

export const disclosureClass =
  'cursor-pointer text-sm font-semibold text-brand-ink marker:text-muted-foreground'

export function MethodCard({
  title,
  description,
  icon,
  badge,
  active = false,
  children,
  className = '',
}: {
  title: string
  description: string
  icon: IconName
  badge: string
  active?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`min-w-0 rounded-2xl border border-border p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-brand-ink">
            <Icon name={icon} />
          </span>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${active ? 'bg-primary/15 text-brand-ink' : 'bg-background text-muted-foreground'}`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  )
}

export function PasswordForm({
  action,
  busy,
  onSubmit,
}: {
  action: PasswordAction
  busy: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>, action: PasswordAction) => Promise<void>
}) {
  const t = useTranslations('Security')
  return (
    <form method="post" onSubmit={(event) => void onSubmit(event, action)} className="space-y-3">
      <label className="block space-y-2 text-sm font-medium">
        <span>{t('password')}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          disabled={busy}
          className={inputClass}
        />
      </label>
      <button disabled={busy} className={`${buttonClass} w-full text-sm sm:w-auto`}>
        {t(busy ? 'working' : action)}
      </button>
    </form>
  )
}

export function RecoveryCodes({ codes }: { codes: string[] }) {
  const t = useTranslations('Security')
  return (
    <div>
      <p className="text-sm leading-relaxed text-muted-foreground">{t('codesHint')}</p>
      <ul className="mt-4 grid gap-2 font-mono text-sm sm:grid-cols-2">
        {codes.map((code) => (
          <li
            key={code}
            className="rounded-xl border border-border bg-background/60 px-3 py-2.5 text-center break-all select-all"
          >
            {code}
          </li>
        ))}
      </ul>
    </div>
  )
}
