import { getLocale, getTranslations } from 'next-intl/server'
import { requireCustomer } from '@/lib/customer-auth/session'
import { Icon } from '@/components/customer-auth/icon'

export default async function Page() {
  await requireCustomer(await getLocale())
  const t = await getTranslations('Auth')
  return (
    <div>
      <h1 className="mb-3 text-3xl font-medium tracking-tight">{t('files')}</h1>
      <p className="mb-8 text-muted-foreground">{t('filesIntro')}</p>
      <section className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <span className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-brand-ink">
          <Icon name="files" className="size-9" />
        </span>
        <span className="mb-4 rounded-full bg-accent px-3 py-1 text-xs font-medium">
          {t('comingSoon')}
        </span>
        <h2 className="text-xl font-medium">{t('filesEmpty')}</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t('filesHint')}
        </p>
      </section>
    </div>
  )
}
