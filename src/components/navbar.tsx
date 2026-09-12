import { getLocale, getTranslations } from 'next-intl/server'
import { connection } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { NavbarView } from './navbar-view'
import { NavbarPreview } from './navbar-preview'
import { requirePreviewUser } from '@/lib/preview-auth'

export async function Navbar({ preview = false }: { preview?: boolean }) {
  const t = await getTranslations('Navigation')
  const locale = await getLocale()
  // Read fresh public navigation per request, including immediately after a CMS save.
  await connection()
  const payload = await getPayload({ config })
  const user = preview ? await requirePreviewUser(payload) : undefined
  const navbar = await payload.findGlobal({
    slug: 'navbar',
    locale,
    fallbackLocale: 'de',
    overrideAccess: false,
    depth: 1,
    draft: preview,
    user,
  })
  const labels = {
    home: t('home'),
    menu: t('menu'),
    closeMenu: t('closeMenu'),
    skip: t('skip'),
    label: t('label'),
    login: t('login'),
    loginSoon: t('loginSoon'),
  }
  return preview ? (
    <NavbarPreview navbar={navbar} labels={labels} />
  ) : (
    <NavbarView navbar={navbar} labels={labels} />
  )
}
