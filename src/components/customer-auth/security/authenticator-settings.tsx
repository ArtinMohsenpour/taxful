import { useTranslations } from 'next-intl'
import { Icon } from '../icon'
import { AuthenticatorSetup } from './authenticator-setup'
import { MethodCard, PasswordForm, disclosureClass, secondaryButtonClass } from './method-card'
import type { PasskeyMethod, SecurityMethodControls } from './use-security-methods'

export function AuthenticatorSettings({
  enabled,
  passkeys,
  methods,
}: {
  enabled: boolean
  passkeys: PasskeyMethod[]
  methods: SecurityMethodControls
}) {
  const t = useTranslations('Security')
  const { busy, setup, codes, confirmation } = methods
  return (
    <MethodCard
      title={t('authenticatorTitle')}
      description={t('authenticatorHint')}
      icon="security"
      badge={t(setup ? 'settingUp' : enabled ? 'active' : 'notSetUp')}
      active={enabled}
      className={setup ? 'xl:col-span-2' : ''}
    >
      {setup ? (
        <AuthenticatorSetup
          setup={setup}
          codes={codes}
          busy={busy}
          onActivate={methods.activate}
          onCancel={methods.cancelSetup}
        />
      ) : enabled ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-brand-ink">
            <Icon name="check" />
            {t('enabled')}
          </p>
          <details className="mt-5 border-t border-border pt-4">
            <summary className={disclosureClass}>{t('manageAuthenticator')}</summary>
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{t('disableWarning')}</p>
              {passkeys.length > 0 && (
                <p className="text-sm font-medium text-muted-foreground">{t('removeFirst')}</p>
              )}
              {confirmation === 'disable' ? (
                <div
                  role="group"
                  aria-label={t('disable')}
                  className="space-y-4 rounded-xl border border-error/25 p-4"
                >
                  <PasswordForm action="disable" busy={busy} onSubmit={methods.passwordAction} />
                  <button
                    type="button"
                    disabled={busy}
                    className={secondaryButtonClass}
                    onClick={() => methods.setConfirmation(null)}
                  >
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy || passkeys.length > 0}
                  onClick={() => methods.setConfirmation('disable')}
                  className={`${secondaryButtonClass} text-error`}
                >
                  {t('disable')}
                </button>
              )}
            </div>
          </details>
        </>
      ) : (
        <PasswordForm action="enable" busy={busy} onSubmit={methods.passwordAction} />
      )}
    </MethodCard>
  )
}
