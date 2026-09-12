import { getLocale, getTranslations } from 'next-intl/server'
import { getCustomerWorkspace } from '@/lib/customer-auth/session'
import { Link } from '@/i18n/navigation'
import { WorkspaceForm } from '@/components/customer-auth/workspace-form'
import { Icon } from '@/components/customer-auth/icon'

export default async function PortalPage() {
  const t = await getTranslations('Auth')
  const { session, organization } = await getCustomerWorkspace(await getLocale())
  return (
    <div className="space-y-7">
      <header>
        <p className="mb-3 text-xs font-semibold tracking-widest text-brand-ink uppercase">
          {t('overview')}
        </p>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {t('dashboardTitle', { name: session.user.firstName || session.user.name })}
        </h1>
        <p className="mt-3 text-muted-foreground">{t('dashboardIntro')}</p>
      </header>
      <section className="rounded-3xl border border-primary/20 bg-primary/10 p-6 sm:p-8">
        <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-surface text-brand-ink">
          <Icon name="company" className="size-6" />
        </span>
        <h2 className="text-2xl font-medium">{organization?.name || t('workspace')}</h2>
        <p className="mt-3 mb-6 max-w-lg leading-relaxed text-muted-foreground">
          {organization ? t('workspaceReady') : t('workspaceIntro')}
        </p>
        {organization ? (
          <Link
            href="/portal/team"
            className="inline-flex items-center gap-3 text-sm font-semibold text-brand-ink"
          >
            {t('manageTeam')}
            <Icon name="arrow" />
          </Link>
        ) : (
          <WorkspaceForm />
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['converter', 'files'] as const).map((item) => (
          <Link
            key={item}
            href={`/portal/${item}`}
            className="group rounded-3xl border border-border bg-surface p-6 transition-colors hover:border-primary"
          >
            <div className="mb-6 flex items-center justify-between">
              <Icon name={item} className="size-7 text-brand-ink" />
              <Icon
                name="arrow"
                className="text-muted-foreground transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </div>
            <h2 className="text-lg font-semibold">{t(item)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(item === 'files' ? 'filesIntro' : 'converterIntro')}
            </p>
            <span className="mt-5 inline-block rounded-full bg-accent px-3 py-1 text-xs text-muted-foreground">
              {t('comingSoon')}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
