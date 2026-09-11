'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useSyncExternalStore, useTransition } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'

const subscribe = () => () => {}

export function Preferences() {
  const locale = useLocale()
  const t = useTranslations('Preferences')
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [pending, startTransition] = useTransition()
  // The server cannot know localStorage or the browser's color preference.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  const themes = ['light', 'dark', 'system'] as const
  const activeTheme =
    mounted && themes.includes(theme as (typeof themes)[number]) ? theme : 'system'
  const themeIndex = themes.findIndex((value) => value === activeTheme)
  const nextTheme = themes[(themeIndex + 1) % themes.length]

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        role="switch"
        aria-label={t('english')}
        aria-checked={locale === 'en'}
        aria-busy={pending}
        disabled={pending}
        title={t('switchLanguage')}
        className="preference-toggle w-[5.5rem] grid-cols-2"
        onClick={() =>
          startTransition(() =>
            router.replace(`${pathname}${window.location.search}${window.location.hash}`, {
              locale: locale === 'de' ? 'en' : 'de',
              scroll: false,
            }),
          )
        }
      >
        <span
          className="toggle-thumb w-[calc((100%-0.5rem)/2)]"
          style={{ transform: `translateX(${locale === 'en' ? '100%' : '0'})` }}
        />
        <span className="toggle-option" data-active={locale === 'de'} aria-hidden="true">
          DE
        </span>
        <span className="toggle-option" data-active={locale === 'en'} aria-hidden="true">
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
        className="preference-toggle w-[7.5rem] grid-cols-3"
        onClick={() => setTheme(nextTheme)}
      >
        <span
          className="toggle-thumb w-[calc((100%-0.5rem)/3)]"
          style={{ transform: `translateX(${themeIndex * 100}%)` }}
        />
        {themes.map((value) => (
          <span
            key={value}
            className="toggle-option"
            data-active={activeTheme === value}
            aria-hidden="true"
          >
            <svg
              width="17"
              height="17"
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
              ) : value === 'dark' ? (
                <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
              ) : (
                <>
                  <rect x="3" y="4" width="18" height="13" rx="2" />
                  <path d="M8 21h8m-4-4v4" />
                </>
              )}
            </svg>
          </span>
        ))}
      </button>
    </div>
  )
}
