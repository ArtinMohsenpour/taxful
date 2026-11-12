import 'server-only'
import { getLocale, getTranslations } from 'next-intl/server'
import { connection } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requirePreviewUser } from '@/lib/preview-auth'
import { readFooter } from '@/lib/footer/read'
import { FooterView, type FooterVariant } from './footer-view'
import { FooterPreview } from './footer-preview'

export async function Footer({
  preview = false,
  variant = 'full',
}: {
  preview?: boolean
  variant?: FooterVariant
}) {
  // Read the published footer per request, like the navbar, so publishing is immediate.
  await connection()
  const [locale, t, nav, payload] = await Promise.all([
    getLocale(),
    getTranslations('Footer'),
    getTranslations('Navigation'),
    getPayload({ config }),
  ])
  const user = preview ? await requirePreviewUser(payload) : undefined
  const { footer, fallbackLogo } = await readFooter(payload, {
    locale: locale === 'en' ? 'en' : 'de',
    draft: preview,
    user,
  })
  const labels = {
    home: nav('home'),
    navigation: t('navigation'),
    legal: t('legal'),
    social: t('social'),
    partners: t('partners'),
    contact: t('contact'),
    email: t('email'),
    phone: t('phone'),
    newTab: t('newTab'),
  }
  const year = Number(
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Berlin' }).format(
      new Date(),
    ),
  )
  return preview ? (
    <FooterPreview footer={footer} fallbackLogo={fallbackLogo} labels={labels} year={year} />
  ) : (
    <FooterView
      footer={footer}
      fallbackLogo={fallbackLogo}
      labels={labels}
      year={year}
      variant={variant}
    />
  )
}
