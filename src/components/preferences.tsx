'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useState, useSyncExternalStore, useTransition } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'

const subscribe = () => () => {}

export function Preferences() {
  const locale = useLocale()
  const t = useTranslations('Preferences')
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [pending, startTransition] = useTransition()
  // Changing language replaces the navbar, so the thumb slides first and the
  // new-language page loads once the motion has mostly played.
  const [targetLocale, setTargetLocale] = useState<string | null>(null)
  const shownLocale = targetLocale ?? locale
  const switching = pending || (targetLocale !== null && targetLocale !== locale)
  // The server cannot know localStorage or the browser's color preference.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  const themes = ['light', 'dark'] as const
  const activeTheme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light'
  const themeIndex = themes.findIndex((value) => value === activeTheme)
  const nextTheme = themes[(themeIndex + 1) % themes.length]

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        role="switch"
        aria-label={t('english')}
        aria-checked={shownLocale === 'en'}
        aria-busy={switching}
        disabled={!mounted || switching}
        title={t('switchLanguage')}
        className="preference-toggle"
        onClick={() => {
          const next = locale === 'de' ? 'en' : 'de'
          const href = `${pathname}${window.location.search}${window.location.hash}`
          setTargetLocale(next)
          const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260
          window.setTimeout(
            () => startTransition(() => router.replace(href, { locale: next, scroll: false })),
            delay,
          )
        }}
      >
        <span
          className="toggle-thumb"
          style={{ transform: `translateX(${shownLocale === 'en' ? '100%' : '0'})` }}
        />
        <span className="toggle-option" data-active={shownLocale === 'de'} aria-hidden="true">
          DE
        </span>
        <span className="toggle-option" data-active={shownLocale === 'en'} aria-hidden="true">
          EN
        </span>
      </button>
      <button
        type="button"
        aria-label={t('themeAction', {
          current: t(activeTheme as (typeof themes)[number]),
          next: t(nextTheme),
        })}
        title={t('themeAction', {
          current: t(activeTheme as (typeof themes)[number]),
          next: t(nextTheme),
        })}
        disabled={!mounted}
        data-theme-choice={activeTheme}
        className="preference-toggle"
        onClick={() => setTheme(nextTheme)}
      >
        <span className="toggle-thumb" style={{ transform: `translateX(${themeIndex * 100}%)` }} />
        {themes.map((value) => (
          <span
            key={value}
            className="toggle-option"
            data-active={activeTheme === value}
            aria-hidden="true"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {value === 'light' ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                </>
              ) : (
                <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
              )}
            </svg>
          </span>
        ))}
      </button>
    </div>
  )
}
