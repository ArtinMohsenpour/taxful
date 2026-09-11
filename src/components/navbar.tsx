import { getLocale, getTranslations } from 'next-intl/server'
import { connection } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { NavbarItems } from './navbar-items'
import { Link } from '@/i18n/navigation'
import { Preferences } from './preferences'
import Image from 'next/image'

export async function Navbar() {
  const t = await getTranslations('Navigation')
  const locale = await getLocale()
  // Read fresh public navigation per request, including immediately after a CMS save.
  await connection()
  const payload = await getPayload({ config })
  const navbar = await payload.findGlobal({
    slug: 'navbar',
    locale,
    fallbackLocale: 'de',
    overrideAccess: false,
    depth: 1,
    draft: false,
  })
  const logo = typeof navbar.logo === 'object' ? navbar.logo : null

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
        className="site-navbar flex flex-wrap items-center justify-between gap-x-4 gap-y-4 rounded-[1.75rem] border border-border/80 bg-surface/90 px-5 py-4 shadow-nav backdrop-blur-xl sm:px-7"
      >
        <Link href="/" aria-label={t('home')} className="group flex items-center gap-3 rounded-lg">
          {logo?.url && logo.mimeType?.startsWith('image/') ? (
            <Image
              src={logo.url}
              alt={logo.alt}
              width={logo.width || 180}
              height={logo.height || 48}
              unoptimized
              className="h-10 w-auto max-w-40 object-contain sm:h-12 sm:max-w-48"
            />
          ) : (
            <>
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-[0.9rem] bg-primary text-xl font-semibold text-primary-foreground"
              >
                t.
              </span>
              <span className="text-[1.65rem] font-semibold tracking-[-0.065em] text-foreground">
                taxful<span className="text-brand-ink">.</span>
              </span>
            </>
          )}
        </Link>
        <div className="order-3 w-full border-t border-border pt-3 lg:order-none lg:w-auto lg:flex-1 lg:border-0 lg:pt-0">
          <NavbarItems items={navbar.items} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Preferences />
          <button
            type="button"
            disabled
            title={t('loginSoon')}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed"
          >
            {t('login')}
          </button>
        </div>
      </nav>
    </header>
  )
}
