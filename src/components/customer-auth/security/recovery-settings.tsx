import { useTranslations } from 'next-intl'
import {
  MethodCard,
  PasswordForm,
  RecoveryCodes,
  disclosureClass,
  secondaryButtonClass,
} from './method-card'
import type { SecurityMethodControls } from './use-security-methods'

export function RecoverySettings({
  enabled,
  methods,
}: {
  enabled: boolean
  methods: SecurityMethodControls
}) {
  const t = useTranslations('Security')
  const { busy, codes } = methods
  return (
    <MethodCard
      title={t('recoveryTitle')}
      description={t('recoveryIntro')}
      icon="recovery-codes"
      badge={t(enabled ? 'backup' : 'notSetUp')}
      className="xl:col-span-2"
    >
      {enabled ? (
        codes.length > 0 ? (
          <div className="max-w-xl space-y-4">
            <h4 className="font-semibold">{t('codes')}</h4>
            <RecoveryCodes codes={codes} />
            <button type="button" className={secondaryButtonClass} onClick={methods.hideCodes}>
              {t('hide')}
            </button>
          </div>
        ) : (
          <details>
            <summary className={disclosureClass}>{t('regenerate')}</summary>
            <div className="mt-4 max-w-xl space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{t('codesHint')}</p>
              <PasswordForm action="regenerate" busy={busy} onSubmit={methods.passwordAction} />
            </div>
          </details>
        )
      ) : (
        <p className="text-sm font-medium text-muted-foreground">{t('recoveryPrerequisite')}</p>
      )}
    </MethodCard>
  )
}
