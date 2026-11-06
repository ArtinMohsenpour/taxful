import { useTranslations } from 'next-intl'
import { buttonClass, inputClass } from '../auth-form'
import { MethodCard, secondaryButtonClass } from './method-card'
import type { PasskeyMethod, SecurityMethodControls } from './use-security-methods'

export function PasskeySettings({
  enabled,
  passkeys,
  methods,
}: {
  enabled: boolean
  passkeys: PasskeyMethod[]
  methods: SecurityMethodControls
}) {
  const t = useTranslations('Security')
  const { busy, confirmation, locale } = methods
  return (
    <MethodCard
      title={t('passkeyTitle')}
      description={t('passkeyHint')}
      icon="passkey"
      badge={t(enabled ? 'passkeyCount' : 'locked', { count: passkeys.length })}
      active={passkeys.length > 0}
    >
      {passkeys.length > 0 ? (
        <ul className="mb-5 space-y-2">
          {passkeys.map((key) => (
            <li key={key.id} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{key.name || t('passkeyTitle')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('addedOn', {
                      date: new Intl.DateTimeFormat(locale, {
                        dateStyle: 'medium',
                        timeZone: 'Europe/Berlin',
                      }).format(new Date(key.createdAt)),
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => methods.setConfirmation(key.id)}
                  className="min-h-11 shrink-0 px-2 text-sm font-medium text-brand-ink underline underline-offset-4"
                >
                  {t('remove')}
                </button>
              </div>
              {confirmation === key.id && (
                <div
                  role="group"
                  aria-label={t('remove')}
                  className="mt-3 space-y-3 border-t border-border pt-3"
                >
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t('removeWarning')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className={secondaryButtonClass}
                      onClick={() => void methods.removePasskey(key.id)}
                    >
                      {t('remove')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={secondaryButtonClass}
                      onClick={() => methods.setConfirmation(null)}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-5 rounded-xl bg-background/60 p-3 text-sm text-muted-foreground">
          {t('noKeys')}
        </p>
      )}
      {enabled ? (
        <form
          method="post"
          className="space-y-3"
          onSubmit={(event) => void methods.addPasskey(event)}
        >
          <label className="block space-y-2 text-sm font-medium">
            <span>{t('name')}</span>
            <input
              name="name"
              required
              maxLength={100}
              autoComplete="off"
              disabled={busy || passkeys.length >= 10}
              placeholder={t('nameExample')}
              className={inputClass}
            />
          </label>
          <button
            disabled={busy || passkeys.length >= 10}
            className={`${buttonClass} w-full text-sm sm:w-auto`}
          >
            {t(busy ? 'working' : 'add')}
          </button>
          {passkeys.length >= 10 && (
            <p className="text-sm text-muted-foreground">{t('passkeyLimit')}</p>
          )}
        </form>
      ) : (
        <p className="border-t border-border pt-4 text-sm font-medium text-muted-foreground">
          {t('passkeyPrerequisite')}
        </p>
      )}
    </MethodCard>
  )
}
