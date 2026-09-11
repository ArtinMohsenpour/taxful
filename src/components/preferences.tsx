'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'

const subscribe = () => () => {}

export function Preferences() {
  const locale = useLocale()
  const t = useTranslations('Preferences')
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  // The server cannot know localStorage or the browser's color preference.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  return (
    <div className="flex flex-wrap gap-4">
      <label className="flex items-center gap-2 text-sm">
        {t('language')}
        <select
          className="rounded-lg border border-border bg-surface px-3 py-2"
          value={locale}
          onChange={(event) => {
            const nextLocale = event.target.value
            if (nextLocale !== 'de' && nextLocale !== 'en') return
            router.replace(`${pathname}${window.location.search}${window.location.hash}`, {
              locale: nextLocale,
              scroll: false,
            })
          }}
        >
          <option value="de" lang="de">
            Deutsch
          </option>
          <option value="en" lang="en">
            English
          </option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        {t('theme')}
        <select
          className="rounded-lg border border-border bg-surface px-3 py-2 disabled:opacity-60"
          disabled={!mounted}
          value={mounted ? theme : 'system'}
          onChange={(event) => setTheme(event.target.value)}
        >
          <option value="system">{t('system')}</option>
          <option value="light">{t('light')}</option>
          <option value="dark">{t('dark')}</option>
        </select>
      </label>
    </div>
  )
}
