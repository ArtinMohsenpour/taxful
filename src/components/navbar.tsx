import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Preferences } from './preferences'

export async function Navbar() {
  const t = await getTranslations('Navigation')

  return (
    <header className="sticky top-4 z-30 mx-auto w-full max-w-6xl px-3 sm:top-6 sm:px-6">
      <a
        href="#main"
        className="sr-only rounded-full bg-surface px-5 py-3 text-brand-ink focus:not-sr-only focus:absolute focus:top-full"
      >
        {t('skip')}
      </a>
      <nav
        aria-label={t('label')}
        className="site-navbar flex flex-wrap items-center justify-between gap-x-4 gap-y-4 rounded-[1.75rem] border border-border/80 bg-surface/90 px-5 py-4 shadow-nav backdrop-blur-xl sm:flex-nowrap sm:px-7"
      >
        <Link href="/" aria-label={t('home')} className="group flex items-center gap-3 rounded-lg">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-[0.9rem] bg-primary text-xl font-semibold text-primary-foreground"
          >
            t.
          </span>
          <span className="text-[1.65rem] font-semibold tracking-[-0.065em] text-foreground">
            taxful<span className="text-brand-ink">.</span>
          </span>
        </Link>
        <span className="hidden text-sm tracking-wide text-muted-foreground lg:block">
          {t('tagline')}
        </span>
        <div className="flex items-center gap-5 sm:gap-7">
          <Link
            href="/"
            className="hidden rounded-full bg-accent/60 px-4 py-2.5 text-sm font-medium text-brand-ink sm:block"
            aria-current="page"
          >
            {t('start')}
          </Link>
          <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
          <Preferences />
        </div>
      </nav>
    </header>
  )
}
